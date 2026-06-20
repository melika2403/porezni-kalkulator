import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// PK Office subdomain handling.
// app.poreznikalkulator.ba (i app.localhost u dev-u) → rewrite na /app/*.
// Marketing domena: ako neko direktno hitne /app/* u prod-u, redirect na app subdomenu.
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

  if (
    !isAppSubdomain &&
    pathname.startsWith("/app") &&
    process.env.NODE_ENV === "production"
  ) {
    const url = new URL(
      `https://app.poreznikalkulator.ba${pathname.replace(/^\/app/, "") || "/"}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
