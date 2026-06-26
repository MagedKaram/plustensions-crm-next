import Link from 'next/link';
import { InvoiceActions } from './actions';
import { query } from '@/lib/db';
import type { Invoice } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  status?: string;
  search?: string;
}>;

function money(value: string | number | null, currency = 'EUR') {
  const amount = Number(value || 0);
  return `${currency} ${amount.toFixed(2)}`;
}

function date(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('nl-NL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function statusClass(status: string | null) {
  if (status === 'pending') return 'badge pending';
  if (status === 'paid') return 'badge paid';
  return 'badge other';
}

async function getInvoices(status: string, search: string) {
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

  return query<Invoice>(
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
    ORDER BY COALESCE(sent_at, invoice_date::timestamptz) DESC NULLS LAST, invoice_number DESC
    LIMIT 200
    `,
    params,
  );
}

async function getStats() {
  const rows = await query<{
    total: string;
    pending: string;
    paid: string;
    pending_amount: string;
  }>(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'paid') AS paid,
      COALESCE(SUM(total) FILTER (WHERE status = 'pending'), 0) AS pending_amount
    FROM invoices
  `);

  return rows[0] || { total: '0', pending: '0', paid: '0', pending_amount: '0' };
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = params.status || 'all';
  const search = params.search?.trim() || '';
  const [invoices, stats] = await Promise.all([getInvoices(status, search), getStats()]);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Plus Tensions</p>
          <h1>Invoice CRM</h1>
        </div>
        <nav className="tabs">
          <Link className="tab" href="/">
            Invoices
          </Link>
          <Link className="tab" href="/customers">
            Customers
          </Link>
        </nav>
      </header>

      <section className="grid">
        <div className="metric">
          <div className="metric-label">Invoices</div>
          <div className="metric-value">{stats.total}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Pending</div>
          <div className="metric-value">{stats.pending}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Paid</div>
          <div className="metric-value">{stats.paid}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Pending amount</div>
          <div className="metric-value">{money(stats.pending_amount)}</div>
        </div>
      </section>

      <section className="panel">
        <form className="toolbar">
          <div className="filters">
            <select name="status" defaultValue={status}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="manual_review">Manual review</option>
            </select>
            <input name="search" placeholder="Search invoice, customer, email..." defaultValue={search} />
            <button className="btn" type="submit">
              Filter
            </button>
          </div>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Reminder</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.invoice_number}>
                  <td>
                    <span className="main-cell">#{invoice.invoice_number}</span>
                    <span className="sub">{date(invoice.invoice_date)}</span>
                  </td>
                  <td>
                    <span className="main-cell">{invoice.customer_name || '—'}</span>
                    <span className="sub">Code: {invoice.customer_code || '—'}</span>
                  </td>
                  <td>
                    {invoice.customer_email || '—'}
                    <span className="sub">{invoice.customer_phone || 'No phone'}</span>
                  </td>
                  <td>{money(invoice.total, invoice.currency || 'EUR')}</td>
                  <td>
                    <span className={statusClass(invoice.status)}>{invoice.status || 'unknown'}</span>
                  </td>
                  <td>
                    {invoice.mollie_checkout ? (
                      <a href={invoice.mollie_checkout} target="_blank">
                        Mollie link
                      </a>
                    ) : (
                      '—'
                    )}
                    <span className="sub">Expires: {date(invoice.payment_link_expires_at)}</span>
                  </td>
                  <td>
                    Count: {invoice.reminder_count || 0}
                    <span className="sub">Next: {date(invoice.next_admin_reminder_at)}</span>
                  </td>
                  <td>
                    <InvoiceActions invoiceNumber={invoice.invoice_number} />
                    <span className="sub">
                      {invoice.drive_file_url ? (
                        <a href={invoice.drive_file_url} target="_blank">
                          PDF
                        </a>
                      ) : (
                        'No PDF'
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!invoices.length ? <div className="empty">No invoices found.</div> : null}
        </div>
      </section>
    </main>
  );
}
