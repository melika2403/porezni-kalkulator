"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./ConsentBanner.module.css";

type Choice = "accepted" | "essential" | null;

const STORAGE_KEY = "cookieConsent";

// Globalna gtag funkcija postavljena u app/layout.tsx
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function applyConsent(choice: "accepted" | "essential") {
  if (typeof window === "undefined" || !window.gtag) return;
  if (choice === "accepted") {
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  } else {
    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }
}

export default function ConsentBanner() {
  const [choice, setChoice] = useState<Choice>(null);
  const [hydrated, setHydrated] = useState(false);

  // Čitaj sačuvanu odluku iz localStorage tek nakon mount-a (izbjegnemo
  // hydration mismatch sa SSR-om).
  useEffect(() => {
    setHydrated(true);
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "accepted" || saved === "essential") {
        setChoice(saved);
        applyConsent(saved);
      }
    } catch {}
  }, []);

  const handleAccept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {}
    setChoice("accepted");
    applyConsent("accepted");
  };

  const handleEssential = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "essential");
    } catch {}
    setChoice("essential");
    applyConsent("essential");
  };

  // Ne renderuj banner dok ne hidriramo (sprečava flash dok čitamo localStorage).
  if (!hydrated || choice !== null) return null;

  return (
    <div className={styles.banner} role="dialog" aria-label="Kolačići i privatnost">
      <div className={styles.content}>
        <div className={styles.text}>
          <strong>Koristimo kolačiće.</strong> Ova stranica koristi kolačiće
          za analitiku posjeta (Google Analytics) i oglase (Google AdSense)
          kako bismo poboljšali sadržaj i podržali besplatne alate. Detalji
          u{" "}
          <Link href="/privatnost" className={styles.link}>
            Politici privatnosti
          </Link>
          .
        </div>
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleEssential}
          >
            Samo neophodni
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleAccept}
          >
            Prihvati sve
          </button>
        </div>
      </div>
    </div>
  );
}
