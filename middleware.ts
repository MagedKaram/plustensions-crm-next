import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/session';

const PUBLIC = ['/login', '/api/login', '/api/logout', '/api/health'];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (PUBLIC.some((p) => path === p || path.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  if (isAuthenticated(request)) {
    return NextResponse.next();
  }

  if (path.startsWith('/api')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  if (path && path !== '/') loginUrl.searchParams.set('next', path);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
