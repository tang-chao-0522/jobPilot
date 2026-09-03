import { z } from 'zod';
import { config as loadEnvironment } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const workspaceEnvironment = resolve(process.cwd(), '../../.env');
loadEnvironment({
  path: existsSync(workspaceEnvironment) ? workspaceEnvironment : resolve(process.cwd(), '.env'),
});

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(24),
  DATABASE_URL: z.string().min(1),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().min(1).default('jobpilot'),
  MODEL_PROVIDER: z.enum(['openai-compatible']).default('openai-compatible'),
  MODEL_API_KEY: z.string().default(''),
  MODEL_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  MODEL_NAME: z.string().default('gpt-4o-mini'),
  AGENT_MAX_TURNS: z.coerce.number().int().min(1).max(20).default(8),
  AGENT_MAX_TOOL_CALLS: z.coerce.number().int().min(1).max(50).default(12),
});

export type Environment = z.infer<typeof environmentSchema>;
let cached: Environment | undefined;

export function getEnvironment(): Environment {
  cached ??= environmentSchema.parse(process.env);
  return cached;
}
