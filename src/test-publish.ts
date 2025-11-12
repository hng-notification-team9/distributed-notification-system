// src/test-publish.ts
import amqplib from 'amqplib';
import { publish } from './queue/rabbit';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const conn = await amqplib.connect(process.env.RABBIT_URL!);
  const ch = await conn.createChannel();

  const msg = {
    request_id: `test-${Date.now()}`,
    recipient_id: 'user-123',
    device_token: 'dummy',
    payload: { title: 'Test', body: 'Hello from exchange!' },
  };

  await publish(ch, process.env.PUSH_QUEUE!, msg);

  setTimeout(() => {
    ch.close();
    conn.close();
  }, 2000);
}

main().catch(console.error);