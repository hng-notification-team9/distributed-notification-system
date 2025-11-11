// src/services/template.ts
import axios from "axios";
import { logger } from "../utils/logger";

// Mock template service (replace with real service later)
export const getTemplate = async (templateId: string) => {
  console.log(`[MOCK] Template: ${templateId}`);
  // Mock response matching expected structure
  return {
    success: true,
    data: {
      template: "Welcome, {{name}}! Thanks for joining {{app_name}}.",
      language: "en",
      version: "1.0"
    },
    message: "Template retrieved successfully"
  };
};

// Template variable substitution
export const mergeTemplate = (template: string, variables: Record<string, any> = {}) => {
  let merged = template;
  
  // Replace all {{variable}} patterns
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{${key}}}`, 'g');
    merged = merged.replace(pattern, String(value || ''));
  }
  
  return merged;
};