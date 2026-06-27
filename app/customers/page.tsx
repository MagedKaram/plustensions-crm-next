import { Shell } from '../components/Shell';
import { query } from '@/lib/db';
import { invoiceDateExpression, invoiceOptionalColumns } from '@/lib/schema';
import type { Customer } from '@/lib/types';

export const dynamic = 'force-dynamic';

function money(value: string | number | null) {
  return `EUR ${Number(value || 0).toFixed(2)}`;
}

export default async function CustomersPage() {
  let customers: Customer[] = [];
  let error: string | null = null;

  try {
    const columns = await invoiceOptionalColumns();
    const phoneSelect = columns.customerPhone ? 'latest.customer_phone' : 'NULL::text';
    const folderSelect = columns.customerFolderId ? 'latest.customer_folder_id' : 'NULL::text';
    const sortDate = invoiceDateExpression(columns);

    customers = await query<Customer>(`
      WITH normalized AS (
        SELECT
          COALESCE(NULLIF(customer_code, ''), NULLIF(customer_email, ''), NULLIF(customer_name, ''), invoice_number) AS customer_key,
          invoice_number, customer_code, customer_name, customer_email,
          ${columns.customerPhone ? 'customer_phone,' : 'NULL::text AS customer_phone,'}
          ${columns.customerFolderId ? 'customer_folder_id,' : 'NULL::text AS customer_folder_id,'}
          total, status, ${sortDate} AS sort_date
        FROM invoices
      ),
      summary AS (
        SELECT customer_key, COUNT(*)::int AS invoice_count,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count,
          COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
          COALESCE(SUM(total) FILTER (WHERE status = 'pending'), 0) AS total_pending
        FROM normalized GROUP BY customer_key
      ),
      latest AS (
        SELECT DISTINCT ON (customer_key)
          customer_key, customer_code, customer_name, customer_email, customer_phone, customer_folder_id
        FROM normalized ORDER BY customer_key, sort_date DESC NULLS LAST, invoice_number DESC
      )
      SELECT latest.customer_code, latest.customer_name, latest.customer_email,
        ${phoneSelect} AS customer_phone, ${folderSelect} AS customer_folder_id,
        summary.invoice_count, summary.pending_count, summary.paid_count, summary.total_pending
      FROM summary JOIN latest ON latest.customer_key = summary.customer_key
      ORDER BY latest.customer_name ASC NULLS LAST LIMIT 300
    `);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : 'Unknown database error';
  }

  return (
    <Shell title="Customers" subtitle="Customer index grouped by code and linked to Drive folders." crumb="Customers">
      {error ? (
        <div className="panel error-panel">
          <div className="panel-head"><h2>Customers could not be loaded</h2><span className="pill">Database</span></div>
          <div className="msg">{error}</div>
        </div>
      ) : (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Customer</th><th>Contact</th><th className="num">Invoices</th><th className="num">Pending</th><th className="num">Paid</th><th className="num">Pending amount</th><th>Drive</th></tr>
              </thead>
              <tbody>
                {customers.map((customer, index) => (
                  <tr key={`${customer.customer_code || 'unknown'}-${index}`}>
                    <td><span className="main-cell">{customer.customer_name || '—'}</span><span className="sub">Code: {customer.customer_code || '—'}</span></td>
                    <td>{customer.customer_email || '—'}<span className="sub">{customer.customer_phone || 'No phone'}</span></td>
                    <td className="num">{customer.invoice_count}</td>
                    <td className="num">{customer.pending_count}</td>
                    <td className="num">{customer.paid_count}</td>
                    <td className="money">{money(customer.total_pending)}</td>
                    <td>{customer.customer_folder_id ? <a href={`https://drive.google.com/drive/folders/${customer.customer_folder_id}`} target="_blank" rel="noopener">Open folder</a> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!customers.length ? <div className="empty"><strong>No customers found</strong>Customers appear once invoices are recorded.</div> : null}
          </div>
        </section>
      )}
    </Shell>
  );
}
