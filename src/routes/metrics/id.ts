// src/routes/metrics/id.ts
import { FastifyInstance } from 'fastify';
import { redis } from '../../db/postgres';
//import { sentCount, failedCount, retryCount } from '../../queue/consumer';


let sentCount = 0;
let failedCount = 0;
let retryCount = 0;

export default async function metricsIdRoutes(fastify: FastifyInstance) {
  fastify.get('/metrics/:id', {
    schema: {
      summary: 'Get push metrics for a specific request ID',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            sent: { type: 'integer' },
            failed: { type: 'integer' },
            retried: { type: 'integer' },
            cached_unsent: { type: 'integer' }
          }
        }
      }
    }
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const cached = await redis.keys(`unsent:${id}:*`);
    return {
      id,
      sent: sentCount,
      failed: failedCount,
      retried: retryCount,
      cached_unsent: cached.length,
    };
  });
}
