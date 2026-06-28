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

export type BankColumn = {
  column_name: string;
  data_type: string;
  ordinal_position: number;
};

export type BankRecord = QueryResultRow & Record<string, unknown>;

function q(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function num(column: string) {
  return `NULLIF(regexp_replace(${q(column)}::text, '[^0-9.-]', '', 'g'), '')::numeric`;
}

function pickColumn(columns: BankColumn[], names: string[]) {
  const available = new Set(columns.map((c) => c.column_name));
  return names.find((name) => available.has(name)) || null;
}

export function fmtDate(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function money(value: unknown) {
  if (value === null || value === undefined || value === '') return '€ 0.00';

  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  if (Number.isNaN(n)) return `€ ${String(value)}`;

  return `€ ${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function getBankColumns() {
  return bankQuery<BankColumn>(
    `
    SELECT column_name, data_type, ordinal_position
    FROM information_schema.columns
    WHERE table_name = $1
      AND table_schema = ANY (current_schemas(false))
    ORDER BY ordinal_position
    `,
    [BANK_TABLE],
  );
}

export async function getBankStats() {
  const columns = await getBankColumns();

  const amountColumn = pickColumn(columns, [
    'total_amount',
    'amount',
    'total',
    'invoice_total',
    'paid_amount',
    'gross_amount',
  ]);

  const vatColumn = pickColumn(columns, [
    'vat_amount',
    'tax_amount',
    'total_vat',
  ]);

  const dateColumn = pickColumn(columns, [
    'invoice_date',
    'date',
    'paid_at',
    'processed_at',
    'created_at',
  ]);

  const totalAmountExpr = amountColumn
    ? `COALESCE(SUM(${num(amountColumn)}), 0)`
    : `0`;

  const totalVatExpr = vatColumn
    ? `COALESCE(SUM(${num(vatColumn)}), 0)`
    : `0`;

  const thisMonthTotalExpr = dateColumn && amountColumn
    ? `COALESCE(SUM(${num(amountColumn)}) FILTER (WHERE ${q(dateColumn)}::date >= date_trunc('month', CURRENT_DATE)), 0)`
    : `0`;

  const thisMonthCountExpr = dateColumn
    ? `COUNT(*) FILTER (WHERE ${q(dateColumn)}::date >= date_trunc('month', CURRENT_DATE))`
    : `0`;

  const rows = await bankQuery<{
    total_records: string;
    total_amount: string;
    total_vat: string;
    this_month_total: string;
    this_month_count: string;
  }>(`
    SELECT
      COUNT(*) AS total_records,
      ${totalAmountExpr} AS total_amount,
      ${totalVatExpr} AS total_vat,
      ${thisMonthTotalExpr} AS this_month_total,
      ${thisMonthCountExpr} AS this_month_count
    FROM ${BANK_TABLE}
  `);

  return rows[0] || {
    total_records: '0',
    total_amount: '0',
    total_vat: '0',
    this_month_total: '0',
    this_month_count: '0',
  };
}

export async function getBankStatuses() {
  const columns = await getBankColumns();
  const statusColumn = pickColumn(columns, ['status', 'payment_status', 'state']);

  if (!statusColumn) return [];

  return bankQuery<{ status: string; count: string }>(`
    SELECT COALESCE(${q(statusColumn)}::text, 'unknown') AS status, COUNT(*) AS count
    FROM ${BANK_TABLE}
    GROUP BY COALESCE(${q(statusColumn)}::text, 'unknown')
    ORDER BY count DESC
  `);
}

export async function getBankMonths() {
  const columns = await getBankColumns();

  const amountColumn = pickColumn(columns, [
    'total_amount',
    'amount',
    'total',
    'invoice_total',
    'paid_amount',
    'gross_amount',
  ]);

  const dateColumn = pickColumn(columns, [
    'invoice_date',
    'date',
    'paid_at',
    'processed_at',
    'created_at',
  ]);

  if (!amountColumn || !dateColumn) return [];

  return bankQuery<{ month: string; total: string }>(`
    SELECT
      to_char(date_trunc('month', ${q(dateColumn)}::date), 'YYYY-MM') AS month,
      COALESCE(SUM(${num(amountColumn)}), 0) AS total
    FROM ${BANK_TABLE}
    WHERE ${q(dateColumn)} IS NOT NULL
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 6
  `);
}

export async function getBankRecords(filters: {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const columns = await getBankColumns();

  if (!columns.length) return [];

  const statusColumn = pickColumn(columns, ['status', 'payment_status', 'state']);
  const dateColumn = pickColumn(columns, [
    'invoice_date',
    'date',
    'paid_at',
    'processed_at',
    'created_at',
  ]);
  const createdColumn = pickColumn(columns, ['created_at', 'processed_at']);

  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.q) {
    params.push(`%${filters.q}%`);
    const index = `$${params.length}`;
    const searchable = columns
      .slice(0, 25)
      .map((col) => `${q(col.column_name)}::text ILIKE ${index}`)
      .join(' OR ');

    where.push(`(${searchable})`);
  }

  if (filters.status && statusColumn) {
    params.push(filters.status);
    where.push(`${q(statusColumn)}::text = $${params.length}`);
  }

  if (filters.from && dateColumn) {
    params.push(filters.from);
    where.push(`${q(dateColumn)}::date >= $${params.length}`);
  }

  if (filters.to && dateColumn) {
    params.push(filters.to);
    where.push(`${q(dateColumn)}::date <= $${params.length}`);
  }

  const selectedColumns = columns.map((col) => q(col.column_name)).join(', ');

  const orderBy = dateColumn
    ? `${q(dateColumn)} DESC NULLS LAST`
    : createdColumn
      ? `${q(createdColumn)} DESC NULLS LAST`
      : '1 DESC';

  return bankQuery<BankRecord>(
    `
    SELECT ${selectedColumns}
    FROM ${BANK_TABLE}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${orderBy}
    LIMIT 500
    `,
    params,
  );
}
