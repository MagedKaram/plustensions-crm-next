import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const webhook = process.env.N8N_UPLOAD_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json({ error: 'Upload is not configured: set N8N_UPLOAD_WEBHOOK_URL.' }, { status: 500 });
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
  }

  const file = incoming.get('invoice');
  if (!(file instanceof File) || !file.name) {
    return NextResponse.json({ error: 'Choose a PDF or image first.' }, { status: 400 });
  }

  const forward = new FormData();
  forward.append('invoice', file, file.name);
  forward.append('notes', String(incoming.get('notes') || ''));

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      body: forward,
      headers: { 'X-CRM-Token': process.env.N8N_WEBHOOK_TOKEN || '' },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `n8n rejected the upload: ${res.status} ${text.slice(0, 300)}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 502 });
  }
}
