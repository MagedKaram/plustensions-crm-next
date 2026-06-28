import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Shell } from '../../components/Shell';

import {
  getBankInvoice,
  money,
  fmtDate,
  type BankInvoice,
} from '@/lib/bank';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

function val(invoice: BankInvoice, key: string) {
  const value = invoice[key];

  if (value === null || value === undefined || value === '') return '—';

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value);
}

function isMoneyField(key: string) {
  return /amount|total|subtotal|vat|tax|price|balance|paid/i.test(key);
}

function isDateField(key: string) {
  return /date|created_at|updated_at|processed_at|paid_at/i.test(key);
}

function niceLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderValue(invoice: BankInvoice, key: string) {
  const value = invoice[key];

  if (value === null || value === undefined || value === '') {
    return <span className="muted">—</span>;
  }

  if (isMoneyField(key)) {
    return money(value);
  }

  if (isDateField(key)) {
    return fmtDate(value);
  }

  const text = String(value);

  if (/^https?:\/\//i.test(text)) {
    return (
      <a href={text} target="_blank" rel="noopener noreferrer">
        Open
      </a>
    );
  }

  return text;
}

export default async function BankInvoiceDetail({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const numericId = Number(id);

  let invoice: BankInvoice | null = null;
  let error: string | null = null;

  try {
    invoice = await getBankInvoice(numericId);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown database error';
  }

  if (error) {
    return (
      <Shell
        title="Bank invoice"
        subtitle="Could not load invoice details."
        crumb="Bank invoice"
      >
        <div className="panel error-panel">
          <div className="panel-head">
            <h2>Bank invoice could not be loaded</h2>
            <span className="pill">Database</span>
          </div>

          <div className="msg">{error}</div>
        </div>
      </Shell>
    );
  }

  if (!invoice) notFound();

  const status = String(invoice.status || 'success');
  const badge =
    invoice.is_duplicate || status === 'duplicate'
      ? 'badge duplicate'
      : `badge ${status}`;

  const actions = (
    <>
      <Link className="btn secondary" href="/bank">
        Back to bank invoices
      </Link>

      {invoice.google_drive_url ? (
        <a
          className="btn"
          href={String(invoice.google_drive_url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Drive
        </a>
      ) : null}
    </>
  );

  const fields = Object.keys(invoice).filter(
    (key) => !['id'].includes(key),
  );

  return (
    <Shell
      title={`Bank invoice ${val(invoice, 'invoice_number')}`}
      subtitle={`${val(invoice, 'company_name')} · ${fmtDate(invoice.invoice_date)}`}
      crumb="Bank invoice details"
      actions={actions}
    >
      <section className="kpis">
        <div className="kpi">
          <div className="kpi-label">Subtotal</div>
          <div className="kpi-value">{money(invoice.subtotal_excl_vat)}</div>
          <div className="kpi-hint">Excl. VAT</div>
        </div>

        <div className="kpi">
          <div className="kpi-label">VAT</div>
          <div className="kpi-value">{money(invoice.vat_amount)}</div>
          <div className="kpi-hint">Tax amount</div>
        </div>

        <div className="kpi is-primary">
          <div className="kpi-label">Total</div>
          <div className="kpi-value">{money(invoice.total_amount)}</div>
          <div className="kpi-hint">Incl. VAT</div>
        </div>

        <div className="kpi is-success">
          <div className="kpi-label">Status</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>
            <span className={badge}>{status}</span>
          </div>
          <div className="kpi-hint">Bank invoice status</div>
        </div>
      </section>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>Invoice details</h2>
            <span className="pill">Summary</span>
          </div>

          <div className="details">
            <div>
              <span>Company</span>
              <strong>{val(invoice, 'company_name')}</strong>
            </div>

            <div>
              <span>Invoice number</span>
              <strong>{val(invoice, 'invoice_number')}</strong>
            </div>

            <div>
              <span>Invoice date</span>
              <strong>{fmtDate(invoice.invoice_date)}</strong>
            </div>

            <div>
              <span>VAT number</span>
              <strong>{val(invoice, 'vat_number')}</strong>
            </div>

            <div>
              <span>Currency</span>
              <strong>{val(invoice, 'currency')}</strong>
            </div>

            <div>
              <span>IBAN</span>
              <strong>{val(invoice, 'iban')}</strong>
            </div>

            <div>
              <span>Payment reference</span>
              <strong>{val(invoice, 'payment_reference')}</strong>
            </div>

            <div>
              <span>Processed file</span>
              <strong>{val(invoice, 'processed_file_name')}</strong>
            </div>

            <div>
              <span>Source file</span>
              <strong>{val(invoice, 'source_file_name')}</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>File</h2>
            <span className="pill">Drive</span>
          </div>

          {invoice.google_drive_url ? (
            <div className="empty">
              <strong>Invoice file is available</strong>
              <a
                className="btn"
                href={String(invoice.google_drive_url)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: 14 }}
              >
                Open invoice in Drive
              </a>
            </div>
          ) : (
            <div className="empty">
              <strong>No Drive file found</strong>
              This record does not have a Google Drive URL.
            </div>
          )}
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>All stored fields</h2>
          <span className="pill">{fields.length} field(s)</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Value</th>
              </tr>
            </thead>

            <tbody>
              {fields.map((key) => (
                <tr key={key}>
                  <td className="strong">{niceLabel(key)}</td>
                  <td>{renderValue(invoice, key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
