"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import styles from "./PreviewRegisterGate.module.css";

type Props = {
  /** Naslov stranice prikazane iznad gate kartice (npr. "Obračun plata"). */
  pageLabel: string;
  /** Glavni h1 — može uključivati JSX (npr. <em>). */
  pageTitle: React.ReactNode;
  /** Kratak opis stranice (~ 1 rečenica) prikazan ispod h1 naslova. */
  pageSubtitle: string;
  /** Naziv funkcije u rečenici unutar kartice — npr. "JS3100 obrasca i obračuna plata". */
  featureName: string;
  /**
   * Šta korisnik može uraditi u preview modu (free registracija).
   * Default: "unositi podatke i vidjeti kompletan obračun".
   */
  previewDesc?: string;
  /**
   * Šta otključava Pro pretplata. Ako nije zadato, kartica ne spominje Pro
   * (funkcija je dostupna SAMO uz besplatnu registraciju, npr. amortizacija).
   */
  proUnlocks?: string;
  /**
   * Opcioni tier — "PRO" (default), "BUSINESS" za funkcije koje zahtijevaju
   * Business pretplatu, ili "REG" za funkcije koje treba samo registracija
   * (bez bilo kakve pretplate).
   */
  tier?: "PRO" | "BUSINESS" | "REG";
};

/**
 * Zajednički gate koji se prikazuje neulogovanim korisnicima na PRO/Business
 * funkcijama. Pruža CTA za besplatnu registraciju (preview) i login link.
 *
 * Za ulogovane korisnike (USER role) ne treba ovaj komponent — oni vide
 * preview unutar same stranice + GeneratePaywall na download dugmadima.
 */
export default function PreviewRegisterGate({
  pageLabel,
  pageTitle,
  pageSubtitle,
  featureName,
  previewDesc = "unositi podatke i vidjeti kompletan obračun",
  proUnlocks,
  tier = "PRO",
}: Props) {
  // Pozovi me() da bismo bili sigurni da gate prikazujemo samo neulogovanim.
  // (Ulogovani korisnici treba da direktno vide stranicu — caller ne smije
  // renderovati ovaj komponent ako !!user.)
  useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });

  const isPaidTier =
    (tier === "PRO" || tier === "BUSINESS") && !!proUnlocks;
  const tierLabel = tier === "BUSINESS" ? "Business" : "Pro";
  const cardTitle = isPaidTier
    ? "Registrujte se za preview cijele aplikacije"
    : "Registrujte se da koristite ovu funkciju";

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>{pageLabel}</div>
        <h1 className={styles.h1}>{pageTitle}</h1>
        <p className={styles.subtitle}>{pageSubtitle}</p>
      </div>
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <h2 className={styles.title}>{cardTitle}</h2>
        <p className={styles.text}>
          {isPaidTier ? (
            <>
              Besplatna registracija otključava <strong>preview</strong>{" "}
              {featureName}. Možete {previewDesc}. <strong>{proUnlocks}</strong>{" "}
              dostupno je uz <strong>{tierLabel}</strong> pretplatu.
            </>
          ) : (
            <>
              Besplatna registracija otključava puni pristup {featureName}.
              Možete {previewDesc}. <strong>Bez pretplate.</strong>
            </>
          )}
        </p>
        <div className={styles.actions}>
          <Link href="/registracija" className={styles.btnPrimary}>
            Registruj se besplatno →
          </Link>
          <Link href="/prijava" className={styles.btnSecondary}>
            Već imam račun
          </Link>
        </div>
      </div>
    </main>
  );
}
