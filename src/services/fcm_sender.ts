//import admin from 'firebase-admin';
//import { logger } from '../logger';
//if (!admin.apps.length) {
  //admin.initializeApp({
    //credential: admin.credential.cert(require(process.env.FCM_SERVICE_ACCOUNT_PATH))
//  });
//s}

// src/services/fcm_sender.ts

export async function sendPush(msg: any) {
  console.log('[MOCK] Sending push:', msg);
  return true; // simulate success
}


{/*export async function sendPush({ device_token, payload }) {
  if (!device_token) throw new Error('no device token');
  const message: admin.messaging.Message = {
    token: device_token,
    notification: {
      title: payload.title,
      body: payload.body
    },
    webpush: payload.webpush, // optional: image, click_action
    android: payload.android
  };
  const res = await admin.messaging().send(message);
  logger.info({ res }, 'fcm send result');
  return res;
}
*/}