'use client';

import { useState } from 'react';

type Props = {
  invoiceNumber: string;
};

export function InvoiceActions({ invoiceNumber }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: 'resend' | 'snooze' | 'paid') {
    setLoading(action);
    setMessage(null);

    try {
      const token = window.localStorage.getItem('crm_token');
      const response = await fetch('/api/actions', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action, invoice_number: invoiceNumber }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          window.localStorage.removeItem('crm_token');
          window.location.replace('/login');
          return;
        }

        throw new Error(data.error || 'Action failed');
      }

      setMessage('Done');
      window.setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <div className="actions">
        <button className="btn primary" disabled={!!loading} onClick={() => run('resend')}>
          {loading === 'resend' ? 'Sending...' : 'Resend'}
        </button>
        <button className="btn" disabled={!!loading} onClick={() => run('snooze')}>
          Snooze
        </button>
        <button className="btn success" disabled={!!loading} onClick={() => run('paid')}>
          Paid
        </button>
      </div>
      {message ? <span className="sub">{message}</span> : null}
    </div>
  );
}
