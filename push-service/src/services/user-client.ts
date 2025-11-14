import axios from 'axios';
import { logger } from '../logger';

const BASE_URL = process.env.USER_SERVICE_URL!;

export interface User {
  id: string;
  name?: string;
  device_token: string;
}

export async function getUserById(recipientId: string): Promise<User | null> {
  try {
    const response = await axios.get(`${BASE_URL}/users/${recipientId}`, { timeout: 5000 });
    logger.info({ recipientId }, 'Fetched user from service');
    return response.data;
  } catch (err: any) {
    logger.error({ err: err.message, recipientId }, 'User service failed');
    return null;  // Fallback to dummy
  }
}