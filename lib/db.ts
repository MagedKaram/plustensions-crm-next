import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __crmPool: Pool | undefined;
}

function getPool() {
  if (global.__crmPool) {
    return global.__crmPool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
  });

  if (process.env.NODE_ENV !== 'production') {
    global.__crmPool = pool;
  }

  return pool;
}

export async function query<T>(text: string, params: unknown[] = []) {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}
