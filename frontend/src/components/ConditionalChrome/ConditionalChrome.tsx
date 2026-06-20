"use client";

import { usePathname } from "next/navigation";
import Navbar from "src/components/Navbar/Navbar";
import Footer from "src/components/Footer/Footer";

// Marketing chrome (Navbar + Footer) renderovan samo van /app rute.
// PK Office (/app/*) ima svoj AppShell sa sopstvenim sidebar-om i header-om.
export default function ConditionalChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const isAppRoute = pathname.startsWith("/app");

  if (isAppRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <div className="pageContent">{children}</div>
      <Footer />
    </>
  );
}
