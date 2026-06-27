import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  error?: string;
  next?: string;
  logout?: string;
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

        <LoginForm initialError={message} nextPath={params.next || '/'} logout={params.logout === '1'} />
      </section>
    </main>
  );
}
