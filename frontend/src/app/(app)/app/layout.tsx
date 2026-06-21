import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { AppShell } from "src/components/app-shell/AppShell";
import { PkOfficeTeaser } from "src/sections/dashboard/PkOfficeTeaser";
import "src/styles/pk-office.css";

export const metadata = {
  title: "PK Office",
};

// Na app subdomeni proxy rewrite-uje sve na /app, ali marketing navbar/footer
// se renderuju iz root layouta (pathname u browseru ostaje "/", pa njihova
// provjera po putanji ne hvata). Ovaj stil ih sakriva od prvog paint-a (bez
// flasha) kad god se renderuje PK Office (/app/*), i u dev-u i na subdomeni.
const hideMarketingChrome = (
  <style>{"[data-marketing-chrome]{display:none!important}"}</style>
);

export default async function PkOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");

  // PK Office je u izradi. Dok PK_OFFICE_PUBLIC nije "true", pristup je:
  //  - preview cookie (pk_preview == PK_OFFICE_PREVIEW_KEY): pravi app (dev/testeri)
  //  - prijavljen bez previewa: teaser (demo app sa placeholder podacima)
  //  - neprijavljen: marketing landing /pk-office
  // Launch: PK_OFFICE_PUBLIC=true (svi prijavljeni -> pravi app).
  if (process.env.PK_OFFICE_PUBLIC !== "true") {
    const key = process.env.PK_OFFICE_PREVIEW_KEY;
    const preview = cookieStore.get("pk_preview")?.value;
    const previewOk = !!key && preview === key;
    if (!previewOk) {
      if (!token) {
        const h = await headers();
        const host = h.get("host") || "localhost:3000";
        const proto = h.get("x-forwarded-proto") || "http";
        const marketingHost = host.startsWith("app.") ? host.slice(4) : host;
        redirect(`${proto}://${marketingHost}/pk-office`);
      }
      return (
        <>
          {hideMarketingChrome}
          <PkOfficeTeaser />
        </>
      );
    }
  }

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

  return (
    <>
      {hideMarketingChrome}
      <AppShell>{children}</AppShell>
    </>
  );
}
