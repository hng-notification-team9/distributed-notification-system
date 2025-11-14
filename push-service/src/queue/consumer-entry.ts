// src/queues/consumer-entry.ts
import amqplib from 'amqplib';
import { startConsumer } from './consumer';
import { logger } from '../logger';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const conn = await amqplib.connect(process.env.RABBIT_URL!);
  const ch = await conn.createChannel();

  process.on('SIGINT', () => {
    logger.info('Shutting down...');
    ch.close();
    conn.close();
    process.exit(0);
  });

  await startConsumer(ch);
  logger.info('Push consumer started');
}

main().catch((err) => {
  logger.error({ err }, 'Consumer crashed');
  process.exit(1);
});