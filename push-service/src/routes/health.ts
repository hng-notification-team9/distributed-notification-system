import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import amqplib from 'amqplib';
import { allowRequest, recordFailure, reset } from '../services/circuit_breaker';
import { redis } from '../db/postgres';

const rabbitUrl = process.env.RABBIT_URL || 'amqp://localhost';
const queue = process.env.PUSH_QUEUE || 'push_queue';

async function health(fastify: FastifyInstance) {
  fastify.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Check service health',
      description: 'Returns the health status of the push service and RabbitMQ queue.',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            service: { type: 'string' },
            queue: { type: 'string' },
            queue_length: { type: 'integer' },
            circuit_breaker: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    let queueStatus = 'unknown';
    let queueLength = 0;
    let circuitBreakerState = 'closed';

    try {
      const allowed = await allowRequest();
      if (!allowed) circuitBreakerState = 'open';

      const conn = await amqplib.connect(rabbitUrl);
      const channel = await conn.createChannel();
      const q = await channel.checkQueue(queue);
      queueStatus = 'healthy';
      queueLength = q.messageCount;
      await channel.close();
      await conn.close();

      await reset();

      return {
        status: 'ok',
        service: 'push-service',
        queue: queueStatus,
        queue_length: queueLength,
        circuit_breaker: circuitBreakerState,
      };
    } catch (err) {
      await recordFailure();
      queueStatus = 'disconnected';
      circuitBreakerState = 'open';
      return {
        status: 'error',
        service: 'push-service',
        queue: queueStatus,
        queue_length: queueLength,
        circuit_breaker: circuitBreakerState,
      };
    }
  });
}

export default fp(health);
