import type { Metadata } from "next";
import { Suspense } from "react";
import Register from "src/sections/auth/Register";

export const metadata: Metadata = {
  title: "Registracija, Porezni Kalkulator BiH",
  description: "Napravite besplatan račun na Porezni Kalkulator BiH.",
  alternates: { canonical: "https://www.poreznikalkulator.ba/registracija" },
  robots: { index: false, follow: false },
};

export default function RegistracijaPage() {
  return (
    <Suspense fallback={null}>
      <Register />
    </Suspense>
  );
}
