import type { Metadata } from "next";
import Login from "src/sections/auth/Login";

export const metadata: Metadata = {
  title: "Prijava — Porezni Kalkulator BiH",
  description: "Prijavite se na svoj račun na Porezni Kalkulator BiH.",
  alternates: { canonical: "https://poreznikalkulator.ba/prijava" },
  robots: { index: false, follow: false },
};

export default function PrijavaPage() {
  return <Login />;
}
