"use client";

import { usePathname } from "next/navigation";
import Navbar from "src/components/Navbar/Navbar";

// Marketing navbar se ne prikazuje u PK Office app dijelu (/app/*), app ima
// vlastiti AppShell sa sidebar-om i back-na-glavnu dugmetom.
//
// Na app subdomeni proxy rewrite-uje sve na /app, ali pathname u browseru
// ostaje "/", pa provjera po putanji tu ne hvata. Tada marketing chrome
// sakriva CSS iz (app)/app/layout.tsx (selektor data-marketing-chrome), bez
// flasha. Ovdje je dovoljna provjera po putanji za lokalni dev (/app/*).
export default function ConditionalNavbar() {
  const pathname = usePathname();
  if (pathname === "/app" || pathname?.startsWith("/app/")) return null;
  return <Navbar />;
}
