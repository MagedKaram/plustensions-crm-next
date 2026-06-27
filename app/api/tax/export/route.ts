import { NextResponse } from 'next/server';
import { EXPORT_COLUMNS, getTaxExportRows } from '@/lib/tax';

function cell(value: unknown) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  try {
    const rows = await getTaxExportRows();
    const lines = [EXPORT_COLUMNS.join(',')];
    for (const row of rows) {
      lines.push(EXPORT_COLUMNS.map((c) => cell(row[c])).join(','));
    }
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename=tax_invoice_records.csv',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Export failed' }, { status: 500 });
  }
}
