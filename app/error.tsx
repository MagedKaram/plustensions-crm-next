'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="login-page">
      <section className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-brand" style={{ justifyContent: 'center' }}>
          <span className="brand-mark" style={{ width: 32, height: 32, fontSize: 14 }}>+t</span> Plus Tensions
        </div>
        <h1>Something went wrong</h1>
        <p className="login-copy">This page hit an unexpected error. You can try again, or go back to the dashboard.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 6 }}>
          <button className="btn" onClick={() => reset()}>Try again</button>
          <a className="btn ghost" href="/">Go to dashboard</a>
        </div>
      </section>
    </main>
  );
}
