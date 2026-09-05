"use client";

/* Poziv na Solo probu za landing /solo. Odredište bira dijeljeni hook
   useProbaOdrediste("office_1") (isti kao reklama uz SPR/GPD i SoloReklama),
   ovdje se bira samo tekst dugmeta i element (app je na drugoj subdomeni u
   produkciji, pa pun <a>, ne klijentska navigacija). */

import Link from "next/link";
import type { ElementType } from "react";
import { IconArrowRight } from "@tabler/icons-react";
import { trackEvent } from "src/api/activity";
import { useProbaOdrediste, type ProbaOdrediste } from "src/components/OfficeTrialCta/OfficeTrialCta";
import styles from "src/sections/pk-office-landing/pkOffice.module.css";

const TEKST: Record<ProbaOdrediste["vrsta"], string> = {
  registracija: "Isprobaj Solo 30 dana besplatno",
  proba: "Isprobaj Solo 30 dana besplatno",
  app: "Otvori PK Office",
  predracun: "Zatraži predračun za Solo",
  cjenovnik: "Pogledaj Solo u cjenovniku",
};

export default function SoloCta({
  className = styles.btnPrimary,
  izvor,
}: {
  /** Stil dugmeta; podrazumijevano sage primarno dugme landinga. */
  className?: string;
  /** Odakle je klik (admin Aktivnost, događaj OFFICE_SOLO_PROMO_KLIK). */
  izvor: string;
}) {
  const { vrsta, href } = useProbaOdrediste("office_1");
  const Tag: ElementType = vrsta === "app" ? "a" : Link;
  return (
    <Tag href={href} className={className} onClick={() => trackEvent("OFFICE_SOLO_PROMO_KLIK", izvor)}>
      {TEKST[vrsta]}
      <IconArrowRight size={17} />
    </Tag>
  );
}
