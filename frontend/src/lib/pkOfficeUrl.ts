// Apsolutni URL do PK Office dashboarda.
// Ruta je UVIJEK /app/dashboard. U prod-u na app subdomeni
// (app.poreznikalkulator.ba/app/dashboard), u dev-u relativno (/app/dashboard,
// proxy rewrite preko localhost:3000/app, vidi proxy.ts).
//
// NEXT_PUBLIC_APP_URL je samo origin (npr. https://app.poreznikalkulator.ba);
// strip-amo eventualni trailing slash i /app da ne dupliramo segment.
const APP_ORIGIN = (
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.NODE_ENV === "production" ? "https://app.poreznikalkulator.ba" : "")
)
  .replace(/\/+$/, "")
  .replace(/\/app$/, "");

export const PK_OFFICE_DASHBOARD_URL = `${APP_ORIGIN}/app/dashboard`;
