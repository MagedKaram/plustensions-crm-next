'use client';

import { useState } from 'react';

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function InvoiceActions({ invoiceNumber, status }: { invoiceNumber: string; status?: string | null }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isPaid = String(status || '').toLowerCase() === 'paid';

  if (isPaid) {
    return null;
  }


  async function waitForPaidConfirmation(timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      await sleep(1000);
      const response = await fetch(
        `/api/actions?invoice_number=${encodeURIComponent(invoiceNumber)}`,
        { method: 'GET', credentials: 'include', cache: 'no-store' },
      );

      if (response.status === 401) {
        window.location.assign('/login');
        return false;
      }

      if (!response.ok) continue;
      const state = await response.json();
      if (String(state.status || '').toLowerCase() === 'paid') return true;
    }

    return false;
  }

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
      if (!response.ok && response.status !== 202) {
        if (response.status === 401) {
          window.location.assign('/login');
          return;
        }
        throw new Error(data.error || 'Action failed');
      }

      if (response.status === 202 && data.processing) {
        setMessage(data.message || 'Action is still processing…');

        if (action === 'paid') {
          const paid = await waitForPaidConfirmation();
          if (paid) {
            setMessage('Marked paid');
            window.setTimeout(() => window.location.reload(), 500);
            return;
          }
        }

        setMessage('Still processing. Refreshing…');
        window.setTimeout(() => window.location.reload(), 2500);
        return;
      }

      const successMessage =
        action === 'paid' ? 'Marked paid' : action === 'snooze' ? 'Snoozed for 7 days' : 'Reminder sent';
      setMessage(successMessage);
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed');
    } finally {
      setLoading(null);
    }
  }

  async function deleteInvoice() {
    setLoading('delete');
    setMessage(null);
    try {
      const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceNumber)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: invoiceNumber }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign('/login');
          return;
        }
        throw new Error(data.error || 'Delete failed');
      }
      const driveStatus = data.result?.driveStatus;
      setMessage(
        driveStatus === 'missing' || driveStatus === 'skipped_no_drive_file'
          ? 'Deleted. No Drive file was linked.'
          : 'Deleted',
      );
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setLoading(null);
      setConfirmDelete(false);
    }
  }

  return (
    <div>
      <div className="actions invoice-actions">
        <button className="btn small action-resend" disabled={!!loading} onClick={() => run('resend')}>
          {loading === 'resend' ? 'Sending…' : 'Resend'}
        </button>
        <button className="btn small ghost action-snooze" disabled={!!loading} onClick={() => run('snooze')}>Snooze</button>
        <button className="btn small success action-paid" disabled={!!loading} onClick={() => run('paid')}>Mark paid</button>
        <button className="btn small danger action-delete" disabled={!!loading} onClick={() => setConfirmDelete(true)}>Delete</button>
      </div>
      {message ? <span className="sub">{message}</span> : null}

      {confirmDelete ? (
        <div className="modal-backdrop" role="presentation">
          <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby={`delete-${invoiceNumber}`}>
            <h3 id={`delete-${invoiceNumber}`}>Delete invoice #{invoiceNumber}?</h3>
            <p>
              This will remove the invoice from the CRM database and delete the linked PDF from Google Drive.
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn ghost" disabled={!!loading} onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="btn danger" disabled={!!loading} onClick={deleteInvoice}>
                {loading === 'delete' ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
