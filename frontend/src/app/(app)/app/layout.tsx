import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { AppShell } from "src/components/app-shell/AppShell";
import "src/styles/pk-office.css";

export const metadata = {
  title: "PK Office",
};

export default async function PkOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");

  if (!token) {
    // /prijava živi na marketing hostu, proxy.ts na app subdomenu
    // rewrite-uje sve ne-/app putanje u /app/* (404). Konstruišemo
    // apsolutni URL na marketing host striping-om "app." prefiksa.
    const h = await headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || "http";
    const marketingHost = host.startsWith("app.") ? host.slice(4) : host;
    redirect(`${proto}://${marketingHost}/prijava?next=${encodeURIComponent(`${proto}://${host}/app`)}`);
  }

  return <AppShell>{children}</AppShell>;
}
