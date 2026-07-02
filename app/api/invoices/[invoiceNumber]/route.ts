import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { callDeleteInvoice } from '@/lib/n8n';

export const runtime = 'nodejs';

type InvoiceDeleteRow = {
  invoice_number: string;
  status: string | null;
};

type DeleteContext = {
  params: Promise<{ invoiceNumber: string }>;
};

async function readConfirm(request: NextRequest) {
  try {
    const body = (await request.json()) as { confirm?: unknown };
    return String(body.confirm || '').trim();
  } catch {
    return '';
  }
}

export async function DELETE(request: NextRequest, context: DeleteContext) {
  try {
    const { invoiceNumber } = await context.params;
    const invoice = decodeURIComponent(String(invoiceNumber || '')).trim();
    const confirm = await readConfirm(request);

    if (!invoice) {
      return NextResponse.json({ error: 'invoice_number is required' }, { status: 400 });
    }

    if (confirm !== invoice) {
      return NextResponse.json({ error: 'Delete confirmation did not match the invoice number.' }, { status: 400 });
    }

    const rows = await query<InvoiceDeleteRow>(
      `
      SELECT invoice_number, status
      FROM invoices
      WHERE invoice_number = $1
      LIMIT 1
      `,
      [invoice],
    );

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (String(row.status || '').toLowerCase() === 'paid') {
      return NextResponse.json({ error: 'Paid invoices cannot be deleted from the CRM.' }, { status: 409 });
    }

    const result = await callDeleteInvoice(invoice);

    return NextResponse.json({
      ok: true,
      invoice_number: invoice,
      result,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Delete failed' }, { status: 500 });
  }
}
