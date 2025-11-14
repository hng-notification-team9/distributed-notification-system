// src/queues/consumer.ts
import { pg, redis } from '../db/postgres';
import { logger } from '../logger';
import { publish } from './rabbit';
import { sendPush } from '../services/fcm_sender';
import { backoffMs } from '../utils/backoff';
import type { Channel } from 'amqplib';
import { statusState } from '../routes/status'; 

export interface PushMessage {
  request_id: string;
  recipient_id: string;
  device_token: string;
  payload: {
    title: string;
    body: string;
    data?: any;
  };
}

export async function startConsumer(ch: Channel) {
  const queue = process.env.PUSH_QUEUE!;
  const failedQueue = process.env.FAILED_QUEUE!;
  const exchange = process.env.RABBIT_EXCHANGE!;
  const maxRetries = Number(process.env.MAX_RETRIES || 5);
  const idempotencyTTL = Number(process.env.IDEMPOTENCY_TTL || 86400);

  try {
    await ch.assertExchange(exchange, 'direct', { durable: true });

    // === push.queue: WITH DLX ===
    try {
      await ch.assertQueue(queue, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': exchange,
          'x-dead-letter-routing-key': failedQueue,
        },
      });
    } catch (err: any) {
      if (err.message.includes('PRECONDITION_FAILED')) {
        logger.warn(`Using existing ${queue}`);
        await ch.checkQueue(queue);
      } else throw err;
    }

    // === failed.queue: NO DLX — NEVER ADD IT ===
    try {
      await ch.assertQueue(failedQueue, { durable: true }); // NO ARGUMENTS
    } catch (err: any) {
      if (err.message.includes('PRECONDITION_FAILED')) {
        logger.warn(`Using existing ${failedQueue} (no DLX)`);
        await ch.checkQueue(failedQueue);
      } else throw err;
    }

    await ch.bindQueue(queue, exchange, queue);
    await ch.bindQueue(failedQueue, exchange, failedQueue);

    ch.prefetch(1);
    logger.info(`[Consumer] Listening on queue "${queue}"`);

    await ch.consume(queue, async (msg) => {
      if (!msg) return;

      let body: PushMessage;
      try { body = JSON.parse(msg.content.toString()); }
      catch (e) { logger.error({ e }, 'Invalid JSON'); ch.ack(msg); return; }

      if (!body.request_id || !body.recipient_id || !body.device_token || !body.payload?.title) {
        logger.error({ body }, 'Invalid message');
        ch.ack(msg);
        return;
      }

      const request_id = body.request_id;
      const attempts = (msg.properties.headers?.attempts as number ?? 0) + 1;

      logger.info({ request_id, attempts }, 'Message received');

      try {
        const redisKey = `push:dedup:${request_id}`;
        if (await redis.get(redisKey) === 'sent') {
          logger.info({ request_id }, 'Skipped: already sent');
          ch.ack(msg);
          return;
        }

        const { rows } = await pg.query('SELECT status FROM notifications WHERE request_id = $1', [request_id]);
        if (rows.length && rows[0].status === 'sent') {
          await redis.set(redisKey, 'sent', 'EX', idempotencyTTL);
          ch.ack(msg);
          return;
        }

        await pg.query(
          `INSERT INTO notifications
             (id, request_id, recipient_id, device_token, channel, payload, status, attempts)
           VALUES
             (gen_random_uuid(), $1, $2, $3, $4, $5, 'processing', $6)
           ON CONFLICT (request_id) DO UPDATE SET
             status = 'processing',
             attempts = notifications.attempts + 1,
             updated_at = now()`,
          [request_id, body.recipient_id, body.device_token, 'push', JSON.stringify(body.payload), attempts]
        );

        await sendPush(body);

        await pg.query(
          `UPDATE notifications SET status='sent', updated_at=now(), attempts=$1 WHERE request_id=$2`,
          [attempts, request_id]
        );
        await redis.set(redisKey, 'sent', 'EX', idempotencyTTL);

        logger.info({ request_id }, 'Push delivered');
        statusState.consumerActive = true;
        statusState.lastProcessedId = request_id;
        statusState.lastProcessedAt = new Date().toISOString();
        ch.ack(msg);
      } catch (err: any) {
        logger.error({ err, request_id, attempts }, 'Push failed');

        if (attempts >= maxRetries) {
          // === FINAL FAILURE (stop retries completely) ===
          try {
            await pg.query(
              `UPDATE notifications 
               SET status='failed', last_error=$1, attempts=$2, updated_at=now()
               WHERE request_id=$3`,
              [err.message, attempts, request_id]
            );
          } catch (dbErr) {
            logger.error({ dbErr }, 'DB update failed on final failure');
          }

          try {
            await publish(ch, failedQueue, {
              ...body,
              last_error: err.message,
              failed_at: new Date().toISOString(),
            });
            logger.info({ request_id }, 'Moved to failed.queue after max retries');
          } catch (pubErr) {
            logger.error({ pubErr, request_id }, 'Failed to publish to failed.queue');
          }

          ch.ack(msg);
          return;
        }

        // === Retry with backoff if still below max ===
        const delay = backoffMs(attempts);
        setTimeout(() => {
          try {
            publish(ch, queue, body, { headers: { attempts: attempts + 1 } });
            logger.info({ request_id, next_attempt: attempts + 1 }, `Retry scheduled after ${delay}ms`);
          } catch (e) {
            logger.error({ e }, 'Retry publish failed');
          }
        }, delay);

        ch.ack(msg);
      }
    }, { noAck: false });

  } catch (err: any) {
    logger.error({ err }, 'Consumer setup failed');
    throw err;
  }
}
