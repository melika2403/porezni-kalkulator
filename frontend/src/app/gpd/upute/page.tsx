import type { Metadata } from "next";
import GpdUpute from "../../../sections/gpd/GpdUpute";

const PAGE_URL = "https://www.poreznikalkulator.ba/gpd/upute";

export const metadata: Metadata = {
  title: "GPD-1051 obrazac, upute za popunjavanje",
  description:
    "Detaljan vodič za pravilno popunjavanje godišnje prijave poreza na dohodak, obrazac GPD-1051 u FBiH.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: "article",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Kako popuniti GPD-1051 obrazac, Upute",
    description:
      "Korak-po-korak vodič za godišnju prijavu poreza na dohodak (GPD-1051) u FBiH.",
  },
};

export default function GpdUputePage() {
  return <GpdUpute />;
}
