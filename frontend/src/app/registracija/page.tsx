import type { Metadata } from "next";
import Register from "src/sections/auth/Register";

export const metadata: Metadata = {
  title: "Registracija — Porezni Kalkulator BiH",
  description: "Napravite besplatan račun na Porezni Kalkulator BiH.",
  alternates: { canonical: "https://poreznikalkulator.ba/registracija" },
  robots: { index: false, follow: false },
};

export default function RegistracijaPage() {
  return <Register />;
}
