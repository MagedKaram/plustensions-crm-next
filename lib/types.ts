export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'manual_review' | string;

export type Invoice = {
  invoice_number: string;
  customer_name: string | null;
  customer_code: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total: string | number | null;
  currency: string | null;
  status: InvoiceStatus | null;
  invoice_date: string | null;
  due_date: string | null;
  mollie_checkout: string | null;
  drive_file_url: string | null;
  drive_file_id: string | null;
  customer_folder_id: string | null;
  payment_link_expires_at: string | null;
  sent_at: string | null;
  reminder_count: number | null;
  last_customer_reminder_at: string | null;
  next_admin_reminder_at: string | null;
};

export type Customer = {
  customer_code: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_folder_id: string | null;
  invoice_count: number;
  pending_count: number;
  paid_count: number;
  total_pending: string | number | null;
};
