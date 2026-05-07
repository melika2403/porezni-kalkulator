import type { Metadata } from "next";
import Fakture from "src/sections/fakture/Fakture";

const TITLE = "Fakture, predračuni i profakture online — izrada i PDF | Porezni Kalkulator BiH";
const DESC =
  "Besplatna izrada faktura, predračuna, profaktura i računa online za BiH. Automatski PDV (17%), numeracija (0001-2026), podaci kupaca i organizacije, izvoz u PDF — bez instalacije.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "https://poreznikalkulator.ba/fakture" },
  keywords: [
    "faktura",
    "fakture",
    "izrada fakture",
    "izrada faktura online",
    "online faktura",
    "fakturisanje",
    "fakturisanje online",
    "elektronska faktura",
    "predračun",
    "predracun",
    "izrada predračuna",
    "predračun online",
    "predračun PDF",
    "profaktura",
    "predujam",
    "račun",
    "izrada računa",
    "online račun",
    "račun PDF",
    "PDV faktura",
    "faktura sa PDV-om",
    "faktura bez PDV-a",
    "PDV 17%",
    "knjiga izlaznih faktura",
    "numeracija faktura",
    "faktura broj",
    "faktura BiH",
    "faktura FBiH",
    "faktura RS",
    "faktura Bosna i Hercegovina",
    "besplatna faktura online",
    "PDF faktura",
    "izvoz fakture u PDF",
    "fakturisanje obrtnik",
    "fakturisanje samostalna djelatnost",
    "Porezni Kalkulator BiH",
  ],
  openGraph: {
    type: "website",
    url: "https://poreznikalkulator.ba/fakture",
    title: TITLE,
    description: DESC,
    siteName: "Porezni Kalkulator BiH",
    locale: "bs_BA",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

export default function FakturePage() {
  return <Fakture />;
}
