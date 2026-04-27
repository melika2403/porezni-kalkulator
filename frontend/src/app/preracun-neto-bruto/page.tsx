import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Kalkulator plate FBiH — preračun neto u bruto i bruto u neto | Porezni Kalkulator BiH",
  description:
    "Online kalkulator plate za Federaciju BiH — preračun neto u bruto i bruto u neto po važećim stopama. Pregled doprinosa radnika i poslodavca, poreza na dohodak i ukupnog troška poslodavca, besplatno.",
  alternates: { canonical: "https://poreznikalkulator.ba/preracun-neto-bruto" },
};

import PreracunPlate from "src/sections/plata/Plata";

export default function PreracunNetoBrutoPage() {
  return <PreracunPlate />;
}
