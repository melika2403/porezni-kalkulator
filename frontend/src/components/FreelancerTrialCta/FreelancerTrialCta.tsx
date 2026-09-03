"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import {
  FREELANCER_CIJENA_KM,
  getPristup,
  startFreelancerProba,
  type FreelancerPristup,
} from "src/api/freelancer";
import { trackEvent } from "src/api/activity";
import styles from "./FreelancerTrialCta.module.css";

// PK Freelancer proba (30 dana), ZASEBNA od PK Office probe: svoj datum na
// korisniku, aktivira se jednim klikom ovdje (na /ams i /freelancer), bez
// biranja obrta. Isti hook koriste i stranice da znaju ima li korisnik pristup.

export const FREELANCER_QUERY_KEY = ["freelancer-pristup"] as const;
export const FREELANCER_REGISTER_URL = `/registracija?next=${encodeURIComponent("/freelancer")}`;
export const FREELANCER_PRETPLATA_URL = "/pretplate?plan=FREELANCER";

export function useFreelancerPristup() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });
  const pristup = useQuery<FreelancerPristup>({
    queryKey: FREELANCER_QUERY_KEY,
    queryFn: () => unwrap(getPristup()),
    enabled: !!user,
    retry: false,
    // hook stoji i na naslovnoj (kartica PK Freelancer), pa se bez ovoga
    // pristup ponovo dohvata na svaki povratak fokusa; izmjene pristupa
    // (proba, paket) ionako same ponište keš kroz useOsvjeziEvidenciju
    staleTime: 5 * 60 * 1000,
  });
  return {
    user: user ?? null,
    isLoading: userLoading || (!!user && pristup.isLoading),
    anonymous: !userLoading && !user,
    pristup: pristup.data ?? null,
    hasAccess: pristup.data?.hasAccess ?? false,
    refetch: pristup.refetch,
  };
}

type Props = {
  /** Šta se otključava, npr. "Čuvanje više od 3 uplate godišnje". */
  what?: string;
  variant?: "banner" | "inline";
  className?: string;
};

function BriefcaseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  );
}

export default function FreelancerTrialCta({
  what = "PK Freelancer: evidencija bez ograničenja, podsjetnici, GPD i potvrda o prihodima",
  variant = "banner",
  className = "",
}: Props) {
  const qc = useQueryClient();
  const { anonymous, isLoading, pristup, hasAccess } = useFreelancerPristup();

  const proba = useMutation({
    mutationFn: async () => {
      const res = await startFreelancerProba();
      if (!res.ok) throw new Error(res.error || "GRESKA");
      return res.data;
    },
    onSuccess: () => {
      trackEvent("FREELANCER_PROBA_START", "cta");
      qc.invalidateQueries({ queryKey: FREELANCER_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  if (isLoading || hasAccess) return null;

  const iskoristena = !!pristup?.proba.iskoristena;
  const greska =
    proba.error instanceof Error
      ? proba.error.message === "TRIAL_ALREADY_USED"
        ? "Proba je već iskorištena."
        : proba.error.message === "ALREADY_SUBSCRIBED"
          ? "Već imate pristup."
          : "Aktivacija nije uspjela. Pokušajte ponovo."
      : null;

  return (
    <div className={`${styles.wrap} ${variant === "inline" ? styles.inline : ""} ${className}`}>
      <span className={styles.icon}>
        <BriefcaseIcon />
      </span>
      <div className={styles.body}>
        <div className={styles.title}>
          {iskoristena
            ? `PK Freelancer, ${FREELANCER_CIJENA_KM} KM godišnje sa PDV-om`
            : "Isprobaj PK Freelancer 30 dana besplatno"}
        </div>
        <div className={styles.desc}>{what}</div>
        {greska && <div className={styles.error}>{greska}</div>}
      </div>
      {anonymous ? (
        <Link href={FREELANCER_REGISTER_URL} className={styles.btn}>
          Registruj se i probaj besplatno
        </Link>
      ) : iskoristena ? (
        <Link href={FREELANCER_PRETPLATA_URL} className={styles.btn}>
          Zatraži predračun
        </Link>
      ) : (
        <button
          type="button"
          className={styles.btn}
          onClick={() => proba.mutate()}
          disabled={proba.isPending}
        >
          {proba.isPending ? "Aktiviram..." : "Aktiviraj 30 dana besplatno"}
        </button>
      )}
    </div>
  );
}
