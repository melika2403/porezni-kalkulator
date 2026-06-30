import type { Metadata } from "next";
import KontaktForm from "src/sections/kontakt/Kontakt";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Kontaktirajte tim Porezni Kalkulator BiH. Za pitanja, prijedloge ili prijavu grešaka, tu smo za vas.",
  alternates: { canonical: "https://www.poreznikalkulator.ba/kontakt" },
};

export default function KontaktPage() {
  return <KontaktForm />;
}
