import { redis } from "../utils/cache";

export const getDeliveryStatus = async (requestId: string) => {
  const key = `processed:${requestId}`;
  const exists = await redis.exists(key);
  if (exists) return { status: "delivered" };

  const cached = await redis.get(`unsent:${requestId}`);
  if (cached) return { status: "pending_retry" };

  return { status: "not_found" };
};
