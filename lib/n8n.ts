const webhookPath = '/webhook/invoice-reminder-action';

export async function callReminderAction(action: string, invoiceNumber: string) {
  const baseUrl = process.env.N8N_BASE_URL?.replace(/\/+$/, '');
  const secret = process.env.REMINDER_WEBHOOK_SECRET;

  if (!baseUrl || !secret) {
    throw new Error('N8N_BASE_URL and REMINDER_WEBHOOK_SECRET are required');
  }

  const url = new URL(baseUrl + webhookPath);
  url.searchParams.set('action', action);
  url.searchParams.set('invoice_number', invoiceNumber);
  url.searchParams.set('token', secret);

  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`n8n action failed: ${response.status} ${body.slice(0, 300)}`);
  }

  return { ok: true };
}

export async function callDeleteInvoice(invoiceNumber: string) {
  const directUrl = process.env.N8N_DELETE_INVOICE_WEBHOOK_URL;
  const baseUrl = process.env.N8N_BASE_URL?.replace(/\/+$/, '');
  const token = process.env.N8N_WEBHOOK_TOKEN || process.env.REMINDER_WEBHOOK_SECRET;
  const url = directUrl || (baseUrl ? `${baseUrl}/webhook/crm-delete-invoice` : '');

  if (!url || !token) {
    throw new Error('N8N_DELETE_INVOICE_WEBHOOK_URL or N8N_BASE_URL, plus N8N_WEBHOOK_TOKEN, are required');
  }

  const response = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-CRM-Token': token,
    },
    body: JSON.stringify({
      invoice_number: invoiceNumber,
      confirm: invoiceNumber,
    }),
  });

  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const detail = typeof data === 'object' && data && 'error' in data ? String(data.error) : text;
    throw new Error(`n8n delete failed: ${response.status} ${detail.slice(0, 300)}`);
  }

  return data || { ok: true };
}
