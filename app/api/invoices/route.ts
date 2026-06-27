import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { invoiceDateExpression, invoiceOptionalColumns } from '@/lib/schema';
import type { Invoice } from '@/lib/types';

function optionalColumn(enabled: boolean, column: string, fallback: string, alias = column) {
  return enabled ? column : `${fallback} AS ${alias}`;
}

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get('status') || 'all';
    const search = request.nextUrl.searchParams.get('search')?.trim() || '';
    const columns = await invoiceOptionalColumns();
    const sortDate = invoiceDateExpression(columns);

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
        ${optionalColumn(columns.customerPhone, 'customer_phone', 'NULL::text')},
        total,
        currency,
        status,
        ${optionalColumn(columns.invoiceDate, 'invoice_date', 'NULL::date')},
        ${optionalColumn(columns.dueDate, 'due_date', 'NULL::date')},
        mollie_checkout,
        ${optionalColumn(columns.driveFileUrl, 'drive_file_url', 'NULL::text')},
        ${optionalColumn(columns.driveFileId, 'drive_file_id', 'NULL::text')},
        ${optionalColumn(columns.customerFolderId, 'customer_folder_id', 'NULL::text')},
        ${optionalColumn(columns.paymentLinkExpiresAt, 'payment_link_expires_at', 'NULL::timestamptz')},
        ${optionalColumn(columns.sentAt, 'sent_at', 'NULL::timestamptz')},
        reminder_count,
        ${optionalColumn(columns.lastCustomerReminderAt, 'last_customer_reminder_at', 'NULL::timestamptz')},
        ${optionalColumn(columns.nextAdminReminderAt, 'next_admin_reminder_at', 'NULL::timestamptz')}
      FROM invoices
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${sortDate} DESC NULLS LAST, invoice_number DESC
      LIMIT 200
      `,
      params,
    );

    return NextResponse.json({ invoices: rows });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
