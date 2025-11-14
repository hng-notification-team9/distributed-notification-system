// delete-queues.ts
import  amqplib  from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

async function deleteQueues() {
  const conn = await amqplib.connect(process.env.RABBIT_URL || 'amqp://FwNsqaqF4BhGkO4L:tdUY5zWflmJ_j1p~KgIPBu0lRlrpf~eS@shinkansen.proxy.rlwy.net:58179');
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