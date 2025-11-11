import axios from "axios";
import { logger } from "../utils/logger";

export interface PushData {
  request_id: string;
  user_id: string;
  title: string;
  body: string;
  token: string; // device/user ID for OneSignal
  template_id?: string | null;
  variables?: Record<string, any>;
}

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID!;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY!;

export async function sendPushNotification(data: PushData) {
  const message = {
    app_id: ONESIGNAL_APP_ID,
    include_player_ids: [data.token],
    headings: { en: data.title },
    contents: { en: data.body },
    data: {
      request_id: data.request_id,
      user_id: data.user_id,
      template_id: data.template_id || "",
      ...(data.variables || {}),
    },
  };

  try {
    const response = await axios.post("https://onesignal.com/api/v1/notifications", message, {
      headers: {
        "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
    logger.info(`OneSignal push sent: ${response.data.id} for request_id ${data.request_id}`);
    return response.data;
  } catch (err) {
    logger.error(`OneSignal send failed for request_id ${data.request_id}: ${String(err)}`);
    throw err;
  }
}
