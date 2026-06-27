import { NextRequest, NextResponse } from 'next/server';
import { getPublicUrl } from '@/lib/public-url';
import { sessionCookieName } from '@/lib/session';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(getPublicUrl(request, '/login?logout=1'), 303);

  response.cookies.set(sessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.CRM_COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('crm_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.CRM_COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 0,
  });

  return response;
}
