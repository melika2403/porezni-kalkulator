"use client";

import Link from "next/link";
import { useRole } from "src/hooks/useRole";
import OfficeTrialCta, {
  useOfficeTrial,
} from "src/components/OfficeTrialCta/OfficeTrialCta";
import styles from "./GeneratePaywall.module.css";

// SVG ikona u pločici (zamjena za nekadašnji emoji 🔒).
function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

type Tier = "PRO" | "BUSINESS";

type Props = {
  tier: Tier;
  /** Što paywall blocka — npr. "Generisanje JS3100 obrasca". Default: "Preuzimanje dokumenta". */
  what?: string;
  /** Ako je true, ne nudi probu — direktno vodi na /pretplate. */
  noTrialOffer?: boolean;
};

/**
 * Paywall ispod dugmadi za preuzimanje. Postoji samo JEDNA proba (30 dana,
 * nivo PK Office Tim), koja pokriva i PRO i BUSINESS funkcije, pa je ponuda
 * ista za oba tiera: dok je proba dostupna nudimo nju (tamnozelena PK Office
 * traka), a kad je potrošena, klasičnu poruku o pretplati.
 */
export default function GeneratePaywall({
  tier,
  what = "Preuzimanje dokumenta",
  noTrialOffer = false,
}: Props) {
  const { effectiveRole } = useRole();
  const { available, paidPlan, isLoading } = useOfficeTrial();

  // Dok se ["me"] učitava ne treperi pogrešna poruka.
  if (isLoading) return null;

  // Pretplatniku se proba ne gura na paywall-u: Pro korisnik na Business gate-u
  // treba nadogradnju, a ne 30 dana Business funkcija besplatno. Probu i dalje
  // može sam pokrenuti sa /pretplate#pk-office.
  if (available && !paidPlan && !noTrialOffer) {
    return <OfficeTrialCta what={what} />;
  }

  // Proba potrošena ili se ne nudi: klasičan zaključan paywall.
  const businessGate = tier === "BUSINESS";
  const proKorisnik = effectiveRole === "PRO";

  return (
    <div
      className={`${styles.paywall} ${businessGate ? styles.paywallBusiness : ""}`}
    >
      <div className={`${styles.icon} ${businessGate ? styles.iconAccent : ""}`}>
        <LockIcon />
      </div>
      <div className={styles.text}>
        {businessGate && proKorisnik ? (
          <>
            <strong>{what}</strong> zahtijeva <strong>Business</strong>{" "}
            pretplatu. Vaš Pro plan pokriva većinu alata, ali ovaj dokument je
            dio Business paketa.
          </>
        ) : (
          <>
            <strong>{what}</strong> dostupno je uz{" "}
            {businessGate ? (
              <strong>Business</strong>
            ) : (
              <>
                <strong>Pro</strong> ili <strong>Business</strong>
              </>
            )}{" "}
            pretplatu, ili uz <strong>PK Office</strong> paket. Vaši uneseni
            podaci se čuvaju, kada aktivirate pretplatu samo kliknite preuzmi.
          </>
        )}
      </div>
      <Link
        href={businessGate ? "/pretplate?plan=business" : "/pretplate"}
        className={`${styles.btn} ${businessGate ? styles.btnBusiness : ""}`}
      >
        {businessGate && proKorisnik
          ? "Nadogradi na Business"
          : "Pogledaj pretplate"}{" "}
        →
      </Link>
    </div>
  );
}
