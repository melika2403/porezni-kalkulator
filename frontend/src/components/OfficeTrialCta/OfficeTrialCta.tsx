"use client";

/* Jedinstveni poziv na probni period (30 dana). Zamjena za nekadašnji PRO
   trial: proba ide na nivou PK Office Tima i UZ NJU IDU SVE BUSINESS
   FUNKCIJE na marketing dijelu (ugovori, plate bez limita, fakture,
   klijenti), pa isti CTA radi i za korisnika koji PK Office nikad neće
   otvoriti.

   Odredište linka po stanju korisnika:
   - neprijavljen  -> registracija sa next=/pretplate?officeTrial=auto
                      (backend aktivira probu pri potvrdi maila)
   - prijavljen    -> /pretplate?officeTrial=auto (aktivira odmah)
   - proba potrošena / već ima Office -> nema CTA (useOfficeTrial javlja
     available=false, pozivalac tada prikaže običnu poruku o pretplati). */

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { startPkOfficeTrial } from "src/api/pkOffice";
import { objaviTrialAktiviran } from "src/components/TrialToast/TrialToast";
import styles from "./OfficeTrialCta.module.css";

export const OFFICE_TRIAL_ACTIVATE_URL = "/pretplate?officeTrial=auto";
// Solo proba (jedan obrt): zatražena sa /freelancer landinga
export const OFFICE_SOLO_TRIAL_ACTIVATE_URL = "/pretplate?officeTrial=auto&trialPlan=solo";
export const OFFICE_SOLO_TRIAL_REGISTER_URL = `/registracija?next=${encodeURIComponent(
  OFFICE_SOLO_TRIAL_ACTIVATE_URL,
)}`;
export const OFFICE_TRIAL_REGISTER_URL = `/registracija?next=${encodeURIComponent(
  OFFICE_TRIAL_ACTIVATE_URL,
)}`;

/** Stanje probe za trenutnog korisnika (bez dodatnog zahtjeva, dijeli ["me"]). */
export function useOfficeTrial() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });

  const anonymous = !isLoading && !user;
  // proba je jednokratna: čim je pkOfficeTrialEndsAt postavljen (traje ili je
  // istekao), više se ne nudi
  const used = !!user?.pkOfficeTrialEndsAt;
  // proba trenutno traje (reklame za PK Office se tada ne prikazuju)
  const trialActive =
    !!user?.pkOfficeTrialEndsAt &&
    new Date(user.pkOfficeTrialEndsAt).getTime() > Date.now();
  // Office pretplatnika prepoznajemo po planu pretplate (office_*)
  const hasOfficePlan = String(user?.subscription?.plan ?? "")
    .toLowerCase()
    .startsWith("office");
  // Paket vrijedi samo dok pretplata traje: /me vraća red pretplate i poslije
  // isteka (isActive: false, plan ostaje office_*), pa bi bez ove provjere
  // bivši klijent zauvijek prolazio kao aktivan pretplatnik.
  const officeAktivan = hasOfficePlan && !!user?.subscription?.isActive;
  // Rola u bazi (ne efektivna): PRO/BUSINESS znači plaćen paket. Office
  // pretplatniku rola ostaje USER, njega hvata hasOfficePlan.
  const paidPlan =
    hasOfficePlan ||
    user?.role === "PRO" ||
    user?.role === "BUSINESS" ||
    user?.role === "ADMIN";

  return {
    isLoading,
    anonymous,
    /** Proba je iskorištena (traje ili je istekla). */
    used,
    /** Office proba trenutno traje. */
    trialActive,
    /** Ima PK Office paket koji JOŠ VRIJEDI (istekao paket se ne računa). */
    officeAktivan,
    /** Smije li se ponuditi proba (nije je koristio i nema Office paket). */
    available: !isLoading && !used && !hasOfficePlan,
    /**
     * Korisnik već plaća neki paket. Proba mu tehnički jeste moguća (i može je
     * pokrenuti sa /pretplate#pk-office kad želi vidjeti PK Office), ali se NE
     * gura na paywall-ovima: tamo Pro pretplatniku ide nadogradnja na Business,
     * jer bi mu proba dala Business funkcije besplatno i potrošila mu jedinu
     * probu na nešto što nije PK Office.
     */
    paidPlan,
    href: anonymous ? OFFICE_TRIAL_REGISTER_URL : OFFICE_TRIAL_ACTIVATE_URL,
  };
}

function BriefcaseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Isti briefcase kao PK Office sidebar i navbar dugme */}
      <path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
      <path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />
      <path d="M12 12l0 .01" />
      <path d="M3 13a20 20 0 0 0 18 0" />
    </svg>
  );
}

type Props = {
  /** Prvi red: šta se otključava, npr. "Generisanje ugovora o djelu". */
  what?: string;
  /** Tekst dugmeta. */
  cta?: string;
  /** "banner" (tamnozelena traka, default) ili "card" (uspravno, za prazna stanja). */
  variant?: "banner" | "card";
  className?: string;
  /** "office_1" = Solo proba (jedan obrt), inače opšta proba na nivou Tim. */
  plan?: "office_1" | null;
};

export default function OfficeTrialCta({
  what,
  cta = "Aktiviraj 30 dana besplatno",
  variant = "banner",
  className,
  plan = null,
}: Props) {
  const { anonymous, href: opstiHref } = useOfficeTrial();
  const href =
    plan === "office_1"
      ? anonymous
        ? OFFICE_SOLO_TRIAL_REGISTER_URL
        : OFFICE_SOLO_TRIAL_ACTIVATE_URL
      : opstiHref;
  const queryClient = useQueryClient();
  const [greska, setGreska] = useState<string | null>(null);

  // Prijavljen korisnik probu aktivira NA LICU MJESTA: ostaje na svojoj
  // stranici (uneseni podaci obrasca se ne gube), potvrdu sa datumom isteka
  // pokaže globalni TrialToast, a osvježen ["me"] otključa dugmad okolo.
  const aktiviraj = useMutation({
    mutationFn: async () => {
      const res = await startPkOfficeTrial(plan);
      if (!res.ok) throw new Error(res.error || "GRESKA");
      return res.data;
    },
    onSuccess: async (data) => {
      setGreska(null);
      objaviTrialAktiviran(data?.trialEndsAt ?? null);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => {
      setGreska(
        e.message === "TRIAL_ALREADY_USED"
          ? "Probni period je već iskorišten."
          : e.message === "ALREADY_SUBSCRIBED"
            ? "Već imate aktivnu pretplatu."
            : "Greška pri aktivaciji, pokušajte ponovo.",
      );
    },
  });

  return (
    <div className={`${styles.host} ${className ?? ""}`}>
      <div
        className={[styles.wrap, variant === "card" ? styles.card : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <span className={styles.icon}>
          <BriefcaseIcon />
        </span>
        <div className={styles.body}>
          <div className={styles.title}>
            {what ? (
              <>
                <strong>{what}</strong> dobijate u probnom periodu
              </>
            ) : (
              <>30 dana besplatno, bez kartice</>
            )}
          </div>
          <p className={styles.desc}>
            Proba otključava <strong>PK Office</strong> (knjige, PDV, plate,
            bankovni izvodi) i <strong>sve Business funkcije</strong> na
            Poreznom Kalkulatoru: ugovore, obračune plata bez limita, fakture i
            klijente. Nakon 30 dana se automatski vraćate na besplatan plan.
          </p>
          {greska && <p className={styles.error}>{greska}</p>}
        </div>
        {anonymous ? (
          <Link href={href} className={styles.btn}>
            Registruj se i probaj besplatno →
          </Link>
        ) : (
          <button
            type="button"
            className={styles.btn}
            onClick={() => aktiviraj.mutate()}
            disabled={aktiviraj.isPending}
          >
            {aktiviraj.isPending ? "Aktiviram..." : `${cta} →`}
          </button>
        )}
      </div>
    </div>
  );
}
