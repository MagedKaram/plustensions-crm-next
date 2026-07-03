import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { invoiceDateExpression, invoiceOptionalColumns } from '@/lib/schema';
import type { Customer } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    void request;
    const columns = await invoiceOptionalColumns();
    const phoneSelect = columns.customerPhone ? 'latest.customer_phone' : 'NULL::text';
    const folderSelect = columns.customerFolderId ? 'latest.customer_folder_id' : 'NULL::text';
    const sortDate = invoiceDateExpression(columns);

    const rows = await query<Customer>(`
      WITH normalized AS (
        SELECT
          COALESCE(NULLIF(customer_code, ''), NULLIF(customer_email, ''), NULLIF(customer_name, ''), invoice_number) AS customer_key,
          invoice_number,
          customer_code,
          customer_name,
          customer_email,
          ${columns.customerPhone ? 'customer_phone,' : 'NULL::text AS customer_phone,'}
          ${columns.customerFolderId ? 'customer_folder_id,' : 'NULL::text AS customer_folder_id,'}
          total,
          status,
          ${sortDate} AS sort_date
        FROM invoices
      ),
      summary AS (
        SELECT
          customer_key,
          COUNT(*)::int AS invoice_count,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
          COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
          COALESCE(SUM(total) FILTER (WHERE status = 'pending'), 0) AS total_pending
        FROM normalized
        GROUP BY customer_key
      ),
      latest AS (
        SELECT DISTINCT ON (customer_key)
          customer_key,
          customer_code,
          customer_name,
          customer_email,
          customer_phone,
          customer_folder_id
        FROM normalized
        ORDER BY customer_key, sort_date DESC NULLS LAST, invoice_number DESC
      )
      SELECT
        latest.customer_code,
        latest.customer_name,
        latest.customer_email,
        ${phoneSelect} AS customer_phone,
        ${folderSelect} AS customer_folder_id,
        summary.invoice_count,
        summary.pending_count,
        summary.paid_count,
        summary.total_pending
      FROM summary
      JOIN latest ON latest.customer_key = summary.customer_key
      ORDER BY latest.customer_name ASC NULLS LAST
      LIMIT 300
    `);

    return NextResponse.json({ customers: rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
