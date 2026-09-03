import { getEnvironment } from './environment';

export function getDatabaseConfig() {
  const env = getEnvironment();
  return {
    url: env.DATABASE_URL,
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  } as const;
}
