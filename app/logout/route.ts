import { NextResponse } from 'next/server';

export async function GET() {
  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: '/login',
    },
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
