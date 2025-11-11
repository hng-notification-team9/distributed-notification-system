// utils/cache.ts
import redis from "./redis"; // ← reuse

export const cacheUnsent = async (requestId: string, payload: any, ttl = 86400) => {
  await redis.set(`unsent:${requestId}`, JSON.stringify(payload), "EX", ttl);
};

export const getCachedUnsent = async (requestId: string) => {
  const data = await redis.get(`unsent:${requestId}`);
  return data ? JSON.parse(data) : null;
};

export const deleteCachedUnsent = async (requestId: string) => {
  await redis.del(`unsent:${requestId}`);
};

export { redis };