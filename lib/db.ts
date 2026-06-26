import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __crmPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

export const pool =
  global.__crmPool ||
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__crmPool = pool;
}

export async function query<T>(text: string, params: unknown[] = []) {
  const result = await pool.query<T>(text, params);
  return result.rows;
}
