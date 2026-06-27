'use client';

import { FormEvent, useState } from 'react';

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.get('username'),
          password: formData.get('password'),
          next: nextPath || '/',
        }),
      });
      const data = (await response.json()) as { next?: string; error?: string };
      if (!response.ok) throw new Error(data.error || 'Login failed');
      // Full navigation so the freshly-set cookie is applied before the guard runs.
      window.location.assign(data.next || nextPath || '/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed');
      setLoading(false);
    }
  }

  return (
    <>
      {error ? <div className="login-error">{error}</div> : null}
      <form onSubmit={submit} className="login-form">
        <div>
          <label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" required />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="btn login-button" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </>
  );
}
