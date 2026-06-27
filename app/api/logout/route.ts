import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session';

function clear(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.CRM_COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 0,
  });
  return response;
}

// Logout is a POST so a background <Link> prefetch (always GET) can never trigger it.
export async function POST(request: NextRequest) {
  return clear(NextResponse.redirect(new URL('/login', request.url), 303));
}
