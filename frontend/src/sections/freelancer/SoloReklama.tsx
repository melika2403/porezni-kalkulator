"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { PLAN_PRICING, calcGross, formatKm } from "src/data/pricing";
import { trackEvent } from "src/api/activity";
import { useProbaOdrediste } from "src/components/OfficeTrialCta/OfficeTrialCta";
import SoloUsteda from "./SoloUsteda";
import styles from "./freelancer.module.css";

// Šta Solo pokriva umjesto knjigovođe. Tekst prati stvarne funkcije PK Office
// Solo režima (fakture, izvodi, KPR, doprinosi vlasnika, obrasci, uputstva).
const SOLO_FUNKCIJE = [
  "Fakture i predračuni, i na engleskom za strane kupce",
  "Bankovni izvodi se učitaju i proknjiže sami",
  "KPR-1041 i obrasci: SPR, GPD, obračun doprinosa 2002",
  "Doprinosi vlasnika i uplatnice svaki mjesec",
  "Mjesečna lista obaveza i uputstva korak po korak",
  "PK Freelancer uključen u paket",
];

/**
 * Reklama za PK Office Solo ispod cjenovnika PK Freelancera: za korisnika koji
 * ima obrt, pa mu honorar ide kroz obrt. Boje su PK Office-ove (tamnozelena i
 * terakota), namjerno drugačije od šljive, da se vidi da je to drugi proizvod.
 * Kalkulator uštede (SoloUsteda) poredi godišnji trošak knjigovođe sa cijenom
 * Sola sa PDV-om; puna priča o Solu je na /solo.
 */
export default function SoloReklama({
  kompaktno = false,
  izvor = "landing",
}: {
  /** Uski prikaz za bočnu kolonu (evidencija PK Freelancera). */
  kompaktno?: boolean;
  /** Odakle je reklama otvorena, za praćenje klikova u admin Aktivnosti. */
  izvor?: string;
} = {}) {
  // odredište dugmeta po stanju korisnika (gost na registraciju pa Solo probu,
  // prijavljen odmah na probu, potrošena proba na predračun), isti hook kao /solo
  const { vrsta, href: probaHref } = useProbaOdrediste("office_1");
  const probaTekst =
    vrsta === "app"
      ? "Otvori PK Office"
      : vrsta === "predracun"
        ? "Zatraži predračun za Solo"
        : vrsta === "cjenovnik"
          ? "Pogledaj Solo u cjenovniku"
          : null;
  // app je na drugoj subdomeni u produkciji, pa pun <a>
  const ProbaTag: ElementType = vrsta === "app" ? "a" : Link;
  const soloNeto = PLAN_PRICING.OFFICE_1.yearly;
  const soloBruto = calcGross(soloNeto);

  // Bočna verzija (evidencija PK Freelancera): kratko, bez kalkulatora, stane
  // u usku kolonu desno od sadržaja. Puna verzija ostaje na landingu.
  if (kompaktno) {
    return (
      <section className={styles.soloUsko} aria-labelledby="solo-naslov">
        <span className={styles.soloTag}>PK Office Solo</span>
        <h2 id="solo-naslov" className={styles.soloNaslov}>
          Imate obrt? Vodite ga <em>sami.</em>
        </h2>
        <p className={styles.soloTekst}>
          Fakture, izvodi, KPR i doprinosi vlasnika, bez knjigovođe. Svaki mjesec
          lista šta treba uraditi.
        </p>
        <div className={styles.soloIznos}>
          {formatKm(soloNeto)} KM<small>godišnje + PDV, {formatKm(soloBruto)} KM sa PDV-om</small>
        </div>
        <ul className={styles.soloLista}>
          {SOLO_FUNKCIJE.slice(0, 3).map((f) => (
            <li key={f}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
        <div className={styles.soloDugmad}>
          <ProbaTag
            href={probaHref}
            className={styles.soloCta}
            onClick={() => trackEvent("OFFICE_SOLO_PROMO_KLIK", izvor)}
          >
            {probaTekst ?? "Isprobaj 30 dana besplatno"}
          </ProbaTag>
          <Link href="/solo" className={styles.soloLink}>
            Više o PK Office Solu
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.solo} aria-labelledby="solo-naslov">
      <div className={styles.soloGlava}>
        <div>
          <span className={styles.soloTag}>PK Office Solo</span>
          <h2 id="solo-naslov" className={styles.soloNaslov}>
            Imate obrt? Vodite ga <em>sami, bez knjigovođe.</em>
          </h2>
          <p className={styles.soloTekst}>
            Kad honorar ide kroz obrt, umjesto AMS obrasca trebaju vam fakture, izvodi,
            KPR i doprinosi vlasnika. PK Office Solo to radi umjesto knjigovođe: svaki
            mjesec vam kaže šta treba uraditi, a obrasci se popunjavaju iz onoga što ste
            već unijeli.
          </p>
        </div>
        <div className={styles.soloCijena}>
          <div className={styles.soloIznos}>
            {formatKm(soloNeto)} KM<small>godišnje + PDV</small>
          </div>
          <div className={styles.soloCijenaNapomena}>
            {formatKm(soloBruto)} KM sa PDV-om, oko {formatKm(PLAN_PRICING.OFFICE_1.monthly)} KM
            mjesečno. Jedan obrt, 30 dana besplatno.
          </div>
        </div>
      </div>

      <ul className={styles.soloLista}>
        {SOLO_FUNKCIJE.map((f) => (
          <li key={f}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      <SoloUsteda />

      <div className={styles.soloDugmad}>
        {/* proba zatražena odavde je SOLO proba (jedan obrt), ne Office Tim */}
        <ProbaTag
          href={probaHref}
          className={styles.soloCta}
          onClick={() => trackEvent("OFFICE_SOLO_PROMO_KLIK", izvor)}
        >
          {probaTekst ?? "Isprobaj PK Office Solo 30 dana besplatno"}
        </ProbaTag>
        <Link href="/solo" className={styles.soloLink}>
          Više o PK Office Solu
        </Link>
      </div>
    </section>
  );
}
