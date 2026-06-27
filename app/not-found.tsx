export default function NotFound() {
  return (
    <main className="login-page">
      <section className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-brand" style={{ justifyContent: 'center' }}>
          <span className="brand-mark" style={{ width: 32, height: 32, fontSize: 14 }}>+t</span> Plus Tensions
        </div>
        <h1>Page not found</h1>
        <p className="login-copy">The page you are looking for does not exist or was moved.</p>
        <a className="btn" href="/">Go to dashboard</a>
      </section>
    </main>
  );
}
