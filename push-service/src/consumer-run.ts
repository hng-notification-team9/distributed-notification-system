// src/consumer-run.ts
import amqplib from 'amqplib';
import { startConsumer } from './queue/consumer';
import { logger } from './logger';

let channel: any;

export async function runConsumer() {
  const conn = await amqplib.connect(process.env.RABBIT_URL!);
  channel = await conn.createChannel();

  channel.on('error', (err) => logger.error({ err }, 'Channel error'));
  channel.on('close', () => {
    logger.warn('Channel closed — reconnecting...');
    setTimeout(runConsumer, 5000);
  });

  conn.on('error', () => logger.error('Connection error'));
  conn.on('close', () => setTimeout(runConsumer, 5000));

  try {
    await startConsumer(channel);
    logger.info('Consumer started');
  } catch (err) {
    logger.error({ err }, 'Consumer failed — retrying...');
    setTimeout(runConsumer, 5000);
  }

  return channel;
}