import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || '/') || '/';

  const expectedUsername = process.env.CRM_USERNAME || 'admin';
  const expectedPassword = process.env.CRM_PASSWORD;

  if (!expectedPassword) {
    return NextResponse.redirect(new URL('/login?error=missing-config', request.url));
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    return NextResponse.redirect(new URL('/login?error=invalid', request.url));
  }

  const redirectTo = next.startsWith('/') ? next : '/';
  const response = NextResponse.redirect(new URL(redirectTo, request.url));

  response.cookies.set('crm_session', 'authenticated', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.CRM_COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return response;
}
