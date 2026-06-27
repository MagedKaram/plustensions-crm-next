import type { NextRequest } from 'next/server';

export const SESSION_COOKIE = 'crm_session';

/** Shared secret used as the session cookie value. Single admin / internal CRM. */
export function getSecret() {
  return process.env.CRM_AUTH_TOKEN || process.env.CRM_TOKEN || process.env.CRM_PASSWORD || '';
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.CRM_COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 60 * 60 * 12,
  };
}

export function isValid(token: string | undefined | null) {
  const expected = getSecret();
  return Boolean(expected && token && token === expected);
}

export function isAuthenticated(request: NextRequest) {
  return isValid(request.cookies.get(SESSION_COOKIE)?.value);
}
