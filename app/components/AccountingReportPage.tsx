import type {
  CSSProperties,
} from 'react';

import {
  Shell,
} from './Shell';

import {
  ReportPdfButton,
} from './ReportPdfButton';

import {
  getAccountingReport,
  getAvailableReportYears,
  getLatestReportDate,
} from '../../lib/reports';

import type {
  ReportKind,
  ReportPeriod,
} from '../../lib/reports';

type SearchParams =
  Record<
    string,
    string |
    string[] |
    undefined
  >;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getString(
  value:
    | string
    | string[]
    | undefined,
) {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function amount(
  value: unknown,
) {
  const n =
    Number(value);

  if (
    !Number.isFinite(n)
  ) {
    return '0.00';
  }

  return n.toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

const cardStyle:
  CSSProperties = {
  background: '#fff',
  border:
    '1px solid #e7e7e7',
  borderRadius: 14,
  padding: 18,
};

const gridStyle:
  CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 14,
  marginBottom: 20,
};

const tableWrap:
  CSSProperties = {
  overflowX: 'auto',
  background: '#fff',
  border:
    '1px solid #e7e7e7',
  borderRadius: 14,
};

const tableStyle:
  CSSProperties = {
  width: '100%',
  borderCollapse:
    'collapse',
  fontSize: 13,
};

const thStyle:
  CSSProperties = {
  textAlign: 'left',
  padding:
    '12px 14px',
  borderBottom:
    '1px solid #e7e7e7',
  whiteSpace: 'nowrap',
  background: '#fafafa',
};

const tdStyle:
  CSSProperties = {
  padding:
    '11px 14px',
  borderBottom:
    '1px solid #f0f0f0',
  whiteSpace: 'nowrap',
};

export async function
AccountingReportPage({
  kind,
  searchParams,
}: {
  kind: ReportKind;
  searchParams:
    SearchParams;
}) {
  const latestDate =
    await getLatestReportDate(
      kind,
    );

  const years =
    await getAvailableReportYears(
      kind,
    );

  const now =
    new Date();

  const latestYear =
    latestDate
      ? Number(
          latestDate.slice(
            0,
            4,
          ),
        )
      : now.getFullYear();

  const latestMonth =
    latestDate
      ? Number(
          latestDate.slice(
            5,
            7,
          ),
        )
      : now.getMonth() + 1;

  const rawPeriod =
    getString(
      searchParams.period,
    );

  const period:
    ReportPeriod =
      rawPeriod === 'year'
        ? 'year'
        : 'month';

  const requestedYear =
    Number(
      getString(
        searchParams.year,
      ),
    );

  const requestedMonth =
    Number(
      getString(
        searchParams.month,
      ),
    );

  const year =
    Number.isInteger(
      requestedYear,
    ) &&
    requestedYear >= 2000
      ? requestedYear
      : latestYear;

  const month =
    Number.isInteger(
      requestedMonth,
    ) &&
    requestedMonth >= 1 &&
    requestedMonth <= 12
      ? requestedMonth
      : latestMonth;

  const {
    transactions,
    summary,
    monthlyBreakdown,
  } =
    await getAccountingReport(
      kind,
      period,
      year,
      month,
    );

  const isGoods =
    kind === 'goods';

  const reportName =
    isGoods
      ? 'Goods Invoices Report'
      : 'Expense Invoices Report';

  const periodLabel =
    period === 'year'
      ? String(year)
      : `${MONTHS[
          month - 1
        ]} ${year}`;

  const fileName =
    `PlusTensions_${isGoods
      ? 'Goods'
      : 'Expense'}_Report_${
      period === 'year'
        ? year
        : `${year}-${String(
            month,
          ).padStart(
            2,
            '0',
          )}`
    }`;

  const allYears =
    years.includes(year)
      ? years
      : [
          year,
          ...years,
        ];

  return (
    <Shell
      title={
        isGoods
          ? 'Goods Reports'
          : 'Expense Reports'
      }
      crumb="Reports"
      subtitle="Generate monthly or yearly accounting reports and download them as PDF."
      actions={
        transactions.length ? (
          <ReportPdfButton
            reportTitle={
              reportName
            }
            periodLabel={
              periodLabel
            }
            fileName={
              fileName
            }
            transactions={
              transactions
            }
            summary={
              summary
            }
            monthlyBreakdown={
              monthlyBreakdown
            }
          />
        ) : null
      }
    >
      <div
        style={{
          ...cardStyle,
          marginBottom: 20,
        }}
      >
        <form
          method="get"
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems:
              'end',
          }}
        >
          <label>
            <div
              style={{
                fontSize: 12,
                marginBottom: 6,
                opacity: 0.7,
              }}
            >
              Report type
            </div>

            <select
              name="period"
              defaultValue={
                period
              }
              style={{
                minWidth: 150,
                padding:
                  '10px 12px',
              }}
            >
              <option value="month">
                Monthly
              </option>

              <option value="year">
                Yearly
              </option>
            </select>
          </label>

          <label>
            <div
              style={{
                fontSize: 12,
                marginBottom: 6,
                opacity: 0.7,
              }}
            >
              Year
            </div>

            <select
              name="year"
              defaultValue={
                String(year)
              }
              style={{
                minWidth: 120,
                padding:
                  '10px 12px',
              }}
            >
              {allYears.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <div
              style={{
                fontSize: 12,
                marginBottom: 6,
                opacity:
                  period ===
                  'year'
                    ? 0.35
                    : 0.7,
              }}
            >
              Month
            </div>

            <select
              name="month"
              defaultValue={
                String(month)
              }
              disabled={
                period ===
                'year'
              }
              style={{
                minWidth: 160,
                padding:
                  '10px 12px',
              }}
            >
              {MONTHS.map(
                (
                  name,
                  index,
                ) => (
                  <option
                    key={name}
                    value={
                      index + 1
                    }
                  >
                    {String(
                      index + 1,
                    ).padStart(
                      2,
                      '0',
                    )}{' '}
                    - {name}
                  </option>
                ),
              )}
            </select>

            {period ===
            'year' ? (
              <input
                type="hidden"
                name="month"
                value={month}
              />
            ) : null}
          </label>

          <button
            type="submit"
            className="btn btn-primary"
          >
            View Report
          </button>
        </form>
      </div>

      <div
        style={{
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 13,
            opacity: 0.65,
          }}
        >
          PlusTensions
        </div>

        <h2
          style={{
            margin:
              '3px 0',
          }}
        >
          {reportName}
        </h2>

        <div
          style={{
            fontSize: 14,
            opacity: 0.7,
          }}
        >
          {periodLabel}
        </div>
      </div>

      {summary.length ? (
        <div style={gridStyle}>
          {summary.map(
            (row) => (
              <div
                key={
                  row.currency
                }
                style={
                  cardStyle
                }
              >
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.6,
                    marginBottom: 8,
                  }}
                >
                  {
                    row.currency
                  }
                </div>

                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  {amount(
                    row.total,
                  )}{' '}
                  {
                    row.currency
                  }
                </div>

                <div
                  style={{
                    display:
                      'grid',
                    gap: 5,
                    fontSize: 12,
                  }}
                >
                  <div>
                    Invoices:{' '}
                    <b>
                      {
                        row.invoice_count
                      }
                    </b>
                  </div>

                  <div>
                    Subtotal:{' '}
                    <b>
                      {amount(
                        row.subtotal,
                      )}
                    </b>
                  </div>

                  <div>
                    VAT:{' '}
                    <b>
                      {amount(
                        row.vat,
                      )}
                    </b>
                  </div>

                  <div>
                    Shipping:{' '}
                    <b>
                      {amount(
                        row.shipping,
                      )}
                    </b>
                  </div>

                  <div>
                    Discount:{' '}
                    <b>
                      {amount(
                        row.discount,
                      )}
                    </b>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      ) : (
        <div
          style={{
            ...cardStyle,
            marginBottom: 20,
          }}
        >
          No invoices found
          for this period.
        </div>
      )}

      {period ===
        'year' &&
      monthlyBreakdown.length ? (
        <>
          <h3>
            Monthly Breakdown
          </h3>

          <div
            style={{
              ...tableWrap,
              marginBottom: 24,
            }}
          >
            <table
              style={tableStyle}
            >
              <thead>
                <tr>
                  <th
                    style={
                      thStyle
                    }
                  >
                    Month
                  </th>

                  <th
                    style={
                      thStyle
                    }
                  >
                    Currency
                  </th>

                  <th
                    style={
                      thStyle
                    }
                  >
                    Invoices
                  </th>

                  <th
                    style={
                      thStyle
                    }
                  >
                    Subtotal
                  </th>

                  <th
                    style={
                      thStyle
                    }
                  >
                    VAT
                  </th>

                  <th
                    style={
                      thStyle
                    }
                  >
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {monthlyBreakdown.map(
                  (
                    row,
                    index,
                  ) => (
                    <tr
                      key={`${row.month}-${row.currency}-${index}`}
                    >
                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          row.month
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          row.currency
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {
                          row.invoice_count
                        }
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {amount(
                          row.subtotal,
                        )}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {amount(
                          row.vat,
                        )}
                      </td>

                      <td
                        style={
                          tdStyle
                        }
                      >
                        {amount(
                          row.total,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems:
            'center',
          marginBottom: 10,
        }}
      >
        <h3
          style={{
            margin: 0,
          }}
        >
          Transactions
        </h3>

        <div
          style={{
            fontSize: 13,
            opacity: 0.65,
          }}
        >
          {
            transactions.length
          }{' '}
          transaction
          {transactions.length ===
          1
            ? ''
            : 's'}
        </div>
      </div>

      <div style={tableWrap}>
        <table
          style={tableStyle}
        >
          <thead>
            <tr>
              <th style={thStyle}>
                Date
              </th>

              <th style={thStyle}>
                Company
              </th>

              <th style={thStyle}>
                Invoice #
              </th>

              <th style={thStyle}>
                VAT #
              </th>

              <th style={thStyle}>
                Currency
              </th>

              <th style={thStyle}>
                Subtotal
              </th>

              <th style={thStyle}>
                VAT
              </th>

              <th style={thStyle}>
                Total
              </th>

              <th style={thStyle}>
                Status
              </th>

              <th style={thStyle}>
                File
              </th>
            </tr>
          </thead>

          <tbody>
            {transactions.map(
              (
                row,
                index,
              ) => (
                <tr
                  key={`${row.invoice_number}-${index}`}
                >
                  <td
                    style={
                      tdStyle
                    }
                  >
                    {
                      row.invoice_date
                    }
                  </td>

                  <td
                    style={
                      tdStyle
                    }
                  >
                    {
                      row.company_name
                    }
                  </td>

                  <td
                    style={
                      tdStyle
                    }
                  >
                    {
                      row.invoice_number
                    }
                  </td>

                  <td
                    style={
                      tdStyle
                    }
                  >
                    {
                      row.vat_number
                    }
                  </td>

                  <td
                    style={
                      tdStyle
                    }
                  >
                    {
                      row.currency
                    }
                  </td>

                  <td
                    style={
                      tdStyle
                    }
                  >
                    {amount(
                      row
                        .subtotal_excl_vat,
                    )}
                  </td>

                  <td
                    style={
                      tdStyle
                    }
                  >
                    {amount(
                      row.vat_amount,
                    )}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 700,
                    }}
                  >
                    {amount(
                      row.total_amount,
                    )}
                  </td>

                  <td
                    style={
                      tdStyle
                    }
                  >
                    {
                      row.status ||
                      '—'
                    }
                  </td>

                  <td
                    style={
                      tdStyle
                    }
                  >
                    {row.google_drive_url ? (
                      <a
                        href={
                          row.google_drive_url
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
