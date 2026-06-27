import { Suspense } from "react";
import RjesenjaOdluke from "src/sections/rjesenja-i-odluke/RjesenjaOdluke";
import RadniciTabBar from "src/components/RadniciTabBar/RadniciTabBar";
import type { Metadata } from "next";

const PAGE_URL = "https://poreznikalkulator.ba/rjesenja-i-odluke";

export const metadata: Metadata = {
  title: "Rješenja i odluke, kadrovski akti (Word/PDF) FBiH",
  description:
    "Generator kadrovskih rješenja i odluka prema Zakonu o radu FBiH: rješenje o korištenju godišnjeg odmora, regres, prigodna nagrada, plaćeno i neplaćeno odsustvo. Popunite podatke i preuzmite u Word i PDF formatu.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "article",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Rješenja i odluke, kadrovski akti (FBiH)",
    description:
      "Generator kadrovskih rješenja i odluka prema Zakonu o radu FBiH, u Word i PDF formatu.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Rješenja i odluke, Porezni Kalkulator BiH",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rješenja i odluke, kadrovski akti (FBiH)",
    description:
      "Predlošci kadrovskih rješenja i odluka prema Zakonu o radu FBiH, Word i PDF.",
    images: ["/og-image.png"],
  },
};

export default function RjesenjaOdlukePage() {
  return (
    <Suspense fallback={null}>
      <RadniciTabBar />
      <RjesenjaOdluke />
    </Suspense>
  );
}
