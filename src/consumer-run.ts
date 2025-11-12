// src/consumer-runner.ts
import amqplib from 'amqplib';
import { startConsumer } from './queue/consumer';
import { logger } from './logger';

export async function runConsumer() {
  const conn = await amqplib.connect(process.env.RABBIT_URL!);
  const ch = await conn.createChannel();

  process.on('SIGINT', async () => {
    logger.info('Shutting down consumer...');
    await ch.close();
    await conn.close();
    process.exit(0);
  });

  await startConsumer(ch);
  logger.info('Push consumer started');
}
