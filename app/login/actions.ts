'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || '/') || '/';

  const expectedUsername = process.env.CRM_USERNAME || 'admin';
  const expectedPassword = process.env.CRM_PASSWORD;
  const sessionSecret = process.env.CRM_TOKEN || process.env.CRM_PASSWORD;

  if (!expectedPassword || !sessionSecret) {
    redirect('/login?error=missing-config');
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    redirect('/login?error=invalid');
  }

  const cookieStore = await cookies();
  cookieStore.set('crm_session', sessionSecret, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  redirect(next.startsWith('/') ? next : '/');
}
