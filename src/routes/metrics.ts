// src/routes/metrics.ts
import { FastifyInstance } from 'fastify';
import { pg, redis } from '../db/postgres';

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
    // Fetch counts inside handler
    const sentRes = await pg.query(`SELECT COUNT(*) FROM notifications WHERE status='sent'`);
    const failedRes = await pg.query(`SELECT COUNT(*) FROM notifications WHERE status='failed'`);
    const retriedRes = await pg.query(`SELECT SUM(attempts) FROM notifications`);
    const cachedKeys = await redis.keys('unsent:*');

    return {
      sent: Number(sentRes.rows[0].count),
      failed: Number(failedRes.rows[0].count),
      retried: Number(retriedRes.rows[0].sum) || 0,
      cached_unsent: cachedKeys.length,
    };
  });
}
