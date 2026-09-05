import type {
  QueryResultRow,
} from 'pg';

import {
  TAX_TABLE,
  taxQuery,
} from './tax';

import {
  BANK_TABLE,
  bankQuery,
} from './bank';

export type ReportKind =
  | 'goods'
  | 'expenses';

export type ReportPeriod =
  | 'month'
  | 'year';

export type ReportTransaction =
  QueryResultRow & {
    processed_at: string;
    category: string;
    company_name: string;
    invoice_number: string;
    invoice_date: string;
    vat_number: string;
    currency: string;

    subtotal_excl_vat:
      | string
      | null;

    shipping_amount:
      | string
      | null;

    discount_amount:
      | string
      | null;

    vat_rate:
      | string
      | null;

    vat_amount:
      | string
      | null;

    total_amount:
      | string
      | null;

    payment_method:
      | string
      | null;

    iban:
      | string
      | null;

    payment_reference:
      | string
      | null;

    line_items: unknown;

    google_drive_url:
      | string
      | null;

    processed_file_name:
      | string
      | null;

    status:
      | string
      | null;

    notes:
      | string
      | null;
  };

export type ReportSummary =
  QueryResultRow & {
    currency: string;
    invoice_count: string;
    subtotal: string;
    shipping: string;
    discount: string;
    vat: string;
    total: string;
  };

export type MonthlyBreakdown =
  QueryResultRow & {
    month: string;
    currency: string;
    invoice_count: string;
    subtotal: string;
    vat: string;
    total: string;
  };

type YearRow =
  QueryResultRow & {
    year: number;
  };

type LatestDateRow =
  QueryResultRow & {
    latest_date:
      | string
      | null;
  };

function tableFor(
  kind: ReportKind,
) {
  return kind === 'goods'
    ? TAX_TABLE
    : BANK_TABLE;
}

async function runQuery<
  T extends QueryResultRow,
>(
  kind: ReportKind,
  sql: string,
  params: unknown[] = [],
) {
  if (kind === 'goods') {
    return taxQuery<T>(
      sql,
      params,
    );
  }

  return bankQuery<T>(
    sql,
    params,
  );
}

function getRange(
  period: ReportPeriod,
  year: number,
  month: number,
) {
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2200
  ) {
    throw new Error(
      'Invalid report year',
    );
  }

  if (period === 'year') {
    return {
      from: `${year}-01-01`,
      to: `${year + 1}-01-01`,
    };
  }

  if (
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      'Invalid report month',
    );
  }

  const nextYear =
    month === 12
      ? year + 1
      : year;

  const nextMonth =
    month === 12
      ? 1
      : month + 1;

  return {
    from:
      `${year}-${String(
        month,
      ).padStart(2, '0')}-01`,

    to:
      `${nextYear}-${String(
        nextMonth,
      ).padStart(2, '0')}-01`,
  };
}

export async function
getAvailableReportYears(
  kind: ReportKind,
) {
  const table =
    tableFor(kind);

  const rows =
    await runQuery<YearRow>(
      kind,
      `
      SELECT DISTINCT
        EXTRACT(
          YEAR FROM invoice_date
        )::int AS year
      FROM ${table}
      WHERE invoice_date IS NOT NULL
      ORDER BY year DESC
      `,
    );

  return rows.map(
    (row) =>
      Number(row.year),
  );
}

export async function
getLatestReportDate(
  kind: ReportKind,
) {
  const table =
    tableFor(kind);

  const rows =
    await runQuery<LatestDateRow>(
      kind,
      `
      SELECT
        MAX(invoice_date)::text
          AS latest_date
      FROM ${table}
      `,
    );

  return (
    rows[0]?.latest_date ||
    null
  );
}

export async function
getAccountingReport(
  kind: ReportKind,
  period: ReportPeriod,
  year: number,
  month: number,
) {
  const table =
    tableFor(kind);

  const range =
    getRange(
      period,
      year,
      month,
    );

  const params = [
    range.from,
    range.to,
  ];

  const transactions =
    await runQuery<ReportTransaction>(
      kind,
      `
      SELECT
        processed_at::text
          AS processed_at,

        COALESCE(
          category,
          ''
        ) AS category,

        COALESCE(
          company_name,
          ''
        ) AS company_name,

        COALESCE(
          invoice_number,
          ''
        ) AS invoice_number,

        invoice_date::text
          AS invoice_date,

        COALESCE(
          vat_number,
          ''
        ) AS vat_number,

        COALESCE(
          currency,
          'EUR'
        ) AS currency,

        subtotal_excl_vat,
        shipping_amount,
        discount_amount,
        vat_rate,
        vat_amount,
        total_amount,
        payment_method,
        iban,
        payment_reference,
        line_items,
        google_drive_url,
        processed_file_name,
        status,
        notes

      FROM ${table}

      WHERE
        invoice_date >=
          $1::date

        AND invoice_date <
          $2::date

      ORDER BY
        invoice_date ASC,
        processed_at ASC
      `,
      params,
    );

  const summary =
    await runQuery<ReportSummary>(
      kind,
      `
      SELECT
        COALESCE(
          currency,
          'EUR'
        ) AS currency,

        COUNT(*)::text
          AS invoice_count,

        COALESCE(
          SUM(
            subtotal_excl_vat
          ),
          0
        )::text AS subtotal,

        COALESCE(
          SUM(
            shipping_amount
          ),
          0
        )::text AS shipping,

        COALESCE(
          SUM(
            discount_amount
          ),
          0
        )::text AS discount,

        COALESCE(
          SUM(
            vat_amount
          ),
          0
        )::text AS vat,

        COALESCE(
          SUM(
            total_amount
          ),
          0
        )::text AS total

      FROM ${table}

      WHERE
        invoice_date >=
          $1::date

        AND invoice_date <
          $2::date

      GROUP BY
        COALESCE(
          currency,
          'EUR'
        )

      ORDER BY currency
      `,
      params,
    );

  let monthlyBreakdown:
    MonthlyBreakdown[] = [];

  if (
    period === 'year'
  ) {
    monthlyBreakdown =
      await runQuery<MonthlyBreakdown>(
        kind,
        `
        SELECT
          to_char(
            date_trunc(
              'month',
              invoice_date
            ),
            'YYYY-MM'
          ) AS month,

          COALESCE(
            currency,
            'EUR'
          ) AS currency,

          COUNT(*)::text
            AS invoice_count,

          COALESCE(
            SUM(
              subtotal_excl_vat
            ),
            0
          )::text AS subtotal,

          COALESCE(
            SUM(
              vat_amount
            ),
            0
          )::text AS vat,

          COALESCE(
            SUM(
              total_amount
            ),
            0
          )::text AS total

        FROM ${table}

        WHERE
          invoice_date >=
            $1::date

          AND invoice_date <
            $2::date

        GROUP BY
          1,
          2

        ORDER BY
          1,
          2
        `,
        params,
      );
  }

  return {
    transactions,
    summary,
    monthlyBreakdown,
  };
}
