import { Shell } from '../../components/Shell';
import { UploadForm } from './upload-form';

export const dynamic = 'force-dynamic';

export default function TaxUploadPage() {
  const configured = Boolean(
    process.env.N8N_UPLOAD_WEBHOOK_URL,
  );

  return (
    <Shell
      title="Upload Invoice"
      subtitle="Upload an invoice, choose its type, and send it through the AI processing workflow."
      crumb="Upload Invoice"
    >
      <div
        style={{
          maxWidth: 760,
        }}
      >
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Process a new invoice</h2>

              <p
                className="muted"
                style={{
                  marginTop: 6,
                  marginBottom: 0,
                }}
              >
                Select whether the invoice is a Goods Invoice
                or an Expense Invoice before processing.
              </p>
            </div>

            <span className="pill">
              AI Processing
            </span>
          </div>

          <UploadForm />
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>What happens next?</h2>

            <span className="pill">
              Automated
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
            }}
          >
            <div
              style={{
                padding: 16,
                border: '1px solid var(--border, #ddd)',
                borderRadius: 10,
              }}
            >
              <div
                className="strong"
                style={{
                  marginBottom: 6,
                }}
              >
                1. Upload
              </div>

              <div className="muted">
                Upload a PDF, JPG, or PNG invoice.
              </div>
            </div>

            <div
              style={{
                padding: 16,
                border: '1px solid var(--border, #ddd)',
                borderRadius: 10,
              }}
            >
              <div
                className="strong"
                style={{
                  marginBottom: 6,
                }}
              >
                2. AI extraction
              </div>

              <div className="muted">
                n8n extracts company, invoice number, VAT,
                totals, and line items.
              </div>
            </div>

            <div
              style={{
                padding: 16,
                border: '1px solid var(--border, #ddd)',
                borderRadius: 10,
              }}
            >
              <div
                className="strong"
                style={{
                  marginBottom: 6,
                }}
              >
                3. Stored automatically
              </div>

              <div className="muted">
                Goods invoices go to Goods Invoices and
                expenses go to Expense Invoices.
              </div>
            </div>
          </div>
        </div>

        {!configured ? (
          <div className="panel error-panel">
            <div className="panel-head">
              <h2>Upload workflow is not configured</h2>

              <span className="pill">
                Configuration
              </span>
            </div>

            <p className="muted">
              N8N_UPLOAD_WEBHOOK_URL is missing from the
              server environment.
            </p>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
