// utils/redis.ts
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

export const checkProcessed = async (request_id: string) => {
  const exists = await redis.get(`processed:${request_id}`);
  return Boolean(exists);
};

export const markProcessed = async (request_id: string, ttl = 86400) => {
  await redis.set(`processed:${request_id}`, "1", "EX", ttl);
};

export default redis;