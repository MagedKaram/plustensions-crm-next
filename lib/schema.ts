import { query } from './db';

type InvoiceColumnName =
  | 'customer_phone'
  | 'customer_folder_id'
  | 'drive_file_url'
  | 'drive_file_id'
  | 'payment_link_expires_at'
  | 'next_admin_reminder_at'
  | 'last_customer_reminder_at'
  | 'due_date'
  | 'sent_at'
  | 'invoice_date'
  | 'created_at';

type ColumnNameRow = {
  column_name: InvoiceColumnName;
};

export async function invoiceOptionalColumns() {
  const names: InvoiceColumnName[] = [
    'customer_phone',
    'customer_folder_id',
    'drive_file_url',
    'drive_file_id',
    'payment_link_expires_at',
    'next_admin_reminder_at',
    'last_customer_reminder_at',
    'due_date',
    'sent_at',
    'invoice_date',
    'created_at',
  ];

  const rows = await query<ColumnNameRow>(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = ANY($1::text[])
    `,
    [names],
  );

  const found = new Set(rows.map((row) => row.column_name));

  return {
    customerPhone: found.has('customer_phone'),
    customerFolderId: found.has('customer_folder_id'),
    driveFileUrl: found.has('drive_file_url'),
    driveFileId: found.has('drive_file_id'),
    paymentLinkExpiresAt: found.has('payment_link_expires_at'),
    nextAdminReminderAt: found.has('next_admin_reminder_at'),
    lastCustomerReminderAt: found.has('last_customer_reminder_at'),
    dueDate: found.has('due_date'),
    sentAt: found.has('sent_at'),
    invoiceDate: found.has('invoice_date'),
    createdAt: found.has('created_at'),
  };
}

export type InvoiceOptionalColumns = Awaited<ReturnType<typeof invoiceOptionalColumns>>;

export function invoiceDateExpression(columns: InvoiceOptionalColumns) {
  const parts: string[] = [];

  if (columns.sentAt) parts.push('sent_at');
  if (columns.invoiceDate) parts.push('invoice_date::timestamptz');
  if (columns.createdAt) parts.push('created_at');

  return parts.length ? `COALESCE(${parts.join(', ')})` : 'NULL::timestamptz';
}
