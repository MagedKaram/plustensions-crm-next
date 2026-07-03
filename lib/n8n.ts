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
