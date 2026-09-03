import type { OpenAIModelConfig } from '@jobpilot/agent-runtime';
import { getEnvironment } from './environment';

export function getModelConfig(): OpenAIModelConfig {
  const env = getEnvironment();
  return { apiKey: env.MODEL_API_KEY, baseUrl: env.MODEL_BASE_URL, model: env.MODEL_NAME };
}
