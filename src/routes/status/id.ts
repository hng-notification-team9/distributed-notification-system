// src/routes/status/id.ts
import { FastifyInstance } from 'fastify';
import { pg } from '../../db/postgres';

export default async function statusRoutes(fastify: FastifyInstance) {
  fastify.get('/status/:id', {
    schema: {
        tags: ['Status'],
      summary: 'Check notification status by request ID',
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const res = await pg.query(
        'SELECT request_id, status, sent_at, failed_at, retries FROM notifications WHERE request_id = $1',
        [id]
      );
      if (res.rows.length === 0) {
        return { success: false, error: 'Notification not found' };
      }
      return { success: true, data: res.rows[0] };
    } catch (err) {
      return { success: false, error: 'DB query failed' };
    }
  });
}
