import type { Metadata } from "next";
import Amortizacija from "../../sections/amortizacija/Amortizacija";

export const metadata: Metadata = {
  title: "PLDI-1043 — Popisna lista dugotrajne imovine | Porezni Kalkulator BiH",
  description:
    "Besplatna izrada PLDI-1043 obrasca — popisna lista dugotrajne imovine i obračun amortizacije stalnih sredstava u FBiH.",
};

export default function AmortizacijaPage() {
  return <Amortizacija />;
}
