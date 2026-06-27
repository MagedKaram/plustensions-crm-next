import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedRequest, sessionCookieName } from '@/lib/session';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    authenticated: isAuthenticatedRequest(request),
    hasCookie: Boolean(request.cookies.get(sessionCookieName)?.value || request.cookies.get('crm_session')?.value),
    hasTokenCookie: Boolean(request.cookies.get(sessionCookieName)?.value),
  });
}
