"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { useRole } from "src/hooks/useRole";
import styles from "./GeneratePaywall.module.css";

// SVG ikone u pločici (zamjena za nekadašnje emoji 🎁/🔒).
function GiftIcon() {
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
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

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
  /** Ako je true, ne nudi trial CTA — direktno vodi na /pretplate. */
  noTrialOffer?: boolean;
};

export default function GeneratePaywall({
  tier,
  what = "Preuzimanje dokumenta",
  noTrialOffer = false,
}: Props) {
  const { role } = useRole();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });
  const isAnonymous = !meQuery.isLoading && !meQuery.data;
  const trialAvailable =
    !noTrialOffer &&
    meQuery.data?.role === "USER" &&
    !meQuery.data?.trialUsedAt;
  const isPro = role === "PRO";

  // ANONYMOUS — pozovi na registraciju (trial je dostupan tek nakon registracije).
  if (isAnonymous && !noTrialOffer) {
    const next =
      tier === "BUSINESS"
        ? "/pretplate?plan=business"
        : "/pretplate?trial=auto";
    return (
      <div className={styles.paywall}>
        <div className={styles.icon}>
          <GiftIcon />
        </div>
        <div className={styles.text}>
          <strong>Registrujte se besplatno</strong> i probajte 30 dana sve
          PRO funkcije. Bez kartice, bez automatske naplate.
        </div>
        <Link
          href={`/registracija?next=${encodeURIComponent(next)}`}
          className={styles.btn}
        >
          Registruj se i probaj besplatno →
        </Link>
      </div>
    );
  }

  // BUSINESS gate ─────────────────────────────────────────────────────────────
  if (tier === "BUSINESS") {
    if (isPro) {
      return (
        <div className={`${styles.paywall} ${styles.paywallBusiness}`}>
          <div className={`${styles.icon} ${styles.iconAccent}`}>
            <LockIcon />
          </div>
          <div className={styles.text}>
            <strong>{what}</strong> zahtijeva{" "}
            <strong>Business</strong> pretplatu. Vaš Pro plan pokriva većinu
            alata, ali ovaj dokument je dio Business paketa.
          </div>
          <Link
            href="/pretplate?plan=business"
            className={`${styles.btn} ${styles.btnBusiness}`}
          >
            Nadogradi na Business →
          </Link>
        </div>
      );
    }
    return (
      <div className={`${styles.paywall} ${styles.paywallBusiness}`}>
        <div className={`${styles.icon} ${styles.iconAccent}`}>
          <LockIcon />
        </div>
        <div className={styles.text}>
          <strong>{what}</strong> dostupno je uz{" "}
          <strong>Business</strong> pretplatu. Vaši uneseni podaci se čuvaju.
          Kada aktivirate pretplatu, samo kliknite preuzmi.
        </div>
        <Link
          href="/pretplate?plan=business"
          className={`${styles.btn} ${styles.btnBusiness}`}
        >
          Pogledaj Business →
        </Link>
      </div>
    );
  }

  // PRO gate ──────────────────────────────────────────────────────────────────
  if (trialAvailable) {
    return (
      <div className={styles.paywall}>
        <div className={styles.icon}>
          <GiftIcon />
        </div>
        <div className={styles.text}>
          <strong>Probajte 30 dana besplatno</strong> i preuzmite dokument. Bez
          kartice, bez automatske naplate. Nakon 30 dana automatski se vraćate
          na besplatan plan.
        </div>
        <Link href="/pretplate?trial=1" className={styles.btn}>
          Aktiviraj 30 dana besplatno →
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.paywall}>
      <div className={styles.icon}>
        <LockIcon />
      </div>
      <div className={styles.text}>
        <strong>{what}</strong> dostupno je uz <strong>Pro</strong> ili{" "}
        <strong>Business</strong> pretplatu. Vaši uneseni podaci se čuvaju, 
        kada aktivirate pretplatu, samo kliknite preuzmi.
      </div>
      <Link href="/pretplate" className={styles.btn}>
        Pogledaj pretplate →
      </Link>
    </div>
  );
}
