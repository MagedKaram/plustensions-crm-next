'use client';

import { FormEvent, useEffect, useState } from 'react';

type Props = {
  initialError?: string | null;
  nextPath: string;
  logout?: boolean;
};

export function LoginForm({ initialError, nextPath, logout = false }: Props) {
  const [error, setError] = useState(initialError || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (logout) {
      window.localStorage.removeItem('crm_token');
      return;
    }

    const token = window.localStorage.getItem('crm_token');
    if (token) {
      fetch('/api/session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((response) => {
        if (response.ok) {
          window.location.replace(nextPath || '/');
        } else {
          window.localStorage.removeItem('crm_token');
        }
      });
    }
  }, [logout, nextPath]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.get('username'),
          password: formData.get('password'),
          next: nextPath || '/',
        }),
      });

      const data = (await response.json()) as { token?: string; next?: string; error?: string };

      if (!response.ok || !data.token) {
        throw new Error(data.error || 'Login failed');
      }

      window.localStorage.setItem('crm_token', data.token);
      window.location.replace(data.next || nextPath || '/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {error ? <div className="login-error">{error}</div> : null}

      <form onSubmit={submit} className="login-form">
        <label>
          Username
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="login-button" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </>
  );
}
