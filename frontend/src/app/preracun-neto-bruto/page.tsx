import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Obračun Neto / Bruto Plate — Kalkulator plate FBiH",
  description:
    "Kalkulator za obračun neto i bruto plate u Federaciji BiH. Prikaz svih doprinosa radnika i poslodavca, poreza na dohodak i ukupnog troška poslodavca po važećim stopama.",
  alternates: { canonical: "https://poreznikalkulator.ba/preracun-neto-bruto" },
};

import PreracunPlate from "src/sections/plata/Plata";

export default function PreracunNetoBrutoPage() {
  return <PreracunPlate />;
}
