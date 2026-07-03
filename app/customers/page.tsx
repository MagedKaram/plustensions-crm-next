import Link from 'next/link';
import { query } from '@/lib/db';
import type { Customer } from '@/lib/types';

export const dynamic = 'force-dynamic';

function money(value: string | number | null) {
  const amount = Number(value || 0);
  return `EUR ${amount.toFixed(2)}`;
}

export default async function CustomersPage() {
  const customers = await query<Customer>(`
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
          <Link className="tab danger" href="/logout" prefetch={false}>
            Logout
          </Link>
        </nav>
      </header>

      <section className="panel">
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
      </section>
    </main>
  );
}
