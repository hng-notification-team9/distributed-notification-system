import { Pool } from 'pg';
import IORedis, { Redis } from 'ioredis';
import 'dotenv/config'; // this loads .env

export const redis = new Redis(process.env.REDIS_URL || '');

export const pg = new Pool({
  connectionString: process.env.DATABASE_URL,
});
