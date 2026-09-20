import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { callReminderAction, type ReminderAction } from '@/lib/n8n';
import { query } from '@/lib/db';

const allowedActions = new Set<ReminderAction>(['resend', 'snooze', 'paid']);
const ACTION_CONFIRM_TIMEOUT_MS = 45000;
const ACTION_CONFIRM_INTERVAL_MS = 750;

type InvoiceActionState = {
  status: string | null;
  reminder_count: number | null;
  last_customer_reminder_at: string | null;
  next_admin_reminder_at: string | null;
};

function asCount(value: number | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function getInvoiceState(invoiceNumber: string) {
  const rows = await query<InvoiceActionState>(
    `SELECT
       status,
       reminder_count,
       last_customer_reminder_at,
       next_admin_reminder_at
     FROM invoices
     WHERE invoice_number = $1
     LIMIT 1`,
    [invoiceNumber],
  );

  return rows[0] || null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function actionCompleted(
  action: ReminderAction,
  before: InvoiceActionState,
  after: InvoiceActionState,
) {
  if (action === 'paid') {
    return String(after.status || '').toLowerCase() === 'paid';
  }

  if (action === 'resend') {
    return (
      asCount(after.reminder_count) > asCount(before.reminder_count) ||
      Boolean(
        after.last_customer_reminder_at &&
          after.last_customer_reminder_at !== before.last_customer_reminder_at,
      )
    );
  }

  if (action === 'snooze') {
    const next = after.next_admin_reminder_at
      ? new Date(after.next_admin_reminder_at).getTime()
      : 0;
    const beforeNext = before.next_admin_reminder_at
      ? new Date(before.next_admin_reminder_at).getTime()
      : 0;

    return Number.isFinite(next) && next > Date.now() && next > beforeNext;
  }

  return false;
}

async function waitForActionResult(
  action: ReminderAction,
  invoiceNumber: string,
  before: InvoiceActionState,
) {
  // n8n can return HTTP 2xx before the workflow finishes its DB update.
  // Poll briefly so the CRM doesn't show a false failure while the action is still running.
  const deadline = Date.now() + ACTION_CONFIRM_TIMEOUT_MS;

  let latest = await getInvoiceState(invoiceNumber);

  while (latest && !actionCompleted(action, before, latest) && Date.now() < deadline) {
    await sleep(ACTION_CONFIRM_INTERVAL_MS);
    latest = await getInvoiceState(invoiceNumber);
  }

  return {
    state: latest,
    completed: Boolean(latest && actionCompleted(action, before, latest)),
  };
}

async function clearTokenIfStillOwned(invoiceNumber: string, actionToken: string) {
  try {
    await query(
      `UPDATE invoices
       SET reminder_action_token = NULL,
           reminder_action_token_expires_at = NULL
       WHERE invoice_number = $1
         AND reminder_action_token = $2`,
      [invoiceNumber, actionToken],
    );
  } catch {
    // Best-effort cleanup only. The token also expires automatically.
  }
}

export async function GET(request: NextRequest) {
  try {
    const invoiceNumber = String(request.nextUrl.searchParams.get('invoice_number') || '').trim();

    if (!invoiceNumber) {
      return NextResponse.json({ error: 'invoice_number is required' }, { status: 400 });
    }

    const state = await getInvoiceState(invoiceNumber);
    if (!state) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      invoice_number: invoiceNumber,
      ...state,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let invoiceNumber = '';
  let actionToken = '';

  try {
    const body = (await request.json()) as { action?: string; invoice_number?: string };
    const actionRaw = String(body.action || '').trim().toLowerCase();
    invoiceNumber = String(body.invoice_number || '').trim();

    if (!allowedActions.has(actionRaw as ReminderAction)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!invoiceNumber) {
      return NextResponse.json({ error: 'invoice_number is required' }, { status: 400 });
    }

    const action = actionRaw as ReminderAction;
    const before = await getInvoiceState(invoiceNumber);

    if (!before) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (String(before.status || '').toLowerCase() !== 'pending') {
      return NextResponse.json(
        { error: `Only pending invoices accept CRM actions (current status: ${before.status || 'unknown'})` },
        { status: 409 },
      );
    }

    // The reminder workflow requires a one-time action token. CRM actions arm their
    // own short-lived token in the same columns used by Telegram buttons.
    // Overwriting an older token deliberately invalidates stale Telegram buttons.
    actionToken = randomBytes(18).toString('base64url');

    let armed: Array<{ invoice_number: string }>;
    try {
      armed = await query<{ invoice_number: string }>(
        `UPDATE invoices
         SET reminder_action_token = $2,
             reminder_action_token_expires_at = now() + interval '5 minutes'
         WHERE invoice_number = $1
           AND lower(COALESCE(status, '')) = 'pending'
         RETURNING invoice_number`,
        [invoiceNumber, actionToken],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/reminder_action_token/i.test(message)) {
        return NextResponse.json(
          {
            error:
              'Reminder action columns are missing. Run/activate the Reminder v2 workflow once so it can create its action schema.',
          },
          { status: 500 },
        );
      }
      throw error;
    }

    if (!armed.length) {
      return NextResponse.json(
        { error: 'Invoice is no longer pending. Refresh the page and try again.' },
        { status: 409 },
      );
    }

    try {
      await callReminderAction(action, invoiceNumber, actionToken);
    } catch (error) {
      await clearTokenIfStillOwned(invoiceNumber, actionToken);
      throw error;
    }

    const confirmation = await waitForActionResult(action, invoiceNumber, before);
    const after = confirmation.state;

    if (!after) {
      return NextResponse.json({ error: 'Invoice disappeared after action execution' }, { status: 502 });
    }

    // n8n acknowledges the webhook before every downstream node has necessarily
    // completed. If the expected DB change is not visible yet, report PROCESSING
    // instead of a false failure. The UI will keep checking the invoice state.
    if (!confirmation.completed) {
      const actionLabel =
        action === 'paid' ? 'Mark paid' : action === 'snooze' ? 'Snooze' : 'Resend';

      return NextResponse.json(
        {
          ok: false,
          processing: true,
          action,
          invoice_number: invoiceNumber,
          current_status: after.status,
          message: `${actionLabel} is still processing. The CRM will keep checking automatically.`,
        },
        { status: 202 },
      );
    }

    // Do not trust a generic HTTP 2xx from n8n alone. Verify the expected DB state.
    if (action === 'paid' && String(after.status || '').toLowerCase() !== 'paid') {
      return NextResponse.json(
        { error: 'Mark paid did not complete. The invoice is still pending.' },
        { status: 502 },
      );
    }

    if (action === 'resend') {
      const reminderAdvanced =
        asCount(after.reminder_count) > asCount(before.reminder_count) ||
        (after.last_customer_reminder_at &&
          after.last_customer_reminder_at !== before.last_customer_reminder_at);

      if (!reminderAdvanced) {
        return NextResponse.json(
          {
            error:
              'Reminder was not recorded as sent. Check the n8n execution / Telegram error message before retrying.',
          },
          { status: 502 },
        );
      }
    }

    if (action === 'snooze') {
      const next = after.next_admin_reminder_at ? new Date(after.next_admin_reminder_at).getTime() : 0;
      if (!Number.isFinite(next) || next <= Date.now()) {
        return NextResponse.json(
          { error: 'Snooze did not complete. next_admin_reminder_at was not moved forward.' },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({ ok: true, action, invoice_number: invoiceNumber });
  } catch (error) {
    if (invoiceNumber && actionToken) {
      await clearTokenIfStillOwned(invoiceNumber, actionToken);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
