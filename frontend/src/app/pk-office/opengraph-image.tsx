// Generisani og:image za /pk-office (Next ImageResponse, statički na buildu).
// Kartica je zajednička sa /solo (src/lib/ogPkOffice.tsx): tamnozelena
// pozadina, terakota badge, cream tekst. File-based metadata ima prioritet pa
// stranica ne navodi images u openGraph.
import { OG_SIZE, pkOfficeOgImage } from "src/lib/ogPkOffice";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "PK Office, kompletno knjigovodstvo obrta na jednom mjestu";

export default function Image() {
  return pkOfficeOgImage({
    badge: "PK Office",
    naslov: "Kompletno knjigovodstvo obrta",
    podnaslov: "Sve knjige, obrasci i plate na jednom mjestu",
    chips: ["Bankovni izvodi", "KPR", "PDV", "Plate i MIP", "Fakture", "Roba i lager"],
    potpis: "poreznikalkulator.ba",
  });
}
