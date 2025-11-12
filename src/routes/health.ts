import 'dotenv/config'; // Must be first
import { FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import Redis from 'ioredis';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

export default async function (fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    const dbOk = await pg.query('SELECT 1');
    const redisOk = await redis.ping();
    return { status: 'ok', db: !!dbOk, redis: redisOk === 'PONG' };
  });
}
