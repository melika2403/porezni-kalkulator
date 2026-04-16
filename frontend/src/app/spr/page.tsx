import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "SPR-1053 Obrazac — Automatska izrada i PDF preuzimanje",
  description:
    "Popunite SPR-1053 obrazac online i preuzmite popunjeni PDF. Specifikacija za utvrđivanje dohotka od samostalne djelatnosti — besplatno, bez registracije.",
  alternates: { canonical: "https://poreznikalkulator.ba/spr" },
};

// sections
import SprForm from "src/sections/spr/Spr";

// ----------------------------------------------------------------------

export default function MaintenancePage() {
  return <SprForm />;
}
