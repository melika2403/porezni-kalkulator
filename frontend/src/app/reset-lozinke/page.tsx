import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPassword from "src/sections/auth/ResetPassword";

export const metadata: Metadata = {
  title: "Reset lozinke — Porezni Kalkulator BiH",
  description: "Postavite novu lozinku za vaš nalog.",
  robots: { index: false, follow: false },
};

export default function ResetLozinkePage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}
