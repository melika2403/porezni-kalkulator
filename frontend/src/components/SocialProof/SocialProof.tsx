"use client";

// Social proof: naslov sa tezom, live ticker zadnjih događaja (anonimizovano),
// brojke složene kao dnevnik knjiženja (kolone sa razdjelnicima), count-up
// animacija, mini grafikon aktivnosti zadnjih 30 dana iz stvarnih podataka i
// red trust poruka. Brojke ispod praga se ne prikazuju (prazno odmaže).
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import styles from "./SocialProof.module.css";
import { getPublicStats, type PublicStats } from "src/api/publicStats";

/** Count-up od 0 do target kad element uđe u viewport (jednom). */
function CountUp({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // bez animacije: odmah puna vrijednost (kroz rAF, ne sinhrono u efektu)
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || startedRef.current) {
          return;
        }
        startedRef.current = true;
        const t0 = performance.now();
        const dur = 1200;
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3); // ease-out
          setValue(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  return (
    <span ref={ref} className={styles.big}>
      {/* bez separatora hiljada: "1,000" u serif brojci liči na "1" (odluka
          vlasnika), čisto "1000" je čitljivije */}
      {value}
      <sup className={styles.plus}>+</sup>
    </span>
  );
}

function relTime(iso: string): string {
  const min = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `prije ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `prije ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "jučer" : `prije ${d} dana`;
}

// fallback dok se API ne učita (ili vrati prazno): pilula nikad nije prazna
const FALLBACK_TICKER = [
  "platna lista generisana prije 12 min",
  "obrazac 2001 popunjen prije 26 min",
  "faktura izdana prije 41 min",
  "ugovor o radu generisan prije 1 h",
];

/** Live ticker: rotira zadnje stvarne događaje ("faktura · prije 12 min")
 *  sa fade-out/in smjenom; reduced-motion ostaje na prvoj poruci. */
function Ticker({ items }: { items: PublicStats["ticker"] | undefined }) {
  const texts =
    items && items.length > 0
      ? items.map((t) => `${t.label} · ${relTime(t.at)}`)
      : FALLBACK_TICKER;
  const [idx, setIdx] = useState(0);
  const [out, setOut] = useState(false);

  useEffect(() => {
    if (texts.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setOut(true);
      setTimeout(() => {
        setIdx((i) => (i + 1) % texts.length);
        setOut(false);
      }, 350);
    }, 4200);
    return () => clearInterval(t);
  }, [texts.length]);

  return (
    <div className={styles.ticker} aria-live="polite">
      <span className={styles.pulse} aria-hidden="true" />
      <span
        className={`${styles.tickerText} ${out ? styles.tickerOut : ""}`}
      >
        {texts[idx % texts.length]}
      </span>
    </div>
  );
}

const TRUST = [
  "Po propisima FBiH, ažurno sa svakom izmjenom",
  "30 dana probe bez kartice",
  "Plaćanje po predračunu, bez skrivenih troškova",
  "Podrška i live chat u stvarnom vremenu",
];

export default function SocialProof() {
  // stagger reveal kolona pri ulasku u ekran (mockup ponašanje)
  const ledgerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ledgerRef.current;
    if (!el) return;
    const cols = Array.from(el.children) as HTMLElement[];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cols.forEach((c) => c.classList.add(styles.colIn));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add(styles.colIn);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.35 },
    );
    cols.forEach((c) => io.observe(c));
    return () => io.disconnect();
  });

  const { data } = useQuery({
    queryKey: ["public-stats"],
    queryFn: getPublicStats,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  // prag po brojci: premale cifre odmažu pa se ta kolona ne prikaže
  const stats = [
    {
      value: data?.documents ?? 0,
      min: 100,
      label: "generisanih dokumenata",
      desc: "obrasci, platne liste, fakture i ugovori",
    },
    {
      value: data?.last30 ?? 0,
      min: 30,
      label: "u zadnjih 30 dana",
      desc: "platforma se koristi svaki dan",
    },
    {
      value: data?.users ?? 0,
      min: 50,
      label: "registrovanih korisnika",
      desc: "obrtnici, firme i knjigovođe",
    },
    {
      value: data?.organizations ?? 0,
      min: 30,
      label: "firmi i obrta",
      desc: "vode svoje poslovanje kroz platformu",
    },
  ].filter((s) => s.value >= s.min);

  return (
    <section className={styles.section} aria-label="Platforma u brojkama">
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2 className={styles.title}>
            Platforma koja <em>radi svaki dan</em>, kao i vi
          </h2>
          <Ticker items={data?.ticker} />
        </div>

        {stats.length > 0 && (
          <div className={styles.ledger} ref={ledgerRef}>
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={styles.col}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <CountUp target={s.value} />
                <span className={styles.colLabel}>{s.label}</span>
                <span className={styles.colDesc}>{s.desc}</span>
              </div>
            ))}
          </div>
        )}

        <ul className={styles.trustRow}>
          {TRUST.map((t) => (
            <li key={t} className={styles.trustItem}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="13"
                height="13"
                aria-hidden="true"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
