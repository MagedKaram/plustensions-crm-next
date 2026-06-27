'use client';

import { FormEvent, useState } from 'react';

export function UploadForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [fileName, setFileName] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!(data.get('invoice') as File)?.name) {
      setMessage({ ok: false, text: 'Choose a PDF or image first.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/tax/upload', { method: 'POST', body: data, credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setMessage({ ok: true, text: 'Invoice sent to n8n. It will be processed shortly.' });
      form.reset();
      setFileName('');
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {message ? (
        <div className={message.ok ? 'flash' : 'login-error'} style={{ marginBottom: 16 }}>{message.text}</div>
      ) : null}
      <label className="dropzone" htmlFor="invoice-file">
        <svg className="dz-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
        <div className="strong">{fileName || 'Drop a file here or browse'}</div>
        <div className="muted">Accepted: PDF, PNG, JPG</div>
        <input id="invoice-file" type="file" name="invoice" accept=".pdf,image/*" required onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
      </label>
      <div className="field" style={{ marginTop: 16 }}>
        <label htmlFor="notes">Notes (optional)</label>
        <input id="notes" type="text" name="notes" placeholder="Anything the reviewer should know" />
      </div>
      <button className="btn" type="submit" disabled={loading}>{loading ? 'Uploading…' : 'Upload invoice'}</button>
    </form>
  );
}
