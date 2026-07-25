"use client";

/* Globalna potvrda aktivacije probnog perioda. Stoji u root layoutu, pa
   preživi nestanak paywall-a sa kojeg je proba pokrenuta (čim se ["me"]
   osvježi, dugme za preuzimanje zamijeni paywall i njegov toast bi otišao
   sa njim). Okida se window eventom, bez konteksta i bez providera. */

import { useEffect, useState } from "react";
import styles from "./TrialToast.module.css";

export const TRIAL_ACTIVATED_EVENT = "pk:trial-activated";

/** Javi cijeloj aplikaciji da je proba upravo aktivirana. */
export function objaviTrialAktiviran(trialEndsAt: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(TRIAL_ACTIVATED_EVENT, { detail: { trialEndsAt } }),
  );
}

function formatDan(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}.`;
}

export default function TrialToast() {
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onTrial(e: Event) {
      const detail = (e as CustomEvent<{ trialEndsAt: string | null }>).detail;
      setEndsAt(detail?.trialEndsAt ?? null);
      setOpen(true);
    }
    window.addEventListener(TRIAL_ACTIVATED_EVENT, onTrial);
    return () => window.removeEventListener(TRIAL_ACTIVATED_EVENT, onTrial);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 12000);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const dan = formatDan(endsAt);

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <span className={styles.check} aria-hidden="true">
        ✓
      </span>
      <div className={styles.body}>
        <div className={styles.title}>Probni period je aktiviran</div>
        <p className={styles.text}>
          Sve je otključano{dan ? ` do ${dan}` : ""}: PK Office i sve Business
          funkcije. Nastavite tu gdje ste stali, dugme za preuzimanje je sada
          dostupno.
        </p>
      </div>
      <button
        type="button"
        className={styles.close}
        onClick={() => setOpen(false)}
        aria-label="Zatvori obavijest"
      >
        ✕
      </button>
    </div>
  );
}
