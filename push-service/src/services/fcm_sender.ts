// src/services/fcm_sender.ts
import admin from 'firebase-admin';
import { logger } from '../logger';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultPath = resolve(__dirname, '../../secrets/serviceAccountKey.json');
const serviceAccountPath = process.env.FCM_SERVICE_ACCOUNT_PATH || defaultPath;

let serviceAccount: any;

try {
  // THIS IS THE FIX — pathToFileURL works on Windows + Linux + Railway
  const fileUrl = pathToFileURL(serviceAccountPath).href;

  const module = await import(fileUrl, { assert: { type: 'json' } });
  serviceAccount = module.default;

  logger.info('FCM service account loaded successfully');
} catch (err: any) {
  logger.error(
    { err: err.message, path: serviceAccountPath },
    'Failed to load FCM service account'
  );
  throw new Error(
    `FCM service account not found!\n` +
    `Expected at: ${serviceAccountPath}\n` +
    `Make sure the file exists and path is correct.`
  );
}

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
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