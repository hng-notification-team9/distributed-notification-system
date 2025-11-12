import { redis } from '../db/postgres';
import axios from 'axios';
export async function validateToken(userId:string, token:string){
  const cacheKey = `token:${token}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  const resp = await axios.get(`${process.env.USER_SERVICE_URL}/users/${userId}/device-token`);
  const isValid = resp.data?.token === token; // simplified
  await redis.set(cacheKey, JSON.stringify({ isValid }), 'EX', 60*60);
  return isValid;
}
