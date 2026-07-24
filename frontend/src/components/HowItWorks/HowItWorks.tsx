"use client";

// "Kako radi": interaktivni koraci lijevo (auto-smjena na 5s sa progress
// linijom, ručni klik gasi auto-smjenu), browser-mockup desno mijenja
// prikaz po koraku. Mockup podaci; poštuje prefers-reduced-motion.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import styles from "./HowItWorks.module.css";

const STEPS = [
  {
    n: "01",
    title: "Registrujte se besplatno",
    desc: "Kreirajte račun u nekoliko sekundi i odmah dobijete pristup svim alatima: obračun plata, ugovori, obrasci, fakture i PK Office.",
  },
  {
    n: "02",
    title: "Postavite svoju djelatnost",
    desc: "Na profilu dodajte podatke o svojoj firmi ili obrtu i radnicima. Ti podaci se zatim automatski popunjavaju u obrascima.",
  },
  {
    n: "03",
    title: "Vodite klijente (opciono)",
    desc: "Pretplatnici mogu dodavati svoje klijente (fizička i pravna lica) i raditi obrasce za njih. Idealno za knjigovođe i agencije.",
  },
  {
    n: "04",
    title: "Generišite obrasce automatski",
    desc: "Odaberete obrazac, podaci se učitaju iz profila ili klijenta, a PDF je spreman za preuzimanje i sačuvan za sljedeći put.",
  },
];

function Check({ text }: { text: string }) {
  return (
    <div className={styles.checkBadge}>
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path
          d="M2 7.5L5.5 11L12 3.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {text}
    </div>
  );
}

export default function HowItWorks() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });
  const isLoggedIn = !!user;

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(
      () => setCurrent((c) => (c + 1) % STEPS.length),
      5000,
    );
    return () => clearInterval(t);
  }, [inView, paused]);

  function pick(i: number) {
    setCurrent(i);
    setPaused(true); // ručni izbor gasi auto-smjenu
  }

  return (
    <section ref={sectionRef} id="kako" className={styles.section}>
      <div className={styles.label}>Kako radi</div>
      <h2 className={styles.h2}>
        Od registracije do <em>gotovog obrasca</em>
      </h2>

      <div className={styles.grid}>
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <button
              key={s.n}
              type="button"
              onClick={() => pick(i)}
              className={`${styles.step} ${i === current ? styles.stepActive : ""}`}
              aria-expanded={i === current}
            >
              <span className={styles.stepN}>{s.n}</span>
              <span>
                <span className={styles.stepTitle}>{s.title}</span>
                <span className={styles.stepDesc}>{s.desc}</span>
              </span>
              {i === current && !paused && (
                <span key={`p-${current}`} className={styles.progress} />
              )}
            </button>
          ))}
        </div>

        <div className={styles.preview}>
          <div className={styles.chrome}>
            <i /><i /><i />
            <span className={styles.url}>poreznikalkulator.ba</span>
          </div>
          <div className={styles.screen}>
            {/* 01 registracija */}
            <div className={`${styles.pane} ${current === 0 ? styles.paneShow : ""}`}>
              <div className={styles.mockTitle}>Kreirajte račun</div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Email adresa</span>
                <div className={styles.input}>
                  ured@knjigovodstvo.ba
                  <span className={styles.caret} />
                </div>
              </div>
              <div className={styles.field}>
                <span className={styles.fieldLabel}>Lozinka</span>
                <div className={styles.input}>••••••••••</div>
              </div>
              <span className={styles.btnMock}>Registrujte se</span>
            </div>

            {/* 02 djelatnost */}
            <div className={`${styles.pane} ${current === 1 ? styles.paneShow : ""}`}>
              <div className={styles.mockTitle}>Podaci o djelatnosti</div>
              <div className={styles.chipRow}>
                <span className={`${styles.chip} ${styles.chipOn}`}>Obrt</span>
                <span className={styles.chip}>d.o.o.</span>
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Naziv</span>
                  <div className={styles.input}>Obrt &quot;Primjer&quot; Sarajevo</div>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>JIB</span>
                  <div className={styles.input}>4263551120001</div>
                </div>
              </div>
              <div className={styles.row2}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Općina</span>
                  <div className={styles.input}>Sarajevo</div>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Broj radnika</span>
                  <div className={styles.input}>3</div>
                </div>
              </div>
              <span className={`${styles.btnMock} ${styles.btnSage}`}>
                Sačuvaj podatke
              </span>
            </div>

            {/* 03 klijenti */}
            <div className={`${styles.pane} ${current === 2 ? styles.paneShow : ""}`}>
              <div className={styles.mockTitle}>Vaši klijenti</div>
              {[
                ["MH", "Merima H.", "fizičko lice · 4 obrasca"],
                ["TD", "Tehno d.o.o.", "pravno lice · 11 obrazaca"],
                ["AO", "Agro obrt", "obrt · 7 obrazaca"],
              ].map(([av, name, meta]) => (
                <div key={av} className={styles.clientRow}>
                  <span className={styles.avatar}>{av}</span>
                  <span>
                    {name}
                    <span className={styles.clientMeta}>{meta}</span>
                  </span>
                </div>
              ))}
              <span className={styles.btnMock}>+ Dodaj klijenta</span>
            </div>

            {/* 04 obrasci */}
            <div className={`${styles.pane} ${current === 3 ? styles.paneShow : ""}`}>
              <div className={styles.mockTitle}>Generisani dokumenti</div>
              <div className={styles.pdfCard}>
                <span className={styles.pdfIcon}>
                  <span className={styles.pdfLines}>
                    <i /><i /><i />
                  </span>
                </span>
                <span>
                  <strong className={styles.pdfName}>
                    Obracun_plata_07-2026.pdf
                  </strong>
                  <span className={styles.pdfMeta}>
                    platne liste i uplatnice · 3 radnika
                  </span>
                </span>
              </div>
              <div className={styles.pdfCard}>
                <span className={styles.pdfIcon}>
                  <span className={styles.pdfLines}>
                    <i /><i /><i />
                  </span>
                </span>
                <span>
                  <strong className={styles.pdfName}>
                    Sihterica_07-2026.pdf
                  </strong>
                  <span className={styles.pdfMeta}>
                    evidencija radnog vremena · popunjena iz kalendara
                  </span>
                </span>
              </div>
              <span className={`${styles.btnMock} ${styles.btnSage} ${styles.btnGap}`}>
                Preuzmi PDF
              </span>
              <Check text="Sačuvano za sljedeći put" />
            </div>
          </div>
        </div>
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
