import { NextRequest, NextResponse } from 'next/server';
import { getPublicUrl } from '@/lib/public-url';

function redirectTo(request: NextRequest, location: string) {
  return NextResponse.redirect(getPublicUrl(request, location), 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || '/') || '/';

  const expectedUsername = process.env.CRM_USERNAME || 'admin';
  const expectedPassword = process.env.CRM_PASSWORD;

  if (!expectedPassword) {
    return redirectTo(request, '/login?error=missing-config');
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    return redirectTo(request, '/login?error=invalid');
  }

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const response = redirectTo(request, safeNext);

  response.cookies.set('crm_session', 'authenticated', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.CRM_COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return response;
}
