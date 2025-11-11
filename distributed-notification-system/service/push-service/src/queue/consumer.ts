// queue/consumer.ts
import amqplib from "amqplib";
import { sendPushNotification } from "../services/fcm";
import { checkProcessed, markProcessed } from "../utils/redis";
import { getUserPreference } from "../services/user";
import { getTemplate, mergeTemplate } from "../services/template";
import { cacheUnsent, deleteCachedUnsent } from "../utils/cache";
import { circuitBreaker } from "../utils/circuitBreaker";
import { logger } from "../utils/logger";
import { publishToFailedQueue } from "./failedPublisher";
import pool from "../db/postgres"; 

export let sentCount = 0;
export let failedCount = 0;
export let retryCount = 0;

const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || "5");
const INITIAL_BACKOFF_MS = parseInt(process.env.INITIAL_BACKOFF_MS || "1000");

// Insert notification record at start
const insertNotification = async (requestId: string) => {
  try {
    await pool.query(
      `INSERT INTO notifications (request_id, status) VALUES ($1, $2)
       ON CONFLICT (request_id) DO NOTHING`,
      [requestId, "pending"]
    );
  } catch (err) {
    logger.warn({ request_id: requestId }, "Failed to insert DB record");
  }
};

// Update status on success
const updateSuccess = async (requestId: string) => {
  await pool.query(
    `UPDATE notifications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE request_id = $2`,
    ["sent", requestId]
  );
};

// Update status on final failure
const updateFailure = async (requestId: string, attempts: number, error: string) => {
  await pool.query(
    `UPDATE notifications SET status = $1, attempts = $2, error = $3, updated_at = CURRENT_TIMESTAMP WHERE request_id = $4`,
    ["failed", attempts, error, requestId]
  );
};

const sendWithRetry = async (data: any, channel: amqplib.Channel, msg: amqplib.ConsumeMessage) => {
  const requestId = data.request_id;
  let attempt = 0;
  let backoff = INITIAL_BACKOFF_MS;

  // Start DB tracking
  await insertNotification(requestId);

  while (attempt < MAX_RETRIES) {
    attempt++;
    const log = (level: "info" | "error", message: string) =>
      logger[level]({ request_id: requestId, attempt }, message);

    try {
      await circuitBreaker.exec(() => sendPushNotification(data));
      sentCount++;
      await deleteCachedUnsent(requestId);
      await markProcessed(requestId);
      await updateSuccess(requestId);
      log("info", "Push sent successfully");
      channel.ack(msg);
      return;
    } catch (err: any) {
      retryCount++;
      log("error", `Push failed: ${err.message}`);

      await cacheUnsent(requestId, { ...data, _attempt: attempt, _error: err.message });

      if (attempt === MAX_RETRIES) break;

      await new Promise(res => setTimeout(res, backoff));
      backoff *= 2;
    }
  }

  // Final failure
  failedCount++;
  logger.error({ request_id: requestId, attempts: MAX_RETRIES }, "Push permanently failed");
  await updateFailure(requestId, MAX_RETRIES, "Max retries exceeded");

  await publishToFailedQueue({
    original_message: data,
    error: "Max retries exceeded",
    attempts: MAX_RETRIES,
    last_failed_at: new Date().toISOString(),
  });

  channel.nack(msg, false, false); // → DLQ
};

export const consumeQueue = async () => {
  const conn = await amqplib.connect(process.env.RABBITMQ_URL!);
  const channel = await conn.createChannel();
  const queue = process.env.QUEUE_NAME!;
  await channel.assertQueue(queue, { durable: true });

  channel.prefetch(10);
  logger.info(`Push Service consuming from: ${queue}`);

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    let data: any;
    try {
      data = JSON.parse(msg.content.toString());
    } catch (err) {
      logger.error(`Invalid JSON in message: ${err}`);
      channel.nack(msg, false, false);
      return;
    }

    const requestId = data.request_id;
    if (!requestId) {
      logger.error("Missing request_id", data);
      channel.nack(msg, false, false);
      return;
    }

    // Idempotency
    if (await checkProcessed(requestId)) {
      logger.info({ request_id: requestId }, "Duplicate, skipping");
      channel.ack(msg);
      return;
    }

    // User opt-out
    try {
      const pref = await getUserPreference(data.user_id);
      if (!pref?.allow_push) {
        logger.info({ request_id: requestId, user_id: data.user_id }, "User opted out");
        await markProcessed(requestId);
        await updateSuccess(requestId); // Mark as "sent" (opt-out = handled)
        channel.ack(msg);
        return;
      }
    } catch (err) {
      logger.warn({ request_id: requestId }, "User service unreachable, allowing push");
    }

    // Template merge
    try {
      const templateResponse = await getTemplate(data.template_id);
      const template = templateResponse?.data?.template || "";
      if (!template) throw new Error("Empty template");

      data.body = mergeTemplate(template, data.variables || {});
      logger.info({ request_id: requestId, body: data.body }, "Template merged");
    } catch (err: any) {
      logger.error({ request_id: requestId, error: err.message }, "Template fetch/merge failed");
      channel.nack(msg, false, false);
      return;
    }

    // Send with retry
    await sendWithRetry(data, channel, msg);
  });
};