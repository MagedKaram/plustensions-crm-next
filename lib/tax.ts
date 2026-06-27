import { Pool } from 'pg';
import type { QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __crmTaxPool: Pool | undefined;
}

/**
 * The tax / supplier invoices may live in a different Postgres than the customer
 * invoices. Use TAX_DATABASE_URL if provided, otherwise fall back to DATABASE_URL.
 */
function getTaxPool() {
  if (global.__crmTaxPool) return global.__crmTaxPool;

  const connectionString = process.env.TAX_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error('TAX_DATABASE_URL or DATABASE_URL is required');

  const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30000 });
  if (process.env.NODE_ENV !== 'production') global.__crmTaxPool = pool;
  return pool;
}

export async function taxQuery<T>(text: string, params: unknown[] = []) {
  const result = await getTaxPool().query(text, params);
  return result.rows as T[];
}

const rawTable = process.env.TAX_INVOICE_TABLE || 'invoice_records';
export const TAX_TABLE = /^[A-Za-z_][A-Za-z0-9_]*$/.test(rawTable) ? rawTable : 'invoice_records';

export const CURRENCY = process.env.CURRENCY_SYMBOL || '€';

export function fmtDate(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function money(value: unknown) {
  if (value === null || value === undefined || value === '') return `${CURRENCY} 0.00`;
  const n = Number(value);
  if (Number.isNaN(n)) return `${CURRENCY} ${value}`;
  return `${CURRENCY} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type TaxInvoice = QueryResultRow & Record<string, unknown>;

export type LineItem = {
  item_order: number | string;
  description: string;
  quantity: string;
  unit_price: string;
  vat_rate: string;
  net_amount: string;
  vat_amount: string;
  gross_amount: string;
};

export function parseLineItems(value: unknown): LineItem[] {
  if (value == null) return [];
  let data: unknown = value;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return [{ item_order: 1, description: String(value), quantity: '', unit_price: '', vat_rate: '', net_amount: '', vat_amount: '', gross_amount: '' }];
    }
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    data = (obj.items as unknown) || (obj.line_items as unknown) || [obj];
  }
  if (!Array.isArray(data)) return [];

  return data.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      return { item_order: idx + 1, description: String(item), quantity: '', unit_price: '', vat_rate: '', net_amount: '', vat_amount: '', gross_amount: '' };
    }
    const it = item as Record<string, unknown>;
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = it[k];
        if (v !== undefined && v !== null && v !== '') return String(v);
      }
      return '';
    };
    return {
      item_order: (it.item_order as number) || (it.order as number) || idx + 1,
      description: pick('item_description', 'description', 'name'),
      quantity: pick('quantity', 'qty'),
      unit_price: pick('unit_price', 'price'),
      vat_rate: pick('line_vat_rate', 'vat_rate'),
      net_amount: pick('line_subtotal_excl_vat', 'net_amount', 'subtotal_excl_vat'),
      vat_amount: pick('line_vat_amount', 'vat_amount'),
      gross_amount: pick('line_total', 'gross_amount', 'total'),
    };
  });
}

export type TaxStats = {
  total_invoices: string;
  total_amount: string;
  total_vat: string;
  manual_review: string;
  duplicates: string;
  this_month_total: string;
  this_month_count: string;
  average_invoice: string;
};

export async function getTaxStats() {
  const rows = await taxQuery<TaxStats>(`
    SELECT COUNT(*) AS total_invoices,
      COALESCE(SUM(total_amount), 0) AS total_amount,
      COALESCE(SUM(vat_amount), 0) AS total_vat,
      COUNT(*) FILTER (WHERE status = 'manual_review') AS manual_review,
      COUNT(*) FILTER (WHERE is_duplicate = true OR status = 'duplicate') AS duplicates,
      COALESCE(SUM(total_amount) FILTER (WHERE invoice_date >= date_trunc('month', CURRENT_DATE)), 0) AS this_month_total,
      COUNT(*) FILTER (WHERE invoice_date >= date_trunc('month', CURRENT_DATE)) AS this_month_count,
      COALESCE(AVG(total_amount), 0) AS average_invoice
    FROM ${TAX_TABLE}
  `);
  return rows[0];
}

export async function getTaxSuppliers() {
  return taxQuery<{ company_name: string; invoices: string; total: string }>(`
    SELECT company_name, COUNT(*) AS invoices, COALESCE(SUM(total_amount), 0) AS total
    FROM ${TAX_TABLE} GROUP BY company_name ORDER BY total DESC LIMIT 8
  `);
}

export async function getTaxMonths() {
  return taxQuery<{ month: string; total: string; vat: string }>(`
    SELECT to_char(date_trunc('month', invoice_date), 'YYYY-MM') AS month,
      COALESCE(SUM(total_amount), 0) AS total, COALESCE(SUM(vat_amount), 0) AS vat
    FROM ${TAX_TABLE} WHERE invoice_date IS NOT NULL
    GROUP BY 1 ORDER BY 1 DESC LIMIT 6
  `);
}

export async function getTaxStatuses() {
  return taxQuery<{ status: string; count: string }>(`
    SELECT COALESCE(status, 'unknown') AS status, COUNT(*) AS count
    FROM ${TAX_TABLE} GROUP BY COALESCE(status, 'unknown') ORDER BY count DESC
  `);
}

export async function getTaxInvoices(filters: { q?: string; status?: string; from?: string; to?: string }) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.q) {
    params.push(`%${filters.q}%`);
    const i = `$${params.length}`;
    where.push(`(company_name ILIKE ${i} OR invoice_number ILIKE ${i} OR vat_number ILIKE ${i} OR processed_file_name ILIKE ${i} OR source_file_name ILIKE ${i})`);
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

  return taxQuery<TaxInvoice>(
    `
    SELECT id, invoice_date, company_name, invoice_number, vat_number, currency,
      subtotal_excl_vat, vat_amount, total_amount, status, is_duplicate, google_drive_url
    FROM ${TAX_TABLE}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY invoice_date DESC NULLS LAST, created_at DESC LIMIT 1000
    `,
    params,
  );
}

export async function getTaxInvoice(id: number) {
  const rows = await taxQuery<TaxInvoice>(`SELECT * FROM ${TAX_TABLE} WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function updateTaxInvoice(id: number, status: string, notes: string, reviewReason: string) {
  await taxQuery(
    `UPDATE ${TAX_TABLE} SET status = $1, notes = $2, review_reason = $3, updated_at = now() WHERE id = $4`,
    [status, notes, reviewReason, id],
  );
}

export const EXPORT_COLUMNS = [
  'processed_at', 'company_name', 'invoice_number', 'invoice_date', 'vat_number', 'currency',
  'subtotal_excl_vat', 'shipping_amount', 'discount_amount', 'vat_rate', 'vat_amount', 'total_amount',
  'payment_method', 'iban', 'payment_reference', 'google_drive_url', 'processed_file_name',
  'source_file_name', 'status', 'notes',
];

export async function getTaxExportRows() {
  return taxQuery<TaxInvoice>(`
    SELECT ${EXPORT_COLUMNS.join(', ')} FROM ${TAX_TABLE}
    ORDER BY invoice_date DESC NULLS LAST, created_at DESC
  `);
}
