'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Item = { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean };

const I = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
  ),
  invoice: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h16v18l-3-2-3 2-3-2-3 2-1-1V3z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>
  ),
  receipt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>
  ),
  upload: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></svg>
  ),
};

const customerNav: Item[] = [
  { href: '/', label: 'Invoices', icon: I.invoice, match: (p) => p === '/' },
  { href: '/customers', label: 'Customers', icon: I.users, match: (p) => p.startsWith('/customers') },
];

const taxNav: Item[] = [
  { href: '/tax', label: 'Overview', icon: I.grid, match: (p) => p === '/tax' },
  { href: '/tax/invoices', label: 'Supplier invoices', icon: I.receipt, match: (p) => p.startsWith('/tax/invoices') },
  { href: '/tax/upload', label: 'Upload invoice', icon: I.upload, match: (p) => p.startsWith('/tax/upload') },
];

export function Sidebar({ username }: { username: string }) {
  const pathname = usePathname() || '/';

  const renderItem = (item: Item) => (
    <Link key={item.href} href={item.href} className={`nav-item ${item.match(pathname) ? 'active' : ''}`}>
      {item.icon}
      {item.label}
    </Link>
  );

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">+t</div>
        <div>
          <div className="brand-name">Plus Tensions</div>
          <div className="brand-sub">CRM</div>
        </div>
      </div>

      <nav className="nav">
        <div className="nav-section">Sales</div>
        {customerNav.map(renderItem)}
        <div className="nav-section">Tax &amp; expenses</div>
        {taxNav.map(renderItem)}
      </nav>

      <div className="sidebar-foot">
        <form action="/api/logout" method="post">
          <button className="logout-btn" type="submit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>
            Sign out
          </button>
        </form>
        <div className="side-user">
          <div className="side-avatar">{(username[0] || 'A').toUpperCase()}</div>
          <div>
            <div className="side-user-name">{username}</div>
            <small>Signed in</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
