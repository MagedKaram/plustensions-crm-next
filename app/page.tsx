import Link from 'next/link';
import { InvoiceActions } from './actions';
import { Shell } from './components/Shell';
import { query } from '@/lib/db';
import { invoiceDateExpression, invoiceOptionalColumns } from '@/lib/schema';
import type { Invoice } from '@/lib/types';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ status?: string; search?: string; customer?: string; page?: string; pageSize?: string }>;

type Stats = { total: string; pending: string; paid: string; pending_amount: string; paid_amount: string };
type StatusStat = { status: string; count: string; amount: string };
type MonthStat = { month: string; total_amount: string; invoice_count: string };
type CountRow = { count: string };
type CustomerOption = { customer_code: string; customer_name: string | null };

function money(value: string | number | null, currency = 'EUR') {
  return `${currency} ${Number(value || 0).toFixed(2)}`;
}

function date(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('nl-NL', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function optionalColumn(enabled: boolean, column: string, fallback: string, alias = column) {
  return enabled ? column : `${fallback} AS ${alias}`;
}

function pageSizeValue(value: string | undefined) {
  const size = Number(value || 10);
  return [10, 20, 50].includes(size) ? size : 10;
}

async function getInvoices(status: string, search: string, customer: string, page: number, pageSize: number) {
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
    where.push(`(invoice_number ILIKE $${params.length} OR customer_name ILIKE $${params.length} OR customer_code ILIKE $${params.length} OR customer_email ILIKE $${params.length})`);
  }

  if (customer) {
    params.push(customer);
    where.push(`customer_code = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countRows = await query<CountRow>(`SELECT COUNT(*) AS count FROM invoices ${whereSql}`, params);
  const total = Number(countRows[0]?.count || 0);

  params.push(pageSize);
  const limitParam = params.length;
  params.push((page - 1) * pageSize);
  const offsetParam = params.length;

  const rows = await query<Invoice>(
    `
    SELECT invoice_number, customer_name, customer_code, customer_email,
      ${optionalColumn(columns.customerPhone, 'customer_phone', 'NULL::text')},
      total, currency, status,
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
    ${whereSql}
    ORDER BY ${sortDate} DESC NULLS LAST, invoice_number DESC
    LIMIT $${limitParam}
    OFFSET $${offsetParam}
    `,
    params,
  );

  return { rows, total };
}

async function getStats() {
  const rows = await query<Stats>(`
    SELECT COUNT(*) AS total,
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
    SELECT COALESCE(status, 'unknown') AS status, COUNT(*) AS count, COALESCE(SUM(total), 0) AS amount
    FROM invoices GROUP BY COALESCE(status, 'unknown') ORDER BY count DESC
  `);
}

async function getMonthlyStats() {
  const columns = await invoiceOptionalColumns();
  const sortDate = invoiceDateExpression(columns);
  if (!columns.sentAt && !columns.invoiceDate && !columns.createdAt) return [];
  return query<MonthStat>(`
    SELECT to_char(date_trunc('month', ${sortDate}), 'Mon YYYY') AS month,
      COALESCE(SUM(total), 0) AS total_amount, COUNT(*) AS invoice_count
    FROM invoices WHERE ${sortDate} >= now() - interval '6 months'
    GROUP BY date_trunc('month', ${sortDate}) ORDER BY date_trunc('month', ${sortDate}) ASC
  `);
}

async function getCustomerOptions() {
  return query<CustomerOption>(`
    SELECT
      customer_code,
      MAX(customer_name) AS customer_name
    FROM invoices
    WHERE customer_code IS NOT NULL
      AND customer_code <> ''
    GROUP BY customer_code
    ORDER BY MAX(customer_name) ASC NULLS LAST, customer_code ASC
  `);
}

function statusClass(status: string | null) {
  return `badge ${status || 'other'}`;
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = params.status || 'all';
  const search = params.search?.trim() || '';
  const customer = params.customer?.trim() || '';
  const pageSize = pageSizeValue(params.pageSize);
  const requestedPage = Math.max(1, Number(params.page || 1) || 1);

  let invoices: Invoice[] = [];
  let totalInvoices = 0;
  let stats: Stats = { total: '0', pending: '0', paid: '0', pending_amount: '0', paid_amount: '0' };
  let statusStats: StatusStat[] = [];
  let monthlyStats: MonthStat[] = [];
  let customers: CustomerOption[] = [];
  let loadError: string | null = null;

  try {
    const [invoiceResult, statsResult, statusStatsResult, monthlyStatsResult, customerResult] = await Promise.all([
      getInvoices(status, search, customer, requestedPage, pageSize),
      getStats(),
      getStatusStats(),
      getMonthlyStats(),
      getCustomerOptions(),
    ]);
    invoices = invoiceResult.rows;
    totalInvoices = invoiceResult.total;
    stats = statsResult;
    statusStats = statusStatsResult;
    monthlyStats = monthlyStatsResult;
    customers = customerResult;
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Unknown database error';
  }

  const pageCount = Math.max(1, Math.ceil(totalInvoices / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const pageHref = (targetPage: number) => {
    const next = new URLSearchParams();
    if (status !== 'all') next.set('status', status);
    if (search) next.set('search', search);
    if (customer) next.set('customer', customer);
    next.set('pageSize', String(pageSize));
    next.set('page', String(targetPage));
    return `/?${next.toString()}`;
  };

  const maxStatus = Math.max(...statusStats.map((r) => Number(r.count)), 1);
  const maxMonth = Math.max(...monthlyStats.map((r) => Number(r.total_amount)), 1);
  const collection = Number(stats.total) ? Math.round((Number(stats.paid) / Number(stats.total)) * 100) : 0;

  return (
    <Shell
      title="Customer invoices"
      subtitle="Track billing status, Mollie links and reminder actions."
      crumb="Invoices"
      actions={<Link className="btn ghost" href="/customers">Customers</Link>}
    >
      {loadError ? (
        <div className="panel error-panel">
          <div className="panel-head"><h2>Invoices could not be loaded</h2><span className="pill">Database</span></div>
          <div className="msg">{loadError}</div>
        </div>
      ) : null}

      <section className="kpis">
        <div className="kpi is-primary"><div className="kpi-label">Total invoices</div><div className="kpi-value">{stats.total}</div><div className="kpi-hint">All records</div></div>
        <div className="kpi is-warn"><div className="kpi-label">Pending</div><div className="kpi-value">{stats.pending}</div><div className="kpi-hint">{money(stats.pending_amount)} outstanding</div></div>
        <div className="kpi is-success"><div className="kpi-label">Paid</div><div className="kpi-value">{stats.paid}</div><div className="kpi-hint">{money(stats.paid_amount)} received</div></div>
        <div className="kpi"><div className="kpi-label">Collection rate</div><div className="kpi-value">{collection}%</div><div className="kpi-hint">Paid / total</div></div>
      </section>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h2>Status overview</h2><span className="pill">By state</span></div>
          {statusStats.length ? (
            <div className="table-wrap"><table>
              <thead><tr><th>Status</th><th className="num">Count</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {statusStats.map((row) => (
                  <tr key={row.status}>
                    <td><span className={statusClass(row.status)}>{row.status}</span>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${(Number(row.count) / maxStatus) * 100}%` }} /></div>
                    </td>
                    <td className="num strong">{row.count}</td>
                    <td className="money muted">{money(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : <div className="empty"><strong>No status data</strong>Records appear once invoices exist.</div>}
        </div>

        <div className="panel">
          <div className="panel-head"><h2>Monthly volume</h2><span className="pill">Last 6 months</span></div>
          {monthlyStats.length ? (
            <div className="table-wrap"><table>
              <thead><tr><th>Month</th><th className="num">Total</th><th className="num">Invoices</th></tr></thead>
              <tbody>
                {monthlyStats.map((row) => (
                  <tr key={row.month}>
                    <td><span className="strong mono">{row.month}</span>
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${(Number(row.total_amount) / maxMonth) * 100}%` }} /></div>
                    </td>
                    <td className="money">{money(row.total_amount)}</td>
                    <td className="num muted">{row.invoice_count}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : <div className="empty"><strong>No dated invoices</strong>Monthly volume needs invoice dates.</div>}
        </div>
      </div>

      <section className="panel">
        <form className="filters" method="get">
          <div className="grow"><input name="search" placeholder="Search invoice, customer, email…" defaultValue={search} /></div>
          <select name="status" defaultValue={status}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="manual_review">Manual review</option>
          </select>
          <select name="customer" defaultValue={customer}>
            <option value="">All customers</option>
            {customers.map((item) => (
              <option key={item.customer_code} value={item.customer_code}>
                {item.customer_name || 'Unknown'} ({item.customer_code})
              </option>
            ))}
          </select>
          <select name="pageSize" defaultValue={String(pageSize)}>
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </select>
          <input type="hidden" name="page" value="1" />
          <button className="btn" type="submit">Filter</button>
          <Link className="btn ghost" href="/">Reset</Link>
        </form>
        <div className="result-meta">
          Showing {invoices.length} of {totalInvoices} invoices
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Invoice</th><th>Customer</th><th>Contact</th><th className="num">Total</th><th>Status</th><th>Payment</th><th>Reminder</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.invoice_number}>
                  <td><span className="main-cell mono">#{invoice.invoice_number}</span><span className="sub">{date(invoice.invoice_date)}</span></td>
                  <td><span className="main-cell">{invoice.customer_name || '—'}</span><span className="sub">Code: {invoice.customer_code || '—'}</span></td>
                  <td>{invoice.customer_email || '—'}<span className="sub">{invoice.customer_phone || 'No phone'}</span></td>
                  <td className="money">{money(invoice.total, invoice.currency || 'EUR')}</td>
                  <td><span className={statusClass(invoice.status)}>{invoice.status || 'unknown'}</span></td>
                  <td>{invoice.mollie_checkout ? <a href={invoice.mollie_checkout} target="_blank" rel="noopener">Mollie link</a> : '—'}<span className="sub">Expires: {date(invoice.payment_link_expires_at)}</span></td>
                  <td>Count: {invoice.reminder_count || 0}<span className="sub">Next: {date(invoice.next_admin_reminder_at)}</span></td>
                  <td><InvoiceActions invoiceNumber={invoice.invoice_number} status={invoice.status} />
                    <span className="sub">{invoice.drive_file_url ? <a href={invoice.drive_file_url} target="_blank" rel="noopener">PDF</a> : 'No PDF'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!invoices.length && !loadError ? <div className="empty"><strong>No invoices found</strong>Try a different search or status filter.</div> : null}
        </div>
        <div className="pagination">
          <Link className={`page-btn ${page <= 1 ? 'disabled' : ''}`} href={pageHref(Math.max(1, page - 1))}>Previous</Link>
          <span>Page {page} of {pageCount}</span>
          <Link className={`page-btn ${page >= pageCount ? 'disabled' : ''}`} href={pageHref(Math.min(pageCount, page + 1))}>Next</Link>
        </div>
      </section>
    </Shell>
  );
}
