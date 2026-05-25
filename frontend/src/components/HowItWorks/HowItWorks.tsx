"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    num: "01",
    title: "Registrujte se besplatno",
    desc: "Kreirajte račun u nekoliko sekundi i odmah dobijete pristup svim alatima: SPR, ugovori, amortizacija i drugi obrasci.",
  },
  {
    num: "02",
    title: "Postavite svoju djelatnost",
    desc: "Na profilu dodajte podatke o svojoj firmi ili obrtu i radnicima. Ti podaci se zatim automatski popunjavaju u obrascima.",
  },
  {
    num: "03",
    title: "Vodite klijente (opciono)",
    desc: "Pretplatnici mogu dodavati svoje klijente (fizička i pravna lica) i raditi obrasce za njih. Idealno za knjigovođe i agencije.",
  },
  {
    num: "04",
    title: "Generišite obrasce automatski",
    desc: "Odaberite obrazac, kliknite “Popuni podatke” i sve se učita iz vašeg profila ili klijenta. PDF je spreman za preuzimanje i sačuvan za sljedeći put.",
  },
];

export default function HowItWorks() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });

  const isLoggedIn = !!user;

  return (
    <section id="kako" className={styles.section}>
      <div className={styles.label}>Kako radi</div>
      <h2 className={styles.h2}>
        Od registracije do
        <br />
        <em>gotovog obrasca</em>
      </h2>
      <div className={styles.steps}>
        {STEPS.map((step) => (
          <div key={step.num} className={styles.step}>
            <div className={styles.stepHeader}>
              <span className={styles.num}>{step.num}</span>
              <span className={styles.connector} />
            </div>
            <div className={styles.title}>{step.title}</div>
            <div className={styles.desc}>{step.desc}</div>
          </div>
        ))}
      </div>

      {!isLoading && !isLoggedIn && (
        <div className={styles.cta}>
          <Link href="/registracija" className={styles.ctaBtn}>
            Registrirajte se besplatno
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
          <p className={styles.ctaNote}>
            Bez kartice. Pristup svim besplatnim alatima u par sekundi.
          </p>
        </div>
      )}
    </section>
  );
}
