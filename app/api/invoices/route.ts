import { NextRequest, NextResponse } from 'next/server';
import { isUnauthorized, requireCrmToken } from '@/lib/auth';
import { query } from '@/lib/db';
import type { Invoice } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    requireCrmToken(request);

    const status = request.nextUrl.searchParams.get('status') || 'all';
    const search = request.nextUrl.searchParams.get('search')?.trim() || '';

    const where: string[] = [];
    const params: unknown[] = [];

    if (status !== 'all') {
      params.push(status);
      where.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      where.push(`(
        invoice_number ILIKE $${params.length}
        OR customer_name ILIKE $${params.length}
        OR customer_code ILIKE $${params.length}
        OR customer_email ILIKE $${params.length}
      )`);
    }

    const rows = await query<Invoice>(
      `
      SELECT
        invoice_number,
        customer_name,
        customer_code,
        customer_email,
        customer_phone,
        total,
        currency,
        status,
        invoice_date,
        due_date,
        mollie_checkout,
        drive_file_url,
        drive_file_id,
        customer_folder_id,
        payment_link_expires_at,
        sent_at,
        reminder_count,
        last_customer_reminder_at,
        next_admin_reminder_at
      FROM invoices
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY COALESCE(sent_at, invoice_date::timestamptz, created_at) DESC NULLS LAST
      LIMIT 200
      `,
      params,
    );

    return NextResponse.json({ invoices: rows });
  } catch (error) {
    if (isUnauthorized(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
