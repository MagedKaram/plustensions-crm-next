import { Shell } from '../../components/Shell';
import { UploadForm } from './upload-form';

export const dynamic = 'force-dynamic';

export default function TaxUploadPage() {
  const configured = Boolean(process.env.N8N_UPLOAD_WEBHOOK_URL);
  const target = process.env.N8N_UPLOAD_WEBHOOK_URL || 'Not configured (set N8N_UPLOAD_WEBHOOK_URL)';

  return (
    <Shell title="Upload invoice" subtitle="Send a supplier invoice into the n8n processing pipeline." crumb="Upload invoice">
      <div style={{ maxWidth: 680 }}>
        <div className="panel">
          <div className="panel-head"><h2>Send an invoice to processing</h2><span className="pill">PDF or image</span></div>
          <UploadForm />
        </div>
        <div className="panel">
          <div className="panel-head"><h2>Where it goes</h2><span className="pill">n8n webhook</span></div>
          <p className="muted" style={{ marginTop: 0 }}>Files are forwarded server-side to the n8n intake workflow, which extracts the data and writes it to Postgres.{configured ? '' : ' Configure the webhook to enable uploads.'}</p>
          <div className="code-line">{target}</div>
        </div>
      </div>
    </Shell>
  );
}
