import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Porezni Kalkulator — BiH',
  description: 'SPR-1053, GPD-1051, obračun plata, PDV, stalna sredstva i ugovori za poduzetnike u BiH.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bs">
      <body>{children}</body>
    </html>
  );
}
