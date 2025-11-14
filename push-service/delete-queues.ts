// delete-queues.ts
import  amqplib  from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

async function deleteQueues() {
  const conn = await amqplib.connect(process.env.RABBIT_URL!);
  const ch = await conn.createChannel();

  const queues = ['push.queue', 'failed.queue'];

  for (const queue of queues) {
    try {
      await ch.deleteQueue(queue);
      console.log(`✅ Deleted queue: ${queue}`);
    } catch (err: any) {
      console.log(`⚠️  Queue ${queue} not found or error: ${err.message}`);
    }
  }

  await ch.close();
  await conn.close();
  console.log('🧹 Cleanup complete! Restart your server now.');
}

deleteQueues().catch(console.error);