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

const BRAND = '#ae7c5b';
const BRAND_DARK = '#8f6247';
const TEXT = '#1f2937';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const BG = '#f7f8fa';

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

function currencySymbol(
  currency: string,
) {
  switch (
    String(currency)
      .toUpperCase()
  ) {
    case 'EUR':
      return '€';

    case 'USD':
      return '$';

    case 'GBP':
      return '£';

    case 'EGP':
      return 'EGP';

    default:
      return currency;
  }
}

const panel:
  CSSProperties = {
  background: '#ffffff',
  border:
    `1px solid ${BORDER}`,
  borderRadius: 16,
  boxShadow:
    '0 1px 2px rgba(0,0,0,0.03)',
};

const inputStyle:
  CSSProperties = {
  height: 42,
  minWidth: 150,
  padding:
    '0 12px',
  borderRadius: 10,
  border:
    `1px solid ${BORDER}`,
  background: '#fff',
  color: TEXT,
  fontSize: 14,
  outline: 'none',
};

const tableHeader:
  CSSProperties = {
  padding:
    '13px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  textTransform:
    'uppercase',
  letterSpacing:
    '0.04em',
  color: '#667085',
  borderBottom:
    `1px solid ${BORDER}`,
  whiteSpace: 'nowrap',
  background: '#fafafa',
};

const tableCell:
  CSSProperties = {
  padding:
    '13px 14px',
  fontSize: 13,
  color: TEXT,
  borderBottom:
    `1px solid ${BORDER}`,
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

  const availableYears =
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

  const title =
    isGoods
      ? 'Goods Reports'
      : 'Expense Reports';

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
    `PlusTensions_${
      isGoods
        ? 'Goods'
        : 'Expense'
    }_Report_${
      period === 'year'
        ? year
        : `${year}-${String(
            month,
          ).padStart(
            2,
            '0',
          )}`
    }`;

  const years =
    availableYears.includes(
      year,
    )
      ? availableYears
      : [
          year,
          ...availableYears,
        ];

  const totalInvoices =
    summary.reduce(
      (
        total,
        row,
      ) =>
        total +
        Number(
          row.invoice_count ||
            0,
        ),
      0,
    );

  return (
    <Shell
      title={title}
      crumb="Reports"
      subtitle={`Create professional monthly or yearly ${isGoods ? 'goods' : 'expense'} accounting reports.`}
      actions={
        transactions.length >
        0 ? (
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
          minHeight:
            '100%',
          background: BG,
        }}
      >
        {/* FILTER BAR */}

        <div
          style={{
            ...panel,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <form
            method="get"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems:
                'flex-end',
              gap: 14,
            }}
          >
            <label>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: MUTED,
                  marginBottom: 7,
                }}
              >
                Report Type
              </div>

              <select
                name="period"
                defaultValue={
                  period
                }
                style={
                  inputStyle
                }
              >
                <option value="month">
                  Monthly Report
                </option>

                <option value="year">
                  Yearly Report
                </option>
              </select>
            </label>

            <label>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: MUTED,
                  marginBottom: 7,
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
                  ...inputStyle,
                  minWidth: 115,
                }}
              >
                {years.map(
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
                  fontWeight: 600,
                  color:
                    period ===
                    'year'
                      ? '#b8bcc4'
                      : MUTED,
                  marginBottom: 7,
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
                  ...inputStyle,
                  opacity:
                    period ===
                    'year'
                      ? 0.5
                      : 1,
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
              style={{
                height: 42,
                padding:
                  '0 22px',
                border: 0,
                borderRadius: 10,
                background:
                  BRAND,
                color: '#fff',
                fontWeight: 700,
                cursor:
                  'pointer',
                fontSize: 14,
              }}
            >
              Generate Report
            </button>
          </form>
        </div>

        {/* REPORT TITLE */}

        <div
          style={{
            ...panel,
            padding:
              '22px 24px',
            marginBottom: 20,
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems:
                'center',
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 14,
                background:
                  '#f3e7de',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                color: BRAND,
                fontWeight: 800,
                fontSize: 22,
              }}
            >
              PT
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing:
                    '0.08em',
                  textTransform:
                    'uppercase',
                  color: BRAND,
                  marginBottom: 3,
                }}
              >
                PlusTensions
              </div>

              <h2
                style={{
                  margin: 0,
                  color: TEXT,
                  fontSize: 22,
                }}
              >
                {reportName}
              </h2>

              <div
                style={{
                  color: MUTED,
                  marginTop: 4,
                  fontSize: 14,
                }}
              >
                {periodLabel}
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: 'right',
            }}
          >
            <div
              style={{
                color: MUTED,
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              Transactions
            </div>

            <div
              style={{
                color: TEXT,
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              {totalInvoices}
            </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}

        {summary.length ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              marginBottom: 22,
            }}
          >
            {summary.map(
              (row) => {
                const symbol =
                  currencySymbol(
                    row.currency,
                  );

                return (
                  <div
                    key={
                      row.currency
                    }
                    style={{
                      ...panel,
                      padding: 20,
                    }}
                  >
                    <div
                      style={{
                        display:
                          'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'center',
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: MUTED,
                          fontWeight: 700,
                          textTransform:
                            'uppercase',
                          letterSpacing:
                            '0.04em',
                        }}
                      >
                        {
                          row.currency
                        }
                      </div>

                      <div
                        style={{
                          background:
                            '#f3e7de',
                          color:
                            BRAND_DARK,
                          borderRadius:
                            999,
                          padding:
                            '4px 9px',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {
                          row.invoice_count
                        }{' '}
                        invoices
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 27,
                        fontWeight: 800,
                        color: TEXT,
                        marginBottom: 18,
                      }}
                    >
                      {symbol}{' '}
                      {amount(
                        row.total,
                      )}
                    </div>

                    <div
                      style={{
                        display:
                          'grid',
                        gap: 10,
                      }}
                    >
                      <SummaryLine
                        label="Subtotal"
                        value={`${symbol} ${amount(
                          row.subtotal,
                        )}`}
                      />

                      <SummaryLine
                        label="VAT"
                        value={`${symbol} ${amount(
                          row.vat,
                        )}`}
                      />

                      <SummaryLine
                        label="Shipping"
                        value={`${symbol} ${amount(
                          row.shipping,
                        )}`}
                      />

                      <SummaryLine
                        label="Discount"
                        value={`${symbol} ${amount(
                          row.discount,
                        )}`}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        ) : (
          <div
            style={{
              ...panel,
              padding: 28,
              marginBottom: 20,
              textAlign:
                'center',
              color: MUTED,
            }}
          >
            No invoices found
            for this period.
          </div>
        )}

        {/* YEAR BREAKDOWN */}

        {period ===
          'year' &&
        monthlyBreakdown.length >
          0 ? (
          <div
            style={{
              ...panel,
              marginBottom: 22,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding:
                  '18px 20px',
                borderBottom:
                  `1px solid ${BORDER}`,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: TEXT,
                  fontSize: 17,
                }}
              >
                Monthly Breakdown
              </h3>

              <div
                style={{
                  marginTop: 4,
                  color: MUTED,
                  fontSize: 12,
                }}
              >
                Monthly totals for{' '}
                {year}
              </div>
            </div>

            <div
              style={{
                overflowX:
                  'auto',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse:
                    'collapse',
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={
                        tableHeader
                      }
                    >
                      Month
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Currency
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Invoices
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      Subtotal
                    </th>

                    <th
                      style={
                        tableHeader
                      }
                    >
                      VAT
                    </th>

                    <th
                      style={
                        tableHeader
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
                            tableCell
                          }
                        >
                          {
                            row.month
                          }
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {
                            row.currency
                          }
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {
                            row.invoice_count
                          }
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {amount(
                            row.subtotal,
                          )}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {amount(
                            row.vat,
                          )}
                        </td>

                        <td
                          style={{
                            ...tableCell,
                            fontWeight: 800,
                          }}
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
          </div>
        ) : null}

        {/* TRANSACTIONS */}

        <div
          style={{
            ...panel,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding:
                '18px 20px',
              borderBottom:
                `1px solid ${BORDER}`,
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center',
              gap: 12,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color: TEXT,
                  fontSize: 17,
                }}
              >
                Transactions
              </h3>

              <div
                style={{
                  marginTop: 4,
                  color: MUTED,
                  fontSize: 12,
                }}
              >
                All invoices
                included in this
                report
              </div>
            </div>

            <div
              style={{
                background:
                  '#f3e7de',
                color:
                  BRAND_DARK,
                borderRadius:
                  999,
                padding:
                  '6px 11px',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {
                transactions.length
              }{' '}
              transactions
            </div>
          </div>

          <div
            style={{
              overflowX:
                'auto',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse:
                  'collapse',
                minWidth: 1100,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={
                      tableHeader
                    }
                  >
                    Date
                  </th>

                  <th
                    style={
                      tableHeader
                    }
                  >
                    Company
                  </th>

                  <th
                    style={
                      tableHeader
                    }
                  >
                    Invoice #
                  </th>

                  <th
                    style={
                      tableHeader
                    }
                  >
                    VAT #
                  </th>

                  <th
                    style={
                      tableHeader
                    }
                  >
                    Currency
                  </th>

                  <th
                    style={
                      tableHeader
                    }
                  >
                    Subtotal
                  </th>

                  <th
                    style={
                      tableHeader
                    }
                  >
                    VAT
                  </th>

                  <th
                    style={
                      tableHeader
                    }
                  >
                    Total
                  </th>

                  <th
                    style={
                      tableHeader
                    }
                  >
                    Status
                  </th>

                  <th
                    style={
                      tableHeader
                    }
                  >
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
                          tableCell
                        }
                      >
                        {
                          row.invoice_date
                        }
                      </td>

                      <td
                        style={{
                          ...tableCell,
                          fontWeight: 600,
                        }}
                      >
                        {
                          row.company_name
                        }
                      </td>

                      <td
                        style={
                          tableCell
                        }
                      >
                        {
                          row.invoice_number
                        }
                      </td>

                      <td
                        style={
                          tableCell
                        }
                      >
                        {
                          row.vat_number ||
                          '—'
                        }
                      </td>

                      <td
                        style={
                          tableCell
                        }
                      >
                        {
                          row.currency
                        }
                      </td>

                      <td
                        style={
                          tableCell
                        }
                      >
                        {amount(
                          row
                            .subtotal_excl_vat,
                        )}
                      </td>

                      <td
                        style={
                          tableCell
                        }
                      >
                        {amount(
                          row.vat_amount,
                        )}
                      </td>

                      <td
                        style={{
                          ...tableCell,
                          fontWeight: 800,
                        }}
                      >
                        {amount(
                          row.total_amount,
                        )}
                      </td>

                      <td
                        style={
                          tableCell
                        }
                      >
                        <span
                          style={{
                            display:
                              'inline-block',
                            padding:
                              '4px 8px',
                            borderRadius:
                              999,
                            background:
                              row.status ===
                              'success'
                                ? '#eaf8ef'
                                : '#f4f4f5',
                            color:
                              row.status ===
                              'success'
                                ? '#217a3f'
                                : MUTED,
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {row.status ||
                            '—'}
                        </span>
                      </td>

                      <td
                        style={
                          tableCell
                        }
                      >
                        {row.google_drive_url ? (
                          <a
                            href={
                              row.google_drive_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color:
                                '#2457f5',
                              textDecoration:
                                'none',
                              fontWeight: 700,
                            }}
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

                {!transactions.length ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: 30,
                        textAlign:
                          'center',
                        color:
                          MUTED,
                      }}
                    >
                      No transactions
                      found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent:
          'space-between',
        alignItems:
          'center',
        gap: 10,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: MUTED,
        }}
      >
        {label}
      </span>

      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: TEXT,
        }}
      >
        {value}
      </span>
    </div>
  );
}
