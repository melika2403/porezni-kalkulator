"use client";

import { useState } from "react";
import Link from "next/link";
import { PLAN_PRICING, calcGross, formatKm } from "src/data/pricing";
import { trackEvent } from "src/api/activity";
import {
  OFFICE_SOLO_TRIAL_ACTIVATE_URL,
  OFFICE_SOLO_TRIAL_REGISTER_URL,
  useOfficeTrial,
} from "src/components/OfficeTrialCta/OfficeTrialCta";
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

const PODRAZUMIJEVANO_MJESECNO = 100;

/**
 * Reklama za PK Office Solo ispod cjenovnika PK Freelancera: za korisnika koji
 * ima obrt, pa mu honorar ide kroz obrt. Boje su PK Office-ove (tamnozelena i
 * terakota), namjerno drugačije od šljive, da se vidi da je to drugi proizvod.
 * Kalkulator uštede poredi godišnji trošak knjigovođe sa cijenom Sola sa PDV-om.
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
  const [mjesecno, setMjesecno] = useState(String(PODRAZUMIJEVANO_MJESECNO));
  // gost ide na registraciju pa na Solo probu, prijavljen odmah na Solo probu
  const { anonymous } = useOfficeTrial();
  const probaHref = anonymous ? OFFICE_SOLO_TRIAL_REGISTER_URL : OFFICE_SOLO_TRIAL_ACTIVATE_URL;
  const mjesecnoBroj = Number(mjesecno.replace(",", ".")) || 0;
  const godisnjeKnjigovodja = mjesecnoBroj * 12;
  const soloNeto = PLAN_PRICING.OFFICE_1.yearly;
  const soloBruto = calcGross(soloNeto);
  const usteda = godisnjeKnjigovodja - soloBruto;

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
          <Link
            href={probaHref}
            className={styles.soloCta}
            onClick={() => trackEvent("OFFICE_SOLO_PROMO_KLIK", izvor)}
          >
            Isprobaj 30 dana besplatno
          </Link>
          <Link href="/pretplate#pk-office" className={styles.soloLink}>
            Svi PK Office paketi
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

      <div className={styles.soloUsteda}>
        <label className={styles.soloUstedaUnos}>
          <span>Koliko mjesečno plaćate knjigovođu?</span>
          <span className={styles.soloUstedaPolje}>
            <input
              inputMode="numeric"
              value={mjesecno}
              onChange={(e) => setMjesecno(e.target.value.replace(/[^\d,.]/g, "").slice(0, 6))}
              aria-label="Mjesečni trošak knjigovođe u KM"
            />
            <span>KM</span>
          </span>
        </label>
        <div className={styles.soloUstedaRezultat}>
          <div>
            <span>Knjigovođa godišnje</span>
            <strong>{formatKm(godisnjeKnjigovodja)} KM</strong>
          </div>
          <div>
            <span>PK Office Solo godišnje</span>
            <strong>{formatKm(soloBruto)} KM</strong>
          </div>
          <div className={styles.soloUstedaIznos}>
            <span>{usteda >= 0 ? "Ušteda godišnje" : "Razlika godišnje"}</span>
            <strong>{formatKm(Math.abs(usteda))} KM</strong>
          </div>
        </div>
        <p className={styles.soloUstedaNapomena}>
          Za obrt sa jednim vlasnikom, bez radnika i bez PDV-a, Solo pokriva sve što
          knjigovođa radi mjesečno. Ako imate radnike ili robu, u Solu ih uključite kao
          dodatne module, obračun je isti kao u punom PK Office-u.
        </p>
      </div>

      <div className={styles.soloDugmad}>
        {/* proba zatražena odavde je SOLO proba (jedan obrt), ne Office Tim */}
        <Link
          href={probaHref}
          className={styles.soloCta}
          onClick={() => trackEvent("OFFICE_SOLO_PROMO_KLIK", izvor)}
        >
          Isprobaj PK Office Solo 30 dana besplatno
        </Link>
        <Link href="/pretplate#pk-office" className={styles.soloLink}>
          Svi PK Office paketi i cijene
        </Link>
      </div>
    </section>
  );
}
