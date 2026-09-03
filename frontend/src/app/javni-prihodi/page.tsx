import type { Metadata } from "next";
import JavniPrihodi, {
  JavniPrihodiJsonLd,
} from "src/sections/javni-prihodi/JavniPrihodi";
import { VRSTE_PRIHODA_GROUPS } from "src/data/javni-prihodi";
import { KANTONI } from "src/data/uplatni-racuni";
import { OPCINE_GROUPS } from "src/data/opcine";

const PAGE_URL = "https://www.poreznikalkulator.ba/javni-prihodi";

// Ovdje se smiju čitati samo BROJEVI STAVKI (koliko računa, šifri, općina),
// nikad sami brojevi računa: stranica je statična, pa bi konkretan račun ostao
// zapečen u build i poslije admin izmjene šifarnika. Sve što nosi brojeve
// računa (JSON-LD) gradi klijentska JavniPrihodiJsonLd iz živog šifarnika.
const totalVrste = VRSTE_PRIHODA_GROUPS.reduce((a, g) => a + g.items.length, 0);
// 5 federalnih/fondovskih + po 3 računa (budžet, ZZO, služba) po kantonu
const totalRacuni = 5 + Object.keys(KANTONI).length * 3;
const totalOpcina = OPCINE_GROUPS.reduce((a, g) => a + g.opcine.length, 0);

export const metadata: Metadata = {
  title: "Uplatni računi javnih prihoda FBiH",
  description:
    `Pretraga ${totalRacuni} federalnih i kantonalnih uplatnih računa, ${totalVrste} šifri vrsta prihoda i ${totalOpcina} općinskih računa za javne prihode u FBiH.`,
alternates: { canonical: PAGE_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "article",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title:
      "Uplatni računi javnih prihoda FBiH, 315 šifri vrsta prihoda + općinski računi",
    description:
      "Brojevi računa, šifre vrsta prihoda, općinski računi i budžetske organizacije za sve uplate javnih prihoda u FBiH. Federalni računi uvijek aktuelni sa PUFBiH stranice.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Uplatni računi javnih prihoda FBiH",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Uplatni računi javnih prihoda FBiH, kompletna referenca",
    description:
      "315 šifri vrsta prihoda, federalni i kantonalni računi, općinski računi i budžetske organizacije.",
    images: ["/og-image.png"],
  },
};

export default function JavniPrihodiPage() {
  return (
    <>
      <JavniPrihodiJsonLd />
      <JavniPrihodi />
    </>
  );
}
