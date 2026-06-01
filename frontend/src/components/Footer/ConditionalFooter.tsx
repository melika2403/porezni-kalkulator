"use client";

import { usePathname } from "next/navigation";
import Footer from "src/components/Footer/Footer";

// Footer se ne prikazuje na admin stranicama (admin ima vlastiti layout/sidebar).
export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <Footer />;
}
