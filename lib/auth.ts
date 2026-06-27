import { NextRequest } from 'next/server';

export function requireCrmToken(request: NextRequest) {
  const expected = process.env.CRM_TOKEN;
  const sessionSecret = process.env.CRM_TOKEN || process.env.CRM_PASSWORD;
  const session = request.cookies.get('crm_session')?.value;
  if (sessionSecret && session === sessionSecret) {
    return;
  }

  const basicUsername = process.env.CRM_USERNAME;
  const basicPassword = process.env.CRM_PASSWORD;

  const authorization = request.headers.get('authorization');
  if (basicUsername && basicPassword && authorization?.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      const user = decoded.slice(0, separator);
      const pass = decoded.slice(separator + 1);
      if (user === basicUsername && pass === basicPassword) {
        return;
      }
    } catch {
      // Continue to token check.
    }
  }

  if (!expected) {
    return;
  }

  const headerToken = request.headers.get('x-crm-token');
  const bearer = authorization?.replace(/^Bearer\s+/i, '');
  const queryToken = request.nextUrl.searchParams.get('token');
  const token = headerToken || bearer || queryToken;

  if (token !== expected) {
    throw new Error('Unauthorized');
  }
}

export function isUnauthorized(error: unknown) {
  return error instanceof Error && error.message === 'Unauthorized';
}
