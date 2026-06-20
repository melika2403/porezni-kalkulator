import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { AppShell } from "src/components/app-shell/AppShell";
import { PkOfficeTeaser } from "src/sections/dashboard/PkOfficeTeaser";
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

  // PK Office je u izradi. Dok PK_OFFICE_PUBLIC nije "true", samo posjetioci sa
  // preview pristupom (cookie pk_preview == PK_OFFICE_PREVIEW_KEY) vide pravi
  // app; svi ostali (i neulogovani) vide teaser. Preview se dobija otvaranjem
  // /app/preview?key=<kljuc> (vidi preview/route.ts). Launch: PK_OFFICE_PUBLIC=true.
  if (process.env.PK_OFFICE_PUBLIC !== "true") {
    const key = process.env.PK_OFFICE_PREVIEW_KEY;
    const preview = cookieStore.get("pk_preview")?.value;
    if (!key || preview !== key) {
      return <PkOfficeTeaser />;
    }
  }

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
