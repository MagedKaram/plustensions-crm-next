import { NextRequest, NextResponse } from 'next/server';
import { getBearerToken, isValidSessionToken, sessionCookieName } from '@/lib/session';

export async function POST(request: NextRequest) {
  const token = getBearerToken(request.headers.get('authorization')) || request.headers.get('x-crm-token') || '';

  if (!isValidSessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(sessionCookieName, token, {
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
