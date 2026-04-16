import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "PDV Kalkulator BiH — Preračun PDV-a u oba smjera",
  description:
    "Besplatni PDV kalkulator za Bosnu i Hercegovinu. Preračunajte PDV iz cijene bez PDV-a ili iz maloprodajne cijene. Stopa PDV-a 17%. Podrška za KM i EUR.",
  alternates: { canonical: "https://poreznikalkulator.ba/pdv-kalkulator" },
};

import PdvKalkulator from "src/sections/pdv/Pdv";

export default function PdvKalkulatorPage() {
  return <PdvKalkulator />;
}
