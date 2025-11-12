// src/routes/metrics.ts
import { FastifyInstance } from 'fastify';
import { redis } from '../db/postgres';

let sentCount = 0;
let failedCount = 0;
let retryCount = 0;

export default async function (fastify: FastifyInstance) {
  fastify.get('/metrics', {
    schema: {
      summary: 'Get push service metrics',
      response: {
        200: {
          type: 'object',
          properties: {
            sent: { type: 'integer' },
            failed: { type: 'integer' },
            retried: { type: 'integer' },
            cached_unsent: { type: 'integer' },
          },
        },
      },
    },
  }, async () => {
    const cached = await redis.keys('unsent:*');

    return {
      sent: sentCount,
      failed: failedCount,
      retried: retryCount,
      cached_unsent: cached.length,
    };
  });
}
