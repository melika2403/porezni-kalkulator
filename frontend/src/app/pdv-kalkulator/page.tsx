import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "PDV kalkulator BiH — preračun PDV-a u oba smjera (stopa 17%) | Porezni Kalkulator BiH",
  description:
    "Online PDV kalkulator za Bosnu i Hercegovinu (stopa 17%). Preračunajte PDV iz cijene bez PDV-a ili iz maloprodajne cijene, podrška za KM i EUR — besplatno i bez registracije.",
  alternates: { canonical: "https://poreznikalkulator.ba/pdv-kalkulator" },
};

import PdvKalkulator from "src/sections/pdv/Pdv";

export default function PdvKalkulatorPage() {
  return <PdvKalkulator />;
}
