// src/services/fcm_sender.ts
import admin from 'firebase-admin';
import { logger } from '../logger';

// Required environment variables
const {
  FIREBASE_PROJECT_ID,
  FIREBASE_PRIVATE_KEY,
  FIREBASE_CLIENT_EMAIL,
} = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
  throw new Error('Firebase environment variables are missing');
}

// Convert escaped newlines to actual newlines
const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
  logger.info('Firebase Admin initialized');
}

export interface PushMessage {
  request_id: string;
  recipient_id: string;
  device_token: string;
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
  };
}

export async function sendPush(message: PushMessage) {
  const payload = {
    token: message.device_token,
    notification: {
      title: message.payload.title,
      body: message.payload.body,
    },
    data: message.payload.data
      ? Object.fromEntries(Object.entries(message.payload.data).map(([k, v]) => [k, String(v)]))
      : {},
  };

  try {
    const response = await admin.messaging().send(payload);
    logger.info({ request_id: message.request_id, fcm_message_id: response }, 'FCM push sent');
  } catch (error: any) {
    logger.error(
      { request_id: message.request_id, error: error.code, message: error.message },
      'FCM push failed'
    );
    throw error;
  }
}
