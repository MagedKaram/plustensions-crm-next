import { Sidebar } from './Sidebar';

type Props = {
  title: string;
  subtitle?: string;
  crumb?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function Shell({ title, subtitle, crumb, actions, children }: Props) {
  const username = process.env.CRM_USERNAME || 'admin';
  return (
    <div className="app">
      <Sidebar username={username} />
      <div className="main">
        <div className="topbar">
          <div>
            <div className="crumbs">Plus Tensions <span>/</span> <b>{crumb || title}</b></div>
            <h1 className="page-title">{title}</h1>
            {subtitle ? <p className="page-sub">{subtitle}</p> : null}
          </div>
          <div className="topbar-actions">{actions}</div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
