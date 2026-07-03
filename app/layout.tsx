import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plus Tensions CRM',
  description: 'Small CRM for invoice automation workflows',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
