import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Shell } from '../../components/Shell';

import {
  getBankInvoice,
  parseLineItems,
  money,
  type BankInvoice,
} from '@/lib/bank';

import { saveBankInvoice } from './actions';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

function val(invoice: BankInvoice, key: string) {
  const v = invoice[key];

  if (v === null || v === undefined || v === '') return '—';
  if (v instanceof Date) return v.toISOString().slice(0, 10);

  return String(v);
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
      <Shell title="Bank invoice" crumb="Bank invoice">
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

  const lineItems = parseLineItems(invoice.line_items);
  const status = String(invoice.status || 'success');
  const badge = status === 'duplicate' ? 'badge duplicate' : `badge ${status}`;
  const save = saveBankInvoice.bind(null, numericId);

  const actions = (
    <>
      <Link className="btn ghost" href="/bank">
        Back to invoices
      </Link>

      {invoice.google_drive_url ? (
        <a
          className="btn"
          href={String(invoice.google_drive_url)}
          target="_blank"
          rel="noopener"
        >
          Open in Drive
        </a>
      ) : null}
    </>
  );

  return (
    <Shell
      title={String(invoice.company_name || 'Bank invoice')}
      subtitle={`${val(invoice, 'invoice_date')} · ${val(invoice, 'invoice_number')}`}
      crumb="Bank invoice"
      actions={actions}
    >
      <section className="kpis">
        <div className="kpi">
          <div className="kpi-label">Subtotal</div>
          <div className="kpi-value">{money(invoice.subtotal_excl_vat)}</div>
          <div className="kpi-hint">Excl. VAT</div>
        </div>

        <div className="kpi">
          <div className="kpi-label">Shipping</div>
          <div className="kpi-value">{money(invoice.shipping_amount)}</div>
        </div>

        <div className="kpi">
          <div className="kpi-label">Discount</div>
          <div className="kpi-value">{money(invoice.discount_amount)}</div>
        </div>

        <div className="kpi is-warn">
          <div className="kpi-label">VAT</div>
          <div className="kpi-value">{money(invoice.vat_amount)}</div>
          <div className="kpi-hint">{val(invoice, 'vat_rate')}</div>
        </div>

        <div className="kpi is-primary">
          <div className="kpi-label">Total</div>
          <div className="kpi-value">{money(invoice.total_amount)}</div>
          <div className="kpi-hint">Incl. VAT</div>
        </div>
      </section>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>Invoice details</h2>
            <span className={badge}>{status}</span>
          </div>

          <div className="table-wrap">
            <table>
              <tbody>
                <tr>
                  <td className="muted">Company</td>
                  <td className="strong">{val(invoice, 'company_name')}</td>
                </tr>

                <tr>
                  <td className="muted">Invoice number</td>
                  <td className="mono">{val(invoice, 'invoice_number')}</td>
                </tr>

                <tr>
                  <td className="muted">Invoice date</td>
                  <td className="mono">{val(invoice, 'invoice_date')}</td>
                </tr>

                <tr>
                  <td className="muted">VAT number</td>
                  <td className="mono">{val(invoice, 'vat_number')}</td>
                </tr>

                <tr>
                  <td className="muted">Currency</td>
                  <td>{val(invoice, 'currency')}</td>
                </tr>

                <tr>
                  <td className="muted">Payment method</td>
                  <td>{val(invoice, 'payment_method')}</td>
                </tr>

                <tr>
                  <td className="muted">IBAN</td>
                  <td className="mono">{val(invoice, 'iban')}</td>
                </tr>

                <tr>
                  <td className="muted">Payment reference</td>
                  <td className="mono">{val(invoice, 'payment_reference')}</td>
                </tr>

                <tr>
                  <td className="muted">Processed file</td>
                  <td className="mono" style={{ wordBreak: 'break-all' }}>
                    {val(invoice, 'processed_file_name')}
                  </td>
                </tr>

                <tr>
                  <td className="muted">Source file</td>
                  <td className="mono" style={{ wordBreak: 'break-all' }}>
                    {val(invoice, 'source_file_name')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Review &amp; notes</h2>
            <span className="pill">Manual edit</span>
          </div>

          <form action={save}>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={status}>
                <option value="success">Success</option>
                <option value="manual_review">Manual review</option>
                <option value="duplicate">Duplicate</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                placeholder="Internal notes about this bank invoice"
                defaultValue={String(invoice.notes || '')}
              />
            </div>

            <div className="field">
              <label htmlFor="review_reason">Review reason</label>
              <textarea
                id="review_reason"
                name="review_reason"
                placeholder="Why was this flagged for review?"
                defaultValue={String(invoice.review_reason || '')}
              />
            </div>

            <button className="btn" type="submit">
              Save changes
            </button>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Line items</h2>
          <span className="pill">{lineItems.length} row(s)</span>
        </div>

        {lineItems.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Description</th>
                  <th className="num">Qty</th>
                  <th className="num">Unit price</th>
                  <th className="num">Net</th>
                  <th>VAT rate</th>
                  <th className="num">VAT</th>
                  <th className="num">Total</th>
                </tr>
              </thead>

              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="num mono">{item.item_order}</td>
                    <td className="strong">{item.description}</td>
                    <td className="num">{item.quantity}</td>
                    <td className="money muted">{item.unit_price}</td>
                    <td className="money muted">{item.net_amount}</td>
                    <td>{item.vat_rate}</td>
                    <td className="money muted">{item.vat_amount}</td>
                    <td className="money">{item.gross_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <strong>No line items extracted</strong>
            This bank invoice was stored without itemised lines.
          </div>
        )}
      </div>
    </Shell>
  );
}
