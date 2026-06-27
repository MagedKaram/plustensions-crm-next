import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith('/login') || path.startsWith('/api/login')) {
    return NextResponse.next();
  }

  const session = request.cookies.get('crm_session')?.value;
  if (session === 'authenticated') {
    return NextResponse.next();
  }

  if (path.startsWith('/api')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const next = encodeURIComponent(path);
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: `/login?next=${next}`,
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
