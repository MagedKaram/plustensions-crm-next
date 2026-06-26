import { NextRequest, NextResponse } from 'next/server';
import { isUnauthorized, requireCrmToken } from '@/lib/auth';
import { query } from '@/lib/db';
import type { Customer } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    requireCrmToken(request);

    const rows = await query<Customer>(`
      SELECT
        customer_code,
        MAX(customer_name) AS customer_name,
        MAX(customer_email) AS customer_email,
        MAX(customer_phone) AS customer_phone,
        MAX(customer_folder_id) AS customer_folder_id,
        COUNT(*)::int AS invoice_count,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
        COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'pending'), 0) AS total_pending
      FROM invoices
      GROUP BY customer_code
      ORDER BY MAX(customer_name) ASC NULLS LAST
      LIMIT 300
    `);

    return NextResponse.json({ customers: rows });
  } catch (error) {
    if (isUnauthorized(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
