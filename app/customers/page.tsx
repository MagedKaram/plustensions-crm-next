import Link from 'next/link';
import { query } from '@/lib/db';
import { invoiceOptionalColumns } from '@/lib/schema';
import type { Customer } from '@/lib/types';

export const dynamic = 'force-dynamic';

function money(value: string | number | null) {
  const amount = Number(value || 0);
  return `EUR ${amount.toFixed(2)}`;
}

export default async function CustomersPage() {
  let customers: Customer[] = [];
  let error: string | null = null;

  try {
    const columns = await invoiceOptionalColumns();
    const phoneSelect = columns.customerPhone ? 'latest.customer_phone' : 'NULL::text';
    const folderSelect = columns.customerFolderId ? 'latest.customer_folder_id' : 'NULL::text';

    customers = await query<Customer>(`
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
          COALESCE(sent_at, invoice_date::timestamptz) AS sort_date
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
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Unknown database error';
  }

  return (
    <main className="shell">
      <header className="topbar hero-bar">
        <div>
          <p className="eyebrow">Plus Tensions</p>
          <h1>Customers</h1>
          <p className="hero-copy">A lightweight customer index grouped by customer code and linked to Drive folders.</p>
        </div>
        <nav className="tabs">
          <Link className="tab" href="/">
            Invoices
          </Link>
          <Link className="tab active" href="/customers">
            Customers
          </Link>
          <Link className="tab danger" href="/logout">
            Logout
          </Link>
        </nav>
      </header>

      <section className="panel">
        {error ? (
          <div className="empty">
            <strong>Customers could not be loaded.</strong>
            <span className="sub">{error}</span>
          </div>
        ) : null}
        {!error ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Invoices</th>
                <th>Pending</th>
                <th>Paid</th>
                <th>Pending amount</th>
                <th>Drive</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, index) => (
                <tr key={`${customer.customer_code || 'unknown'}-${index}`}>
                  <td>
                    <span className="main-cell">{customer.customer_name || '—'}</span>
                    <span className="sub">Code: {customer.customer_code || '—'}</span>
                  </td>
                  <td>
                    {customer.customer_email || '—'}
                    <span className="sub">{customer.customer_phone || 'No phone'}</span>
                  </td>
                  <td>{customer.invoice_count}</td>
                  <td>{customer.pending_count}</td>
                  <td>{customer.paid_count}</td>
                  <td>{money(customer.total_pending)}</td>
                  <td>
                    {customer.customer_folder_id ? (
                      <a className="link" href={`https://drive.google.com/drive/folders/${customer.customer_folder_id}`} target="_blank">
                        Open folder
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!customers.length ? <div className="empty">No customers found.</div> : null}
        </div>
        ) : null}
      </section>
    </main>
  );
}
