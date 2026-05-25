"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { useRole } from "src/hooks/useRole";
import styles from "./GeneratePaywall.module.css";

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
        : "/pretplate?trial=1";
    return (
      <div className={styles.paywall}>
        <div className={styles.icon}>🎁</div>
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
          <div className={styles.icon}>🔒</div>
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
        <div className={styles.icon}>🔒</div>
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
        <div className={styles.icon}>🎁</div>
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
      <div className={styles.icon}>🔒</div>
      <div className={styles.text}>
        <strong>{what}</strong> dostupno je uz <strong>Pro</strong> ili{" "}
        <strong>Business</strong> pretplatu. Vaši uneseni podaci se čuvaju —
        kada aktivirate pretplatu, samo kliknite preuzmi.
      </div>
      <Link href="/pretplate" className={styles.btn}>
        Pogledaj pretplate →
      </Link>
    </div>
  );
}
