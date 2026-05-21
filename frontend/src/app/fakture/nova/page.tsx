import type { Metadata } from "next";
import { Suspense } from "react";
import InvoiceForm from "src/sections/fakture/InvoiceForm";

const TITLE = "Nova faktura ili predračun — kreiraj online | Porezni Kalkulator BiH";
const DESC =
  "Napravi fakturu, predračun, profakturu ili račun u par klikova: stavke, rabat, PDV (17%), podaci prodavca i kupca, automatska numeracija i izvoz u PDF.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "https://poreznikalkulator.ba/fakture/nova" },
  keywords: [
    "nova faktura",
    "kreiraj fakturu",
    "napravi fakturu online",
    "izrada fakture besplatno",
    "novi predračun",
    "kreiraj predračun",
    "izrada predračuna online",
    "profaktura online",
    "predujam faktura",
    "račun online",
    "izrada računa BiH",
    "PDV faktura",
    "faktura sa PDV-om",
    "faktura PDF preuzimanje",
    "obračun fakture sa rabatom",
    "stavke fakture",
    "fakturisanje online BiH",
    "fakturisanje samostalna djelatnost",
    "fakturisanje obrtnik",
    "Porezni Kalkulator BiH",
  ],
  openGraph: {
    type: "website",
    url: "https://poreznikalkulator.ba/fakture/nova",
    title: TITLE,
    description: DESC,
    siteName: "Porezni Kalkulator BiH",
    locale: "bs_BA",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

export default function NovaFakturaPage() {
  return (
    <Suspense>
      <InvoiceForm />
    </Suspense>
  );
}
