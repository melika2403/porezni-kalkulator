import type { Metadata } from "next";
import PromoterPregled from "src/sections/promoter/PromoterPregled";

export const metadata: Metadata = {
  title: "Moje reklame, Porezni Kalkulator",
  robots: { index: false, follow: false },
};

export default function PromoterPage() {
  return <PromoterPregled />;
}
