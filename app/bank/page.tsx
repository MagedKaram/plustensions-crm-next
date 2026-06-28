import { Shell } from '../components/Shell';

import {
  getBankColumns,
  getBankRecords,
  getBankStats,
  getBankStatuses,
  getBankMonths,
  money,
  fmtDate,
  type BankRecord,
} from '@/lib/bank';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  q?: string;
  status?: string;
  from?: string;
  to?: string;
}>;

function niceLabel(name: string) {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isMoneyColumn(column: string) {
  return /amount|total|subtotal|vat|tax|price|balance|paid/i.test(column);
}

function isDateColumn(column: string) {
  return /date|created_at|updated_at|processed_at|paid_at/i.test(column);
}

function isStatusColumn(column: string) {
  return /status|state/i.test(column);
}

function cellValue(row: BankRecord, column: string) {
  const value = row[column];

  if (value === null || value === undefined || value === '') {
    return <span className="muted">—</span>;
  }

  if (isMoneyColumn(column)) {
    return money(value);
  }

  if (isDateColumn(column)) {
    return fmtDate(value);
  }

  const text = String(value);

  if (/^https?:\/\//i.test(text)) {
    return (
      <a href={text} target="_blank" rel="noopener">
        Open
      </a>
    );
  }

  if (text.length > 80) {
    return `${text.slice(0, 80)}…`;
  }

  return text;
}

function badgeClass(status: unknown) {
  return `badge ${String(status || 'unknown')}`;
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

  let columns: Awaited<ReturnType<typeof getBankColumns>> = [];
  let rows: BankRecord[] = [];
  let stats: Awaited<ReturnType<typeof getBankStats>> | null = null;
  let statuses: Awaited<ReturnType<typeof getBankStatuses>> = [];
  let months: Awaited<ReturnType<typeof getBankMonths>> = [];
  let error: string | null = null;

  try {
    [columns, rows, stats, statuses, months] = await Promise.all([
      getBankColumns(),
      getBankRecords({ q, status, from, to }),
      getBankStats(),
      getBankStatuses(),
      getBankMonths(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown database error';
  }

  const preferredColumns = [
    'id',
    'invoice_date',
    'date',
    'processed_at',
    'company_name',
    'supplier_name',
    'customer_name',
    'invoice_number',
    'description',
    'payment_reference',
    'iban',
    'currency',
    'subtotal_excl_vat',
    'vat_amount',
    'total_amount',
    'amount',
    'status',
    'google_drive_url',
    'source_file_name',
    'processed_file_name',
  ];

  const existingColumnNames = columns.map((column) => column.column_name);

  const displayColumns = [
    ...preferredColumns.filter((column) => existingColumnNames.includes(column)),
    ...existingColumnNames.filter((column) => !preferredColumns.includes(column)),
  ].slice(0, 12);

  const statusColumn = existingColumnNames.find((column) =>
    ['status', 'payment_status', 'state'].includes(column),
  );

  const maxMonth = Math.max(...months.map((m) => Number(m.total || 0)), 1);

  return (
    <Shell
      title="Bank invoices"
      subtitle="Records from bank_invoice_records in PostgreSQL."
      crumb="Bank invoices"
    >
      {error ? (
        <div className="panel error-panel">
          <div className="panel-head">
            <h2>Bank invoices could not be loaded</h2>
            <span className="pill">Database</span>
          </div>

          <p className="muted">
            Check <code>BANK_DATABASE_URL</code> or <code>DATABASE_URL</code>, and make sure
            the table <code>bank_invoice_records</code> exists.
          </p>

          <div className="msg">{error}</div>
        </div>
      ) : (
        <>
          <section className="kpis">
            <div className="kpi is-primary">
              <div className="kpi-label">Total records</div>
              <div className="kpi-value">{stats?.total_records ?? 0}</div>
              <div className="kpi-hint">From bank table</div>
            </div>

            <div className="kpi">
              <div className="kpi-label">Total amount</div>
              <div className="kpi-value">{money(stats?.total_amount)}</div>
              <div className="kpi-hint">Detected amount columns</div>
            </div>

            <div className="kpi">
              <div className="kpi-label">Total VAT</div>
              <div className="kpi-value">{money(stats?.total_vat)}</div>
              <div className="kpi-hint">If VAT column exists</div>
            </div>

            <div className="kpi is-success">
              <div className="kpi-label">This month</div>
              <div className="kpi-value">{money(stats?.this_month_total)}</div>
              <div className="kpi-hint">{stats?.this_month_count ?? 0} records</div>
            </div>
          </section>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <h2>Status summary</h2>
                <span className="pill">Bank workflow</span>
              </div>

              {statuses.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th className="num">Count</th>
                      </tr>
                    </thead>

                    <tbody>
                      {statuses.map((row) => (
                        <tr key={row.status}>
                          <td>
                            <span className={badgeClass(row.status)}>{row.status}</span>
                          </td>
                          <td className="num strong">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <strong>No status column detected</strong>
                  The page still shows records below.
                </div>
              )}
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Monthly bank amount</h2>
                <span className="pill">Last 6 months</span>
              </div>

              {months.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="num">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {months.map((month) => (
                        <tr key={month.month}>
                          <td>
                            <span className="strong mono">{month.month}</span>
                            <div className="bar-track">
                              <div
                                className="bar-fill"
                                style={{
                                  width: `${(Number(month.total || 0) / maxMonth) * 100}%`,
                                }}
                              />
                            </div>
                          </td>
                          <td className="money">{money(month.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <strong>No monthly data</strong>
                  Monthly chart needs a date and amount column.
                </div>
              )}
            </div>
          </div>

          <section className="panel">
            <form className="filters" method="get">
              <div className="grow">
                <input
                  name="q"
                  placeholder="Search bank invoice records"
                  defaultValue={q}
                />
              </div>

              {statusColumn ? (
                <select name="status" defaultValue={status}>
                  <option value="">All statuses</option>
                  {statuses.map((row) => (
                    <option key={row.status} value={row.status}>
                      {row.status}
                    </option>
                  ))}
                </select>
              ) : null}

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
                        {displayColumns.map((column) => (
                          <th
                            key={column}
                            className={isMoneyColumn(column) ? 'num' : undefined}
                          >
                            {niceLabel(column)}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={String(row.id || row.invoice_number || index)}>
                          {displayColumns.map((column) => (
                            <td
                              key={column}
                              className={
                                isMoneyColumn(column)
                                  ? 'money num'
                                  : isDateColumn(column)
                                    ? 'mono'
                                    : undefined
                              }
                            >
                              {isStatusColumn(column) ? (
                                <span className={badgeClass(row[column])}>
                                  {String(row[column] || 'unknown')}
                                </span>
                              ) : (
                                cellValue(row, column)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="muted" style={{ marginTop: 14, fontSize: 12.5 }}>
                  Showing {rows.length} record(s){rows.length === 500 ? ' (capped at 500)' : ''}.
                </p>
              </>
            ) : (
              <div className="empty">
                <strong>No bank invoice records found</strong>
                Clear the search or widen the date range.
              </div>
            )}
          </section>
        </>
      )}
    </Shell>
  );
}
