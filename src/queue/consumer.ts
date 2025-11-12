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
  device_token: string;
  payload: any;
}

export async function startConsumer(ch: Channel) {
  const queue = process.env.PUSH_QUEUE!; // "push.queue"
  const failedQueue = process.env.FAILED_QUEUE!; // "failed.queue"
  const maxRetries = Number(process.env.MAX_RETRIES || 5);
  const idempotencyTTL = Number(process.env.IDEMPOTENCY_TTL || 86400);
await ch.assertQueue(queue, {
    
  durable: true,
  arguments: {
    'x-dead-letter-exchange': process.env.RABBIT_EXCHANGE!,     // notifications.direct
    'x-dead-letter-routing-key': process.env.FAILED_QUEUE!,     // failed.queue
  },
});

await ch.assertQueue(failedQueue, { durable: true }); // failed.queue usually doesn't need DLX

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

      const { request_id } = body;
      const headers = msg.properties.headers ?? {};
      const attempts = (headers.attempts as number) ?? 0 + 1;

      logger.info({ request_id, attempts, queue }, 'Message received');

      try {
        // === 1. Fast Redis Dedup ===
        const redisKey = `push:dedup:${request_id}`;
        const cached = await redis.get(redisKey);
        if (cached === 'sent') {
          logger.info({ request_id }, 'Skipped: already sent (Redis)');
          ch.ack(msg);
          return;
        }

        // === 2. DB Idempotency ===
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

        // === 3. Insert / Update Notification ===
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

        // === 4. Send Push ===
        logger.info({ request_id }, 'Sending push to FCM');
        await sendPush(body);

        // === 5. Mark as Sent ===
        await pg.query(
          `UPDATE notifications SET status = 'sent', updated_at = now() WHERE request_id = $1`,
          [request_id]
        );
        await redis.set(redisKey, 'sent', 'EX', idempotencyTTL);

        logger.info({ request_id }, 'Push delivered and recorded');
        ch.ack(msg);
      } catch (err: any) {
        logger.error(
          { err, request_id, attempts, stack: err.stack },
          'Push delivery failed'
        );

        // === 6. Retry or Fail ===
        if (attempts < maxRetries) {
          const delay = backoffMs(attempts);
          logger.warn(
            { request_id, attempts, delay },
            'Retrying with backoff'
          );

          setTimeout(() => {
            publish(ch, queue, body, { headers: { attempts } });
          }, delay);

          ch.ack(msg);
          return;
        }

        // === 7. Final Failure ===
        logger.error({ request_id, attempts }, 'Max retries exceeded');
        await pg.query(
          `UPDATE notifications
           SET status = 'failed', last_error = $1, updated_at = now()
           WHERE request_id = $2`,
          [err?.message || String(err), request_id]
        );

        publish(ch, failedQueue, {
          ...body,
          last_error: err?.message || String(err),
          failed_at: new Date().toISOString(),
        });

        ch.ack(msg);
      }
    },
    { noAck: false }
  );
}