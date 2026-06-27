import Link from 'next/link';
import { InvoiceActions } from './actions';
import { query } from '@/lib/db';
import type { Invoice } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  status?: string;
  search?: string;
}>;

type Stats = {
  total: string;
  pending: string;
  paid: string;
  pending_amount: string;
  paid_amount: string;
};

type StatusStat = {
  status: string;
  count: string;
  amount: string;
};

type MonthStat = {
  month: string;
  total_amount: string;
  invoice_count: string;
};

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
  const rows = await query<Stats>(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'paid') AS paid,
      COALESCE(SUM(total) FILTER (WHERE status = 'pending'), 0) AS pending_amount,
      COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) AS paid_amount
    FROM invoices
  `);

  return rows[0] || { total: '0', pending: '0', paid: '0', pending_amount: '0', paid_amount: '0' };
}

async function getStatusStats() {
  return query<StatusStat>(`
    SELECT
      COALESCE(status, 'unknown') AS status,
      COUNT(*) AS count,
      COALESCE(SUM(total), 0) AS amount
    FROM invoices
    GROUP BY COALESCE(status, 'unknown')
    ORDER BY count DESC
  `);
}

async function getMonthlyStats() {
  return query<MonthStat>(`
    SELECT
      to_char(date_trunc('month', COALESCE(sent_at, invoice_date::timestamptz)), 'Mon YYYY') AS month,
      COALESCE(SUM(total), 0) AS total_amount,
      COUNT(*) AS invoice_count
    FROM invoices
    WHERE COALESCE(sent_at, invoice_date::timestamptz) >= now() - interval '6 months'
    GROUP BY date_trunc('month', COALESCE(sent_at, invoice_date::timestamptz))
    ORDER BY date_trunc('month', COALESCE(sent_at, invoice_date::timestamptz)) ASC
  `);
}

function StatusBars({ rows }: { rows: StatusStat[] }) {
  const max = Math.max(...rows.map((row) => Number(row.count)), 1);
  return (
    <div className="status-bars">
      {rows.map((row) => (
        <div className="bar-row" key={row.status}>
          <div className="bar-head">
            <span>{row.status}</span>
            <strong>{row.count}</strong>
          </div>
          <div className="bar-track">
            <div className={`bar-fill ${row.status}`} style={{ width: `${(Number(row.count) / max) * 100}%` }} />
          </div>
          <span className="sub">{money(row.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function MonthlyChart({ rows }: { rows: MonthStat[] }) {
  const max = Math.max(...rows.map((row) => Number(row.total_amount)), 1);
  return (
    <div className="month-chart">
      {rows.map((row) => {
        const height = Math.max(8, (Number(row.total_amount) / max) * 150);
        return (
          <div className="month-col" key={row.month}>
            <div className="month-value">{money(row.total_amount)}</div>
            <div className="month-bar" style={{ height }} />
            <div className="month-label">{row.month}</div>
            <span className="sub">{row.invoice_count} invoices</span>
          </div>
        );
      })}
    </div>
  );
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = params.status || 'all';
  const search = params.search?.trim() || '';
  const [invoices, stats, statusStats, monthlyStats] = await Promise.all([
    getInvoices(status, search),
    getStats(),
    getStatusStats(),
    getMonthlyStats(),
  ]);

  return (
    <main className="shell">
      <header className="topbar hero-bar">
        <div>
          <p className="eyebrow">Plus Tensions</p>
          <h1>Invoice Command Center</h1>
          <p className="hero-copy">Track invoices, customer payment status, and n8n reminder actions from one lightweight CRM.</p>
        </div>
        <nav className="tabs">
          <Link className="tab active" href="/">
            Invoices
          </Link>
          <Link className="tab" href="/customers">
            Customers
          </Link>
          <Link className="tab danger" href="/logout" prefetch={false}>
            Logout
          </Link>
        </nav>
      </header>

      <section className="metric-grid">
        <div className="metric accent">
          <div className="metric-label">Total invoices</div>
          <div className="metric-value">{stats.total}</div>
          <span className="sub">All records in Postgres</span>
        </div>
        <div className="metric">
          <div className="metric-label">Pending</div>
          <div className="metric-value">{stats.pending}</div>
          <span className="sub">{money(stats.pending_amount)} outstanding</span>
        </div>
        <div className="metric">
          <div className="metric-label">Paid</div>
          <div className="metric-value">{stats.paid}</div>
          <span className="sub">{money(stats.paid_amount)} received</span>
        </div>
        <div className="metric">
          <div className="metric-label">Collection rate</div>
          <div className="metric-value">
            {Number(stats.total) ? Math.round((Number(stats.paid) / Number(stats.total)) * 100) : 0}%
          </div>
          <span className="sub">Paid invoices / total</span>
        </div>
      </section>

      <section className="chart-grid">
        <div className="panel chart-panel">
          <div className="panel-title">
            <h2>Status overview</h2>
            <span>Invoices by state</span>
          </div>
          <StatusBars rows={statusStats} />
        </div>
        <div className="panel chart-panel">
          <div className="panel-title">
            <h2>Monthly volume</h2>
            <span>Last 6 months</span>
          </div>
          <MonthlyChart rows={monthlyStats} />
        </div>
      </section>

      <section className="panel">
        <form className="toolbar">
          <div>
            <h2>Invoices</h2>
            <span className="sub">Showing latest 200 records</span>
          </div>
          <div className="filters">
            <select name="status" defaultValue={status}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="manual_review">Manual review</option>
            </select>
            <input name="search" placeholder="Search invoice, customer, email..." defaultValue={search} />
            <button className="btn primary" type="submit">
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
                      <a className="link" href={invoice.mollie_checkout} target="_blank">
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
                        <a className="link" href={invoice.drive_file_url} target="_blank">
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
