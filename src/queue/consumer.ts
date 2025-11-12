// src/queues/consumer.ts
import { pg, redis } from '../db/postgres';
import { logger } from '../logger';
import { publish } from './rabbit';
import { sendPush } from '../services/fcm_sender';
import { backoffMs } from '../utils/backoff';
import type { Channel } from 'amqplib';

export interface PushMessage {
  request_id: string;
  recipient_id: string;
  device_token: string;  // REQUIRED
  payload: {
    title: string;
    body: string;
    data?: any;
  };
}

export async function startConsumer(ch: Channel) {
  const queue = process.env.PUSH_QUEUE!;
  const failedQueue = process.env.FAILED_QUEUE!;
  const maxRetries = Number(process.env.MAX_RETRIES || 5);
  const idempotencyTTL = Number(process.env.IDEMPOTENCY_TTL || 86400);

  await ch.assertQueue(queue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': process.env.RABBIT_EXCHANGE!,
      'x-dead-letter-routing-key': failedQueue,
    },
  });

  await ch.assertQueue(failedQueue, { durable: true });

  ch.prefetch(1);
  logger.info(`[Consumer] Listening on queue "${queue}"`);

  await ch.consume(
    queue,
    async (msg) => {
      if (!msg) return;

      let body: PushMessage;
      try {
        body = JSON.parse(msg.content.toString());
      } catch (e) {
        logger.error({ err: e, raw: msg.content.toString() }, 'Invalid JSON');
        ch.ack(msg);
        return;
      }

      // === VALIDATE REQUIRED FIELDS ===
      if (!body.request_id || !body.recipient_id || !body.device_token || !body.payload?.title) {
        logger.error({ body }, 'Invalid push message – missing required fields');
        ch.ack(msg);
        return;
      }

      const { request_id } = body;
      const headers = msg.properties.headers ?? {};
      const attempts = (headers.attempts as number) ?? 0 + 1;

      logger.info({ request_id, attempts, queue }, 'Message received');

      try {
        // === IDEMPOTENCY ===
        const redisKey = `push:dedup:${request_id}`;
        const cached = await redis.get(redisKey);
        if (cached === 'sent') {
          logger.info({ request_id }, 'Skipped: already sent (Redis)');
          ch.ack(msg);
          return;
        }

        const { rows } = await pg.query(
          'SELECT status FROM notifications WHERE request_id = $1',
          [request_id]
        );

        if (rows.length && rows[0].status === 'sent') {
          await redis.set(redisKey, 'sent', 'EX', idempotencyTTL);
          logger.info({ request_id }, 'Skipped: already sent (DB)');
          ch.ack(msg);
          return;
        }

        // === INSERT NOTIFICATION ===
        await pg.query(
          `INSERT INTO notifications
             (id, request_id, recipient_id, device_token, channel, payload, status, attempts)
           VALUES
             (gen_random_uuid(), $1, $2, $3, $4, $5, 'processing', $6)
           ON CONFLICT (request_id) DO UPDATE SET
             status = 'processing',
             attempts = notifications.attempts + 1,
             updated_at = now()`,
          [
            request_id,
            body.recipient_id,
            body.device_token,
            'push',
            JSON.stringify(body.payload),
            attempts,
          ]
        );

        // === SEND TO FCM ===
        logger.info({ request_id }, 'Sending push to FCM');
        await sendPush(body);

        // === MARK AS SENT ===
        await pg.query(
          `UPDATE notifications SET status='sent', updated_at=now(), attempts=$1 WHERE request_id=$2`,
          [attempts, request_id]
        );
        await redis.set(redisKey, 'sent', 'EX', idempotencyTTL);

        logger.info({ request_id }, 'Push delivered and recorded');
        ch.ack(msg);
      } catch (err: any) {
        logger.error({ err, request_id, attempts }, 'Push delivery failed');

        if (attempts < maxRetries) {
          const delay = backoffMs(attempts);
          logger.warn({ request_id, attempts, delay }, 'Retrying...');

          await pg.query(
            `UPDATE notifications SET attempts=$1, updated_at=now() WHERE request_id=$2`,
            [attempts, request_id]
          );

          setTimeout(() => {
            publish(ch, queue, body, { headers: { attempts: attempts + 1 } });
          }, delay);

          ch.ack(msg);
          return;
        }

        // === FINAL FAILURE ===
        await pg.query(
          `UPDATE notifications SET status='failed', last_error=$1, attempts=$2 WHERE request_id=$3`,
          [err.message, attempts, request_id]
        );

        publish(ch, failedQueue, {
          ...body,
          last_error: err.message,
          failed_at: new Date().toISOString(),
        });

        ch.ack(msg);
      }
    },
    { noAck: false }
  );
}