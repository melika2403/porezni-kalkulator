"use client";

import Link from "next/link";
import styles from "./FinalCta.module.css";
import { useMe } from "src/hooks/useMe";

// Završni CTA na dnu početne: ko doskroluje dovde je zagrijan, a stranica se
// prije završavala u footer bez ikakvog poziva na akciju. Poziv na
// registraciju ima smisla samo za goste, ulogovanima se ne prikazuje.
export default function FinalCta() {
  const user = useMe();
  if (user) return null;
  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <h2 className={styles.h2}>
          Počnite danas,
          <br />
          <em>prvi dokument za par minuta.</em>
        </h2>
        <p className={styles.sub}>
          Registracija traži samo ime, email i lozinku. Novi korisnici mogu
          aktivirati 30 dana besplatno: PK Office i sve Business funkcije,
          bez kartice.
        </p>
        <Link href="/registracija" className={styles.btn}>
          Registruj se besplatno
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
        <p className={styles.note}>
          Besplatni alati ostaju besplatni i bez pretplate.
        </p>
      </div>
    </section>
  );
}
