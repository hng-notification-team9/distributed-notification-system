// src/routes/metrics.ts
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.get('/metrics', async () => {
    return { uptime: process.uptime(), memory: process.memoryUsage() };
  });
}
