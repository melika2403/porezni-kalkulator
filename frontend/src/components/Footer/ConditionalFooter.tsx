"use client";

import { usePathname } from "next/navigation";
import Footer from "src/components/Footer/Footer";

// Footer se ne prikazuje na admin, profil i pregledu organizacija (imaju
// vlastiti app-like layout, marketing footer tu ne pripada).
export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  if (pathname === "/profil" || pathname?.startsWith("/profil/")) return null;
  if (pathname?.startsWith("/organizacije")) return null;
  if (pathname === "/app" || pathname?.startsWith("/app/")) return null;
  return <Footer />;
}
