const webhookPath = '/webhook/invoice-reminder-action';

export type ReminderAction = 'resend' | 'snooze' | 'paid';

export async function callReminderAction(
  action: ReminderAction,
  invoiceNumber: string,
  actionToken: string,
) {
  const baseUrl = process.env.N8N_BASE_URL?.replace(/\/+$/, '');
  const secret = process.env.REMINDER_WEBHOOK_SECRET?.trim();

  if (!baseUrl || !secret) {
    throw new Error('N8N_BASE_URL and REMINDER_WEBHOOK_SECRET are required');
  }

  if (secret.length < 16) {
    throw new Error('REMINDER_WEBHOOK_SECRET must be at least 16 characters');
  }

  if (!actionToken) {
    throw new Error('Reminder action token is required');
  }

  const response = await fetch(baseUrl + webhookPath, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Reminder-Secret': secret,
    },
    body: JSON.stringify({
      action,
      invoice_number: invoiceNumber,
      action_token: actionToken,
      callback_chat_id: null,
      callback_from_user_id: null,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`n8n action failed: ${response.status} ${text.slice(0, 300)}`);
  }

  return { ok: true, response: text || null };
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
