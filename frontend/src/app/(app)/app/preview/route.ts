import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* Preview pristup za PK Office teaser. Otvaranjem /app/preview?key=<kljuc> sa
   ispravnim kljucem (PK_OFFICE_PREVIEW_KEY) postavlja se cookie pk_preview, pa
   layout pusta posjetioca u pravi app umjesto teasera. Bez/sa pogresnim kljucem
   samo redirecta na /app (teaser). Route handler ne prolazi kroz layout gate. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const key = params.get("key");
  const expected = process.env.PK_OFFICE_PREVIEW_KEY;

  const res = NextResponse.redirect(new URL("/app", req.url));

  // /app/preview?clear=1 -> ugasi preview pristup (vrati teaser).
  if (params.has("clear")) {
    res.cookies.delete("pk_preview");
    return res;
  }

  if (expected && key === expected) {
    res.cookies.set("pk_preview", expected, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90, // 90 dana
    });
  }
  return res;
}
