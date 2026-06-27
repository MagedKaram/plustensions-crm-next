import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, cookieOptions, getSecret } from '@/lib/session';

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string; next?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const next = String(body.next || '/') || '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  const expectedUsername = process.env.CRM_USERNAME || 'admin';
  const expectedPassword = process.env.CRM_PASSWORD;
  const secret = getSecret();

  if (!expectedPassword || !secret) {
    return NextResponse.json(
      { error: 'Server auth is not configured (CRM_PASSWORD / CRM_AUTH_TOKEN).' },
      { status: 500 },
    );
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, next: safeNext });
  response.cookies.set(SESSION_COOKIE, secret, cookieOptions());
  return response;
}
