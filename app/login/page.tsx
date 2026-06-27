import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ next?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand"><span className="brand-mark" style={{ width: 32, height: 32, fontSize: 14 }}>+t</span> Plus Tensions</div>
        <h1>Sign in</h1>
        <p className="login-copy">Manage customer invoices, supplier tax records, and reminder actions.</p>
        <LoginForm nextPath={params.next || '/'} />
      </section>
    </main>
  );
}
