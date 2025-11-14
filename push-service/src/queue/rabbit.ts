// src/queues/rabbit.ts
import type { Channel } from 'amqplib';

export async function publish(
  ch: Channel,
  queue: string,
  message: any,
  options?: any
) {
  const exchange = process.env.RABBIT_EXCHANGE!; // notifications.direct
  const routingKey = queue; // push.queue → use queue name as routing key

  // Ensure exchange exists
  await ch.assertExchange(exchange, 'direct', { durable: true });

  // Ensure queue exists with correct args
  await ch.assertQueue(queue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': exchange,
      'x-dead-letter-routing-key': process.env.FAILED_QUEUE!,
    },
  });

  // Bind queue to exchange with routing key
  await ch.bindQueue(queue, exchange, routingKey);

  // Publish via exchange
  const success = ch.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(message)),
    {
      persistent: true,
      headers: options?.headers || {},
      ...options,
    }
  );

  if (!success) {
    throw new Error('Message not accepted by RabbitMQ');
  }

  console.log(`Published to exchange=${exchange}, routingKey=${routingKey}`);
}