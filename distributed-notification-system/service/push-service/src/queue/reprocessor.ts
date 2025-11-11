// queue/reprocessor.ts
import { redis, getCachedUnsent, deleteCachedUnsent } from "../utils/cache";
import { sendPushNotification } from "../services/fcm";
import { circuitBreaker } from "../utils/circuitBreaker";
import { logger } from "../utils/logger";
import { publishToFailedQueue } from "./failedPublisher";

const REPROCESS_INTERVAL_MS = parseInt(process.env.REPROCESS_INTERVAL_MS || "60000");
const MAX_REPROCESS_ATTEMPTS = 3;

export const reprocessCached = () => {
  setInterval(async () => {
    let keys: string[] = [];
    try {
      keys = await redis.keys("unsent:*");
      if (keys.length === 0) return;
    } catch (err) {
      logger.error(`Redis unreachable during reprocessing: ${err}`);
      return;
    }

    logger.info(`Reprocessing ${keys.length} cached unsent messages`);

    for (const key of keys) {
      const requestId = key.split(":").pop()!;
      let data: any;
      let attempt = 0;

      try {
        data = await getCachedUnsent(requestId);
        if (!data) continue;

        // Respect stored attempt count
        attempt = (data._attempt || 0) + 1;
        if (attempt > MAX_REPROCESS_ATTEMPTS) {
          logger.warn({ request_id: requestId }, "Max reprocess attempts exceeded");
          await publishToFailedQueue({
            original_message: data,
            error: "Max reprocess attempts exceeded",
            attempts: attempt,
            last_failed_at: new Date().toISOString(),
          });
          await deleteCachedUnsent(requestId);
          continue;
        }

        // Update attempt count in cache
        await redis.set(`unsent:${requestId}`, JSON.stringify({ ...data, _attempt: attempt }), "EX", 86400);

        await circuitBreaker.exec(async () => {
          await sendPushNotification(data);
        });

        await deleteCachedUnsent(requestId);
        logger.info({ request_id: requestId, attempt }, "Reprocessed successfully");

      } catch (err: any) {
        const errorMsg = err.message || String(err);
        logger.error(
          { request_id: requestId, attempt, error: errorMsg },
          "Reprocess failed"
        );

        // On final failure → DLQ
        if (attempt >= MAX_REPROCESS_ATTEMPTS) {
          await publishToFailedQueue({
            original_message: data,
            error: errorMsg,
            attempts: attempt,
            last_failed_at: new Date().toISOString(),
          });
          await deleteCachedUnsent(requestId);
        }
        // Else: leave in cache for next round
      }
    }
  }, REPROCESS_INTERVAL_MS);

  logger.info(`Reprocessor started (interval: ${REPROCESS_INTERVAL_MS}ms)`);
};