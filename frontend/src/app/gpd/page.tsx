import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "GPD-1051 Obrazac — Godišnja prijava poreza na dohodak",
  description:
    "Popunite GPD-1051 obrazac online i preuzmite popunjeni PDF. Godišnja prijava poreza na dohodak fizičkih lica — besplatno, bez registracije.",
  alternates: { canonical: "https://poreznikalkulator.ba/gpd" },
};

// sections
import GpdForm from "src/sections/gpd/Gpd";

// ----------------------------------------------------------------------

export default function MaintenancePage() {
  return <GpdForm />;
}
