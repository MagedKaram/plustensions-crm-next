import { Pool } from 'pg';
import type { QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __crmBankPool: Pool | undefined;
}

function getBankPool() {
  if (global.__crmBankPool) return global.__crmBankPool;

  const connectionString =
    process.env.BANK_DATABASE_URL ||
    process.env.TAX_DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('BANK_DATABASE_URL, TAX_DATABASE_URL, or DATABASE_URL is required');
  }

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
  });

  if (process.env.NODE_ENV !== 'production') {
    global.__crmBankPool = pool;
  }

  return pool;
}

export async function bankQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  const result = await getBankPool().query(text, params);
  return result.rows as T[];
}

const rawTable = process.env.BANK_INVOICE_TABLE || 'bank_invoice_records';

export const BANK_TABLE = /^[A-Za-z_][A-Za-z0-9_]*$/.test(rawTable)
  ? rawTable
  : 'bank_invoice_records';

export const CURRENCY = process.env.CURRENCY_SYMBOL || '€';

export type BankInvoice = QueryResultRow & Record<string, unknown>;

export function fmtDate(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function money(value: unknown) {
  if (value === null || value === undefined || value === '') return `${CURRENCY} 0.00`;

  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(n)) return `${CURRENCY} ${String(value)}`;

  return `${CURRENCY} ${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function getBankStatuses() {
  return bankQuery<{ status: string; count: string }>(`
    SELECT COALESCE(status, 'unknown') AS status, COUNT(*) AS count
    FROM ${BANK_TABLE}
    GROUP BY COALESCE(status, 'unknown')
    ORDER BY count DESC
  `);
}

export async function getBankInvoices(filters: {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.q) {
    params.push(`%${filters.q}%`);
    const i = `$${params.length}`;

    where.push(`
      (
        company_name ILIKE ${i}
        OR invoice_number ILIKE ${i}
        OR vat_number ILIKE ${i}
        OR processed_file_name ILIKE ${i}
        OR source_file_name ILIKE ${i}
      )
    `);
  }

  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }

  if (filters.from) {
    params.push(filters.from);
    where.push(`invoice_date >= $${params.length}`);
  }

  if (filters.to) {
    params.push(filters.to);
    where.push(`invoice_date <= $${params.length}`);
  }

  return bankQuery<BankInvoice>(
    `
    SELECT
      id,
      invoice_date,
      company_name,
      invoice_number,
      vat_number,
      currency,
      subtotal_excl_vat,
      vat_amount,
      total_amount,
      status,
      is_duplicate,
      google_drive_url
    FROM ${BANK_TABLE}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY invoice_date DESC NULLS LAST, created_at DESC NULLS LAST
    LIMIT 1000
    `,
    params,
  );
}

export async function getBankInvoice(id: number) {
  const rows = await bankQuery<BankInvoice>(
    `SELECT * FROM ${BANK_TABLE} WHERE id = $1`,
    [id],
  );

  return rows[0] || null;
}
