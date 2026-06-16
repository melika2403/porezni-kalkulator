import type { Metadata } from "next";
import Fakture from "src/sections/fakture/Fakture";
import FaktureEdu from "src/sections/fakture/FaktureEdu";

const TITLE = "Fakture, predračuni i profakture online — izrada i PDF | Porezni Kalkulator BiH";
const DESC =
  "Besplatna izrada faktura, predračuna, profaktura i računa online za BiH. Automatski PDV (17%), numeracija (0001-2026), podaci kupaca i organizacije, izvoz u PDF — bez instalacije.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "https://poreznikalkulator.ba/fakture" },
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
  return (
    <>
      <Fakture />
      <FaktureEdu />
    </>
  );
}
