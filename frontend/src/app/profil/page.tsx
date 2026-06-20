import type { Metadata } from "next";
import { Suspense } from "react";
import Profil from "src/sections/profil/Profil";

export const metadata: Metadata = {
  title: "Moj profil, Porezni Kalkulator",
  description: "Uredite svoje podatke, upravljajte djelatnošću i pregledajte historiju obrazaca.",
};

export default function ProfilPage() {
  // Profil koristi useSearchParams (za ?tab i ?editOrg deep-linking), pa
  // Next.js zahtijeva Suspense boundary radi CSR bailout pri SSR-u.
  return (
    <Suspense fallback={null}>
      <Profil />
    </Suspense>
  );
}
