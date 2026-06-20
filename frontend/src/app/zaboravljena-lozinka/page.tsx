import type { Metadata } from "next";
import ForgotPassword from "src/sections/auth/ForgotPassword";

export const metadata: Metadata = {
  title: "Zaboravljena lozinka, Porezni Kalkulator BiH",
  description: "Resetujte lozinku vašeg naloga na Porezni Kalkulator BiH.",
  robots: { index: false, follow: false },
};

export default function ZaboravljenaLozinkaPage() {
  return <ForgotPassword />;
}
