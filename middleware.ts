import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const username = process.env.CRM_USERNAME;
  const password = process.env.CRM_PASSWORD;

  if (!username || !password) {
    return NextResponse.next();
  }

  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Basic ')) {
    try {
      const decoded = atob(authorization.slice(6));
      const separator = decoded.indexOf(':');
      const user = decoded.slice(0, separator);
      const pass = decoded.slice(separator + 1);

      if (user === username && pass === password) {
        return NextResponse.next();
      }
    } catch {
      // Fall through to auth challenge.
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Plus Tensions CRM"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
