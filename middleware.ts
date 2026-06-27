import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticatedRequest } from '@/lib/session';

function firstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() || '';
}

function publicUrl(request: NextRequest, path: string) {
  const configuredOrigin = process.env.CRM_PUBLIC_URL?.replace(/\/+$/, '');
  if (configuredOrigin) {
    return new URL(path, configuredOrigin);
  }

  const forwardedHost = firstHeaderValue(request.headers.get('x-forwarded-host'));
  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto'));
  const host = forwardedHost || request.headers.get('host') || request.nextUrl.host;
  const isLocalHost = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.endsWith(':3000');
  const proto = forwardedProto || (isLocalHost ? request.nextUrl.protocol.replace(':', '') : 'https');

  return new URL(path, `${proto}://${host}`);
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    path.startsWith('/login') ||
    path.startsWith('/api/login') ||
    path.startsWith('/api/session') ||
    path.startsWith('/api/health') ||
    path.startsWith('/logout')
  ) {
    return NextResponse.next();
  }

  if (isAuthenticatedRequest(request)) {
    return NextResponse.next();
  }

  if (path.startsWith('/api')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = publicUrl(request, '/login');
  loginUrl.searchParams.set('next', path);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
