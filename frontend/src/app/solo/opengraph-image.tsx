// Generisani og:image za /solo (Next ImageResponse, statički na buildu), ista
// kartica kao /pk-office (src/lib/ogPkOffice.tsx), drugi tekst.
// File-based metadata ima prioritet pa stranica ne navodi images u openGraph.
import { PLAN_PRICING } from "src/data/pricing";
import { OG_SIZE, pkOfficeOgImage } from "src/lib/ogPkOffice";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "PK Office Solo, knjige obrta bez knjigovođe";

export default function Image() {
  return pkOfficeOgImage({
    badge: "PK Office Solo",
    naslov: "Vodi obrt sam, bez knjigovođe",
    podnaslov: `Jedan obrt, ${PLAN_PRICING.OFFICE_1.yearly} KM godišnje + PDV, 30 dana besplatno`,
    chips: ["Fakture", "Bankovni izvodi", "KPR-1041", "Doprinosi vlasnika", "SPR i GPD", "Lista obaveza"],
    potpis: "poreznikalkulator.ba/solo",
  });
}
