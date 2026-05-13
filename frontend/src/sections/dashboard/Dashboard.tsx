"use client";

import Link from "next/link";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconFileInvoice,
  IconAlertCircle,
  IconCircleCheck,
} from "@tabler/icons-react";
import { formatBAM, formatDate } from "src/lib/format";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import styles from "./dashboard.module.css";

const MOCK_TRANSACTIONS = [
  { id: 1, date: "2026-05-08", desc: "Faktura 0042/2026 — Lagermax", amount: 1240.5, dir: "in" as const },
  { id: 2, date: "2026-05-07", desc: "Mjesečna provizija banke", amount: -8.5, dir: "out" as const },
  { id: 3, date: "2026-05-06", desc: "Studio Ena", amount: 480.0, dir: "in" as const },
  { id: 4, date: "2026-05-05", desc: "Akontacija PIO maj", amount: -213.8, dir: "out" as const },
];

const MOCK_OBLIGATIONS = [
  { id: 1, due: "2026-05-15", title: "Akontacija doprinosa za maj", status: "pending" as const },
  { id: 2, due: "2026-05-20", title: "PDV prijava — april", status: "pending" as const },
  { id: 3, due: "2026-05-31", title: "GPD-1051 dopuna", status: "pending" as const },
  { id: 4, due: "2026-04-30", title: "Akontacija doprinosa za april", status: "done" as const },
];

const MONTHS = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

export default function Dashboard() {
  const { data } = usePkOfficeMe();
  const firstName = data?.firstName?.trim();
  const now = new Date();
  const period = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.periodBadge}>{period}</div>
        <h1 className={styles.h1}>
          {firstName ? `Dobar dan, ${firstName}` : "Dobar dan"}
          <em>.</em>
        </h1>
        <p className={styles.lead}>
          Evo brzog pregleda tvog obrta za ovaj mjesec. Sve cifre su uživo iz povezanih izvora.
        </p>
      </header>

      <div className={styles.metricGrid}>
        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconSuccess}`}>
            <IconArrowDownLeft size={22} />
          </div>
          <p className={styles.metricLabel}>Prilivi</p>
          <p className={styles.metricValue}>{formatBAM(8420.5)}</p>
          <p className={`${styles.metricDelta} ${styles.metricDeltaUp}`}>
            +12% od prošlog mjeseca
          </p>
        </div>

        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconNeutral}`}>
            <IconArrowUpRight size={22} />
          </div>
          <p className={styles.metricLabel}>Odlivi</p>
          <p className={styles.metricValue}>{formatBAM(3175.2)}</p>
          <p className={styles.metricDelta}>ovaj mjesec</p>
        </div>

        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconInfo}`}>
            <IconFileInvoice size={22} />
          </div>
          <p className={styles.metricLabel}>Otvorene fakture</p>
          <p className={styles.metricValue}>6</p>
          <p className={styles.metricDelta}>{formatBAM(2840)} ukupno</p>
        </div>

        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconWarning}`}>
            <IconAlertCircle size={22} />
          </div>
          <p className={styles.metricLabel}>Nepovezane transakcije</p>
          <p className={styles.metricValue}>12</p>
          <p className={`${styles.metricDelta} ${styles.metricDeltaWarn}`}>
            treba pregled
          </p>
        </div>
      </div>

      <div className={styles.sectionGrid}>
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionTitleWrap}>
              <h2 className={styles.sectionTitle}>Posljednje transakcije</h2>
              <p className={styles.sectionSubtitle}>4 stavke ovaj tjedan</p>
            </div>
            <Link href="/app/transakcije" className={styles.sectionLink}>
              Sve →
            </Link>
          </header>
          <div className={styles.sectionBody}>
            {MOCK_TRANSACTIONS.map((t) => (
              <div key={t.id} className={styles.row}>
                <span
                  className={`${styles.rowIcon} ${
                    t.dir === "in" ? styles.rowIconIn : styles.rowIconOut
                  }`}
                >
                  {t.dir === "in" ? (
                    <IconArrowDownLeft size={18} />
                  ) : (
                    <IconArrowUpRight size={18} />
                  )}
                </span>
                <div className={styles.rowMain}>
                  <p className={styles.rowTitle}>{t.desc}</p>
                  <p className={styles.rowMeta}>{formatDate(t.date)}</p>
                </div>
                <div
                  className={`${styles.rowAmount} ${
                    t.dir === "in" ? styles.rowAmountIn : ""
                  }`}
                >
                  {t.dir === "in" ? "+" : ""}
                  {formatBAM(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionTitleWrap}>
              <h2 className={styles.sectionTitle}>Predstojeće obaveze</h2>
              <p className={styles.sectionSubtitle}>
                3 na čekanju · 1 završeno
              </p>
            </div>
            <Link href="/app/obrasci" className={styles.sectionLink}>
              Sve →
            </Link>
          </header>
          <div className={styles.sectionBody}>
            {MOCK_OBLIGATIONS.map((o) => (
              <div key={o.id} className={styles.row}>
                <span
                  className={`${styles.rowIcon} ${
                    o.status === "done"
                      ? styles.rowIconDone
                      : styles.rowIconPending
                  }`}
                >
                  {o.status === "done" ? (
                    <IconCircleCheck size={18} />
                  ) : (
                    <IconAlertCircle size={18} />
                  )}
                </span>
                <div className={styles.rowMain}>
                  <p className={styles.rowTitle}>{o.title}</p>
                  <p className={styles.rowMeta}>rok {formatDate(o.due)}</p>
                </div>
                <span
                  className={`${styles.rowStatus} ${
                    o.status === "done"
                      ? styles.rowStatusDone
                      : styles.rowStatusPending
                  }`}
                >
                  {o.status === "done" ? "gotovo" : "čeka"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
