// src/services/fcm.ts (Mock Version)
import { logger } from "../utils/logger";

interface PushPayload {
  title: string;
  body: string;
  token: string | string[];
  request_id: string;
  image?: string;
  data?: Record<string, string>;
}

export const sendPushNotification = async (payload: PushPayload) => {
  const { title, body, token, request_id, image, data = {} } = payload;

  // Simulate success (no real FCM)
  const isMulticast = Array.isArray(token);
  const successCount = isMulticast ? token.length : 1;
  const messageId = `mock-message-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  logger.info({ 
    request_id, 
    messageId, 
    successCount, 
    total: successCount,
    title, 
    body 
  }, `Mock FCM push sent ${isMulticast ? '(multicast)' : '(single)'}`);

  // Return success format (matches real)
  return { 
    success: true, 
    messageId,
    ...(isMulticast && { response: { successCount, failureCount: 0 } })
  };
};