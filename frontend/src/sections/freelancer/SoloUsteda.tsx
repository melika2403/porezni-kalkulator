"use client";

import { useState } from "react";
import { PLAN_PRICING, calcGross, formatKm } from "src/data/pricing";
import { parseKm } from "src/lib/amountInput";
import styles from "./SoloUsteda.module.css";

const PODRAZUMIJEVANO_MJESECNO = 100;

/**
 * Kalkulator uštede za PK Office Solo: godišnji trošak knjigovođe naspram cijene
 * Sola sa PDV-om. Dijeli ga reklama na /freelancer (SoloReklama) i landing /solo,
 * pa tekst i računica žive na jednom mjestu. Stilovi su za tamnu podlogu
 * (tamnozelena kartica), pa se koristi samo tamo.
 */
export default function SoloUsteda({ className }: { className?: string } = {}) {
  const [mjesecno, setMjesecno] = useState(String(PODRAZUMIJEVANO_MJESECNO));
  // parseKm razumije "1.000" (tačke hiljada) i "100,50" (zarez decimale)
  const mjesecnoBroj = parseKm(mjesecno) ?? 0;
  const godisnjeKnjigovodja = mjesecnoBroj * 12;
  const soloBruto = calcGross(PLAN_PRICING.OFFICE_1.yearly);
  const usteda = godisnjeKnjigovodja - soloBruto;

  return (
    <div className={[styles.usteda, className].filter(Boolean).join(" ")}>
      <label className={styles.unos}>
        <span>Koliko mjesečno plaćate knjigovođu?</span>
        <span className={styles.polje}>
          <input
            inputMode="numeric"
            value={mjesecno}
            onChange={(e) => setMjesecno(e.target.value.replace(/[^\d,.]/g, "").slice(0, 8))}
            aria-label="Mjesečni trošak knjigovođe u KM"
          />
          <span>KM</span>
        </span>
      </label>
      <div className={styles.rezultat}>
        <div>
          <span>Knjigovođa godišnje</span>
          <strong>{formatKm(godisnjeKnjigovodja)} KM</strong>
        </div>
        <div>
          <span>PK Office Solo godišnje</span>
          <strong>{formatKm(soloBruto)} KM</strong>
        </div>
        <div className={styles.iznos}>
          <span>{usteda >= 0 ? "Ušteda godišnje" : "Razlika godišnje"}</span>
          <strong>{formatKm(Math.abs(usteda))} KM</strong>
        </div>
      </div>
      <p className={styles.napomena}>
        Za obrt sa jednim vlasnikom, bez radnika i bez PDV-a, Solo pokriva sve što
        knjigovođa radi mjesečno. Ako imate radnike ili robu, u Solu ih uključite kao
        dodatne module, obračun je isti kao u punom PK Office-u.
      </p>
    </div>
  );
}
