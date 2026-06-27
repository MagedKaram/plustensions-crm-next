import { loginAction } from './actions';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  error?: string;
  next?: string;
}>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const message =
    params.error === 'invalid'
      ? 'Username or password is incorrect.'
      : params.error === 'missing-config'
        ? 'CRM_PASSWORD is missing in Coolify environment variables.'
        : null;

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">+tensions</div>
        <p className="eyebrow">Internal CRM</p>
        <h1>Sign in to your dashboard</h1>
        <p className="login-copy">Manage invoices, customers, payment reminders, and workflow actions.</p>

        {message ? <div className="login-error">{message}</div> : null}

        <form action={loginAction} className="login-form">
          <input type="hidden" name="next" value={params.next || '/'} />
          <label>
            Username
            <input name="username" autoComplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="login-button" type="submit">
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
