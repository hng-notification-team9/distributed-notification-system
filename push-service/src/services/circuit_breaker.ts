import { redis } from '../db/postgres';
const KEY = 'circuit:fcm';
const THRESHOLD = 5;
const WINDOW = 60; // seconds
export async function allowRequest(){
  const count = Number(await redis.get(KEY) || 0);
  return count < THRESHOLD;
}
export async function recordFailure(){
  const tx = redis.multi();
  tx.incr(KEY);
  tx.expire(KEY, WINDOW);
  await tx.exec();
}
export async function reset(){
  await redis.del(KEY);
}
