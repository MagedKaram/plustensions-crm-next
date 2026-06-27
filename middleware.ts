import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const sessionSecret = process.env.CRM_TOKEN || process.env.CRM_PASSWORD;

  if (!sessionSecret || path.startsWith('/login')) {
    return NextResponse.next();
  }

  const session = request.cookies.get('crm_session')?.value;
  if (session === sessionSecret) {
    return NextResponse.next();
  }

  if (path.startsWith('/api')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
