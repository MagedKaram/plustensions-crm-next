import Link from 'next/link';
import { Shell } from '../components/Shell';
import { getTaxStats, getTaxSuppliers, getTaxMonths, getTaxStatuses, money } from '@/lib/tax';

export const dynamic = 'force-dynamic';

function badgeClass(status: string) {
  return `badge ${status}`;
}

export default async function TaxOverview() {
  let stats = null;
  let suppliers: Awaited<ReturnType<typeof getTaxSuppliers>> = [];
  let months: Awaited<ReturnType<typeof getTaxMonths>> = [];
  let statuses: Awaited<ReturnType<typeof getTaxStatuses>> = [];
  let error: string | null = null;

  try {
    [stats, suppliers, months, statuses] = await Promise.all([
      getTaxStats(),
      getTaxSuppliers(),
      getTaxMonths(),
      getTaxStatuses(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown database error';
  }

  const maxSupplier = Math.max(...suppliers.map((s) => Number(s.total || 0)), 1);
  const maxMonth = Math.max(...months.map((m) => Number(m.total || 0)), 1);

  const actions = (
    <>
      <a className="btn ghost" href="/api/tax/export">Export CSV</a>
      <Link className="btn" href="/tax/upload">Upload invoice</Link>
    </>
  );

  return (
    <Shell title="Tax overview" subtitle="Supplier invoices, VAT and spend extracted by the n8n pipeline." crumb="Tax overview" actions={actions}>
      {error ? (
        <div className="panel error-panel">
          <div className="panel-head"><h2>We could not reach the tax database</h2><span className="pill">Connection</span></div>
          <p className="muted">Check <code>TAX_DATABASE_URL</code> (or <code>DATABASE_URL</code>) and that the table <code>invoice_records</code> exists.</p>
          <div className="msg">{error}</div>
        </div>
      ) : (
        <>
          <section className="kpis">
            <div className="kpi is-primary"><div className="kpi-label">Total invoices</div><div className="kpi-value">{stats?.total_invoices ?? 0}</div><div className="kpi-hint">All processed records</div></div>
            <div className="kpi"><div className="kpi-label">Total spend</div><div className="kpi-value">{money(stats?.total_amount)}</div><div className="kpi-hint">Including VAT</div></div>
            <div className="kpi"><div className="kpi-label">Total VAT</div><div className="kpi-value">{money(stats?.total_vat)}</div><div className="kpi-hint">Recoverable VAT</div></div>
            <div className="kpi is-success"><div className="kpi-label">This month</div><div className="kpi-value">{money(stats?.this_month_total)}</div><div className="kpi-hint">{stats?.this_month_count ?? 0} invoices</div></div>
            <div className="kpi is-warn"><div className="kpi-label">Needs attention</div><div className="kpi-value">{stats?.manual_review ?? 0} / {stats?.duplicates ?? 0}</div><div className="kpi-hint">Review / duplicates</div></div>
          </section>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head"><h2>Top suppliers</h2><span className="pill">By spend</span></div>
              {suppliers.length ? (
                <div className="table-wrap"><table>
                  <thead><tr><th>Supplier</th><th className="num">Invoices</th><th className="num">Total</th></tr></thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <tr key={s.company_name || 'unknown'}>
                        <td><span className="strong">{s.company_name || 'Unknown supplier'}</span>
                          <div className="bar-track"><div className="bar-fill" style={{ width: `${(Number(s.total || 0) / maxSupplier) * 100}%` }} /></div>
                        </td>
                        <td className="num">{s.invoices}</td>
                        <td className="money">{money(s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              ) : <div className="empty"><strong>No suppliers yet</strong>Process an invoice to see spend by supplier.</div>}
            </div>

            <div className="panel">
              <div className="panel-head"><h2>Status summary</h2><span className="pill">Workflow health</span></div>
              {statuses.length ? (
                <div className="table-wrap"><table>
                  <thead><tr><th>Status</th><th className="num">Count</th></tr></thead>
                  <tbody>
                    {statuses.map((row) => (
                      <tr key={row.status}><td><span className={badgeClass(row.status)}>{row.status}</span></td><td className="num strong">{row.count}</td></tr>
                    ))}
                  </tbody>
                </table></div>
              ) : <div className="empty"><strong>No status data</strong>Records appear once invoices are processed.</div>}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h2>Monthly spend</h2><span className="pill">Last 6 months</span></div>
            {months.length ? (
              <div className="table-wrap"><table>
                <thead><tr><th>Month</th><th className="num">Total</th><th className="num">VAT</th></tr></thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month}>
                      <td><span className="strong mono">{m.month}</span>
                        <div className="bar-track"><div className="bar-fill" style={{ width: `${(Number(m.total || 0) / maxMonth) * 100}%` }} /></div>
                      </td>
                      <td className="money">{money(m.total)}</td>
                      <td className="money muted">{money(m.vat)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            ) : <div className="empty"><strong>No dated invoices</strong>Monthly spend needs invoice dates.</div>}
          </div>
        </>
      )}
    </Shell>
  );
}
