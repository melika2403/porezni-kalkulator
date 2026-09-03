import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// PK Office subdomain handling.
// app.poreznikalkulator.ba (i app.localhost u dev-u) → rewrite na /app/*.
// Marketing domena: /app/* → app subdomena radi next.config redirects()
// (CDN pravilo, bez CPU-a), vidi komentar tamo.
export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const pathname = request.nextUrl.pathname;

  const isAppSubdomain =
    host.startsWith("app.") || host === "app.localhost" || host.startsWith("app.localhost:");

  if (isAppSubdomain && !pathname.startsWith("/app") && !pathname.startsWith("/api")) {
    const url = request.nextUrl.clone();
    url.pathname = `/app${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // Provjera isAppSubdomain je namjerno zadrzana iako matcher ispod pusta
  // samo app. hostove: ako `has` matching ikad prestane raditi, funkcija se
  // i dalje ponasa ispravno i samo pozove next(). Matcher stedi novac,
  // ova provjera cuva ispravnost.
  return NextResponse.next();
}

// Matcher se izvrsavao na SVAKOM zahtjevu obje domene: 21K poziva u 12 sati,
// od toga 5 rewrite-ova i 0 redirecta (Vercel Observability, Middleware tab).
// Ostatak je samo pozvao next(), jer middleware radi PRIJE nego CDN pogleda
// u kes, pa su i stopostotno kesirane marketing stranice placale CPU. Bilo
// je 62% Fluid Active CPU-a. Sada radi samo na app subdomeni, jedinom
// mjestu gdje ima sta da radi.
export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
      // Mora biti `type: "host"`, ne `type: "header", key: "host"`.
      // matchHas za host tip radi `host.split(":")[0].toLowerCase()`, dakle
      // skida port i normalizuje velicinu slova; za header tip uzima sirovu
      // vrijednost. Sa header tipom je "Host: APP.poreznikalkulator.ba"
      // (Host je po HTTP specifikaciji case-insensitive) promasio matcher,
      // middleware se preskocio i PK Office je vracao 404.
      // Port se skida, pa `app\..*` hvata i app.localhost:3000 u dev-u.
      has: [{ type: "host", value: "app\\..*" }],
    },
  ],
};
