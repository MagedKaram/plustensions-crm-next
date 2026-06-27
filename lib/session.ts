import type { NextRequest } from 'next/server';

export const sessionCookieName = 'crm_token';

export function getSessionToken() {
  return process.env.CRM_AUTH_TOKEN || process.env.CRM_TOKEN || process.env.CRM_PASSWORD || '';
}

export function getBearerToken(authorization: string | null) {
  return authorization?.replace(/^Bearer\s+/i, '').trim() || '';
}

export function isValidSessionToken(token: string | undefined | null) {
  const expected = getSessionToken();
  return Boolean(expected && token && token === expected);
}

export function isAuthenticatedRequest(request: NextRequest) {
  const cookieToken = request.cookies.get(sessionCookieName)?.value;
  const legacyCookie = request.cookies.get('crm_session')?.value;
  const bearerToken = getBearerToken(request.headers.get('authorization'));
  const headerToken = request.headers.get('x-crm-token');

  return isValidSessionToken(cookieToken) || isValidSessionToken(bearerToken) || isValidSessionToken(headerToken) || legacyCookie === 'authenticated';
}
