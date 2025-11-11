// queue/failedPublisher.ts
import amqplib from "amqplib";
import { logger } from "../utils/logger";

let channel: amqplib.Channel;

const init = async () => {
  const conn = await amqplib.connect(process.env.RABBITMQ_URL!);
  channel = await conn.createChannel();
  await channel.assertQueue("failed.queue", { durable: true });
};
init().catch(err => logger.error("DLQ init failed", err));

export const publishToFailedQueue = async (payload: any) => {
  if (!channel) {
    logger.error("DLQ channel not ready", payload);
    return;
  }

  const requestId = payload.original_message?.request_id || "unknown";
  const success = channel.sendToQueue(
    "failed.queue",
    Buffer.from(JSON.stringify(payload)),
    { persistent: true }
  );

  if (success) {
    logger.warn({ request_id: requestId }, "Sent to DLQ: failed.queue");
  } else {
    logger.error({ request_id: requestId }, "Failed to send to DLQ");
  }
};