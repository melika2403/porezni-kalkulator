"use client";

import { usePathname } from "next/navigation";
import Navbar from "src/components/Navbar/Navbar";

// Marketing navbar se ne prikazuje u PK Office app dijelu (/app/*) — app ima
// vlastiti AppShell sa sidebar-om i back-na-glavnu dugmetom.
export default function ConditionalNavbar() {
  const pathname = usePathname();
  if (pathname === "/app" || pathname?.startsWith("/app/")) return null;
  return <Navbar />;
}
