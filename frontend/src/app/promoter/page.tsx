import type { Metadata } from "next";
import PregledKampanje from "src/sections/promoter/PregledKampanje";

export const metadata: Metadata = {
  title: "Pregled kampanje, Partner portal",
  robots: { index: false, follow: false },
};

export default function PromoterPage() {
  return <PregledKampanje />;
}
