import { NextRequest, NextResponse } from 'next/server';
import { isUnauthorized, requireCrmToken } from '@/lib/auth';
import { callReminderAction } from '@/lib/n8n';

const allowedActions = new Set(['resend', 'snooze', 'paid']);

export async function POST(request: NextRequest) {
  try {
    requireCrmToken(request);

    const body = (await request.json()) as { action?: string; invoice_number?: string };
    const action = String(body.action || '').trim();
    const invoiceNumber = String(body.invoice_number || '').trim();

    if (!allowedActions.has(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!invoiceNumber) {
      return NextResponse.json({ error: 'invoice_number is required' }, { status: 400 });
    }

    await callReminderAction(action, invoiceNumber);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isUnauthorized(error)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
