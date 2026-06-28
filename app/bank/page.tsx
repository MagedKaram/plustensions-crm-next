import Link from 'next/link';
import { Shell } from '../components/Shell';

import {
  getBankInvoices,
  money,
  fmtDate,
  type BankInvoice,
} from '@/lib/bank';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  q?: string;
  status?: string;
  from?: string;
  to?: string;
}>;

function badgeClass(row: BankInvoice) {
  if (row.status === 'duplicate') return 'badge duplicate';
  return `badge ${String(row.status || 'unknown')}`;
}

export default async function BankInvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const q = (params.q || '').trim();
  const status = (params.status || '').trim();
  const from = (params.from || '').trim();
  const to = (params.to || '').trim();

  let rows: BankInvoice[] = [];
  let error: string | null = null;

  try {
    rows = await getBankInvoices({ q, status, from, to });
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown database error';
  }

  return (
    <Shell
      title="Bank invoices"
      subtitle="Processed records from the bank invoice pipeline."
      crumb="Bank invoices"
    >
      {error ? (
        <div className="panel error-panel">
          <div className="panel-head">
            <h2>Bank invoices could not be loaded</h2>
            <span className="pill">Database</span>
          </div>

          <div className="msg">{error}</div>
        </div>
      ) : (
        <section className="panel">
          <form className="filters" method="get">
            <div className="grow">
              <input
                name="q"
                placeholder="Search supplier, invoice #, VAT, file name"
                defaultValue={q}
              />
            </div>

            <select name="status" defaultValue={status}>
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="manual_review">Manual review</option>
              <option value="duplicate">Duplicate</option>
            </select>

            <input
              type="date"
              name="from"
              defaultValue={from}
              title="From date"
              style={{ width: 'auto' }}
            />

            <input
              type="date"
              name="to"
              defaultValue={to}
              title="To date"
              style={{ width: 'auto' }}
            />

            <button className="btn" type="submit">
              Apply filters
            </button>
          </form>

          {rows.length ? (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Supplier</th>
                      <th>Invoice #</th>
                      <th>VAT #</th>
                      <th className="num">Subtotal</th>
                      <th className="num">VAT</th>
                      <th className="num">Total</th>
                      <th>Status</th>
                      <th>File</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr key={String(row.id)}>
                        <td className="mono">{fmtDate(row.invoice_date)}</td>

                        <td>
                          <Link href={`/bank/${row.id}`}>
                            {(row.company_name as string) || 'Unknown'}
                          </Link>
                        </td>

                        <td className="mono">
                          <Link href={`/bank/${row.id}`}>
                            {(row.invoice_number as string) || '—'}
                          </Link>
                        </td>

                        <td className="mono muted">
                          {(row.vat_number as string) || '—'}
                        </td>

                        <td className="money muted">
                          {money(row.subtotal_excl_vat)}
                        </td>

                        <td className="money muted">
                          {money(row.vat_amount)}
                        </td>

                        <td className="money">
                          {money(row.total_amount)}
                        </td>

                        <td>
                          <span className={badgeClass(row)}>
                            {String(row.status || 'unknown')}
                          </span>
                        </td>

                        <td>
                          {row.google_drive_url ? (
                            <a
                              href={String(row.google_drive_url)}
                              target="_blank"
                              rel="noopener"
                            >
                              Open
                            </a>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="muted" style={{ marginTop: 14, fontSize: 12.5 }}>
                Showing {rows.length} record(s)
                {rows.length === 1000 ? ' (capped at 1000)' : ''}.
              </p>
            </>
          ) : (
            <div className="empty">
              <strong>No bank invoices match these filters</strong>
              Clear the search or widen the date range.
            </div>
          )}
        </section>
      )}
    </Shell>
  );
}
