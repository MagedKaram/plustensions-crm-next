'use client';

import { useState } from 'react';

export function InvoiceActions({ invoiceNumber }: { invoiceNumber: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: 'resend' | 'snooze' | 'paid') {
    setLoading(action);
    setMessage(null);
    try {
      const response = await fetch('/api/actions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, invoice_number: invoiceNumber }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign('/login');
          return;
        }
        throw new Error(data.error || 'Action failed');
      }
      setMessage('Done');
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="actions">
        <button className="btn small" disabled={!!loading} onClick={() => run('resend')}>
          {loading === 'resend' ? 'Sending…' : 'Resend'}
        </button>
        <button className="btn small ghost" disabled={!!loading} onClick={() => run('snooze')}>Snooze</button>
        <button className="btn small success" disabled={!!loading} onClick={() => run('paid')}>Paid</button>
      </div>
      {message ? <span className="sub">{message}</span> : null}
    </div>
  );
}
