import axios from 'axios';
import { logger } from '../logger';

const BASE_URL = process.env.TEMPLATE_SERVICE_URL!;

export async function renderTemplate(templateId: string, vars: any): Promise<{ title: string; body: string }> {
  try {
    const response = await axios.post(`${BASE_URL}/templates/${templateId}/render`, { vars }, { timeout: 3000 });
    logger.info({ templateId }, 'Rendered template');
    return response.data;
  } catch (err: any) {
    logger.error({ err: err.message, templateId }, 'Template service failed');
    return { title: 'Default Title', body: 'Default body – template failed' };  // Fallback
  }
}