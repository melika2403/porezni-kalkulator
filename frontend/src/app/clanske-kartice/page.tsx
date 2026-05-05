import ClanskeKartice from "src/sections/clanske-kartice/ClanskeKartice";
import type { Metadata } from "next";

const PAGE_URL = "https://poreznikalkulator.ba/clanske-kartice";

export const metadata: Metadata = {
  title: "Generator članskih kartica sa QR kodom | Porezni Kalkulator BiH",
  description:
    "Kreirajte profesionalne članske kartice sa QR kodom za klubove, fitness centre, biblioteke i druge organizacije. Veličina kreditne kartice, spremno za štampanje ili pokazivanje na mobitelu.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Generator članskih kartica sa QR kodom",
    description:
      "Kreirajte profesionalne članske kartice sa QR kodom u formatu kreditne kartice. Spremno za štampanje ili digitalni prikaz.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Generator članskih kartica sa QR kodom",
    description:
      "Kreirajte članske kartice sa QR kodom za vašu organizaciju ili klijente.",
  },
};

export default function ClanskeKarticePage() {
  return <ClanskeKartice />;
}
