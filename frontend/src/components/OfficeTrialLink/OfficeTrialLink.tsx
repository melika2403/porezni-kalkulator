"use client";

/* Pametni "Isprobaj 30 dana besplatno" link za PK Office (marketing strana).
   - Prijavljen: vodi u app (upsell/dashboard), proba se tamo eksplicitno pokreće.
   - Neprijavljen: vodi na registraciju sa next=/pretplate?officeTrial=auto, pa
     backend office trial auto-aktivira pri verifikaciji maila (wantsOfficeTrial),
     a /pretplate skroluje na PK Office sekciju i prikaže potvrdu.
   Reuse ["me"] query (isti kao navbar/LandingCta), nema dodatnog poziva. Tokom
   SSR-a se renderuje neprijavljena varijanta (isto ponašanje kao LandingCta). */

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { PK_OFFICE_DASHBOARD_URL } from "src/lib/pkOfficeUrl";

export const OFFICE_TRIAL_REGISTER_URL = `/registracija?next=${encodeURIComponent(
  "/pretplate?officeTrial=auto",
)}`;

export function OfficeTrialLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });

  if (user) {
    return (
      <a href={PK_OFFICE_DASHBOARD_URL} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={OFFICE_TRIAL_REGISTER_URL} className={className}>
      {children}
    </Link>
  );
}
