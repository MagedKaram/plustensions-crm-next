import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url), 303);

  response.cookies.set('crm_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.CRM_COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 0,
  });

  return response;
}
