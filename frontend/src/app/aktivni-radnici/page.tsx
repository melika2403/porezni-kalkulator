import { Suspense } from "react";
import AktivniRadnici from "src/sections/aktivni-radnici/AktivniRadnici";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aktivni radnici — pregled i upravljanje | Porezni Kalkulator BiH",
  description:
    "Centralni pregled svih radnika organizacije sa statusom prijave, ugovornim podacima i brzim akcijama za generisanje ugovora o radu, otkaza i JS3100 obrazaca.",
  robots: { index: false, follow: false }, // korisnička stranica, ne za Google Webmaster Tools
};

export default function AktivniRadniciPage() {
  return (
    <Suspense fallback={null}>
      <AktivniRadnici />
    </Suspense>
  );
}
