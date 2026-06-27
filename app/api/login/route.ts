import { NextRequest, NextResponse } from 'next/server';
import { getPublicUrl } from '@/lib/public-url';
import { getSessionToken, sessionCookieName } from '@/lib/session';

function redirectTo(request: NextRequest, location: string) {
  return NextResponse.redirect(getPublicUrl(request, location), 303);
}

function wantsJson(request: NextRequest) {
  return request.headers.get('content-type')?.includes('application/json') || request.headers.get('accept')?.includes('application/json');
}

export async function POST(request: NextRequest) {
  const json = wantsJson(request);
  const body = json ? await request.json() : Object.fromEntries((await request.formData()).entries());
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  const next = String(body.next || '/') || '/';

  const expectedUsername = process.env.CRM_USERNAME || 'admin';
  const expectedPassword = process.env.CRM_PASSWORD;
  const sessionToken = getSessionToken();

  if (!expectedPassword) {
    if (json) {
      return NextResponse.json({ error: 'CRM_PASSWORD is missing in Coolify environment variables.' }, { status: 500 });
    }
    return redirectTo(request, '/login?error=missing-config');
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    if (json) {
      return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
    }
    return redirectTo(request, '/login?error=invalid');
  }

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const response = json ? NextResponse.json({ ok: true, token: sessionToken, next: safeNext }) : redirectTo(request, safeNext);

  response.cookies.set(sessionCookieName, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.CRM_COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  response.cookies.set('crm_session', 'authenticated', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.CRM_COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return response;
}
