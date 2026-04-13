import type { ReactNode } from "react";

import "./globals.css";

import Navbar from "src/components/Navbar";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="hr">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
