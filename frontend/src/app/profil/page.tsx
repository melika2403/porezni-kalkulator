import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Moj profil — Porezni Kalkulator",
  description: "Uredite svoje podatke, upravljajte djelatnošću i pregledajte historiju obrazaca.",
};

import Profil from "src/sections/profil/Profil";

export default function ProfilPage() {
  return <Profil />;
}
