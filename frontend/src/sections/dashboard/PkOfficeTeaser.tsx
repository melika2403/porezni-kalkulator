"use client";

/* Teaser za PK Office prije launcha: izgleda kao prava app (TopBar + Sidebar +
   ekrani), ali sa placeholder podacima i bez interaktivnosti. Sidebar linkovi
   navigiraju izmedju preview ekrana (dashboard, bankovni izvodi); ostalo je
   genericki "uskoro". Prikazuje se svima bez preview pristupa (vidi
   (app)/app/layout.tsx). Launch: PK_OFFICE_PUBLIC=true. */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconMenu2,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconFileInvoice,
  IconAlertCircle,
  IconCircleCheck,
  IconWallet,
  IconCoins,
  IconArrowRight,
  IconBriefcase,
  IconSelector,
  IconArrowLeft,
  IconCloudUpload,
  IconPencilPlus,
  IconReceipt2,
  IconCalendarEvent,
  IconBuildingBank,
  IconFileText,
  IconChevronRight,
  IconClock,
} from "@tabler/icons-react";
import { NAV_GROUPS } from "src/components/app-shell/Sidebar";
import sbStyles from "src/components/app-shell/Sidebar.module.css";
import styles from "./dashboard.module.css";

export function PkOfficeTeaser() {
  const pathname = usePathname() || "/app";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const goMarketing = () => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin.replace("://app.", "://");
    window.location.href = origin === window.location.origin ? "/" : origin;
  };

  const isBank = pathname.startsWith("/app/bankovni-izvodi");
  const isDashboard = pathname === "/app" || pathname.startsWith("/app/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-cream-50 text-text-primary">
      {/* Statički TopBar */}
      <header
        style={{
          height: 54,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1.25rem",
          background: "#ffffff",
          borderBottom: "1px solid #d4cfc4",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Otvori meni"
            className="min-[900px]:hidden -ml-1 p-2 rounded-lg text-text-secondary hover:bg-cream-200 hover:text-text-primary transition-colors"
          >
            <IconMenu2 size={20} />
          </button>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "#3a5c42",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            PK
          </span>
          <strong style={{ fontSize: 15 }}>Porezni Kalkulator</strong>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#c8622a",
            background: "#f7e9df",
            borderRadius: 20,
            padding: "0.25rem 0.7rem",
          }}
        >
          Uskoro
        </span>
      </header>

      <div className="flex flex-1 min-h-0 min-[900px]:h-[calc(100vh-54px)]">
        {/* Mobilni overlay iza drawera */}
        {drawerOpen && (
          <div
            className={sbStyles.overlay}
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
        )}

        {/* Statički Sidebar (replika, bez zivih podataka); linkovi navigiraju
            izmedju preview ekrana. Ispod 900px je drawer (hamburger u TopBar-u). */}
        <aside className={`${sbStyles.sidebar} ${drawerOpen ? sbStyles.open : ""}`}>
          <div className={sbStyles.header}>
            <div className={sbStyles.brand}>
              <span className={sbStyles.brandIcon} aria-hidden>
                <IconBriefcase size={20} stroke={1.8} />
              </span>
              <span className={sbStyles.brandTitle}>PK Office</span>
            </div>
            <div className="w-full flex items-center gap-3 p-3.5 rounded-xl border text-left bg-cream-50 border-cream-300">
              <span className="w-9 h-9 rounded-[10px] bg-brand-600 text-white flex items-center justify-center text-[13px] font-semibold shrink-0">
                DO
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] uppercase tracking-[0.1em] text-text-tertiary leading-none mb-[6px] whitespace-nowrap">
                  Organizacija
                </span>
                <span className="block text-[14px] leading-[1.2] font-medium text-text-primary line-clamp-2">
                  Demo obrt
                </span>
              </span>
              <IconSelector size={19} className="text-text-tertiary shrink-0" />
            </div>
          </div>

          <nav className={sbStyles.nav}>
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi}>
                {group.label && (
                  <div className={sbStyles.groupLabel}>{group.label}</div>
                )}
                <div className={sbStyles.navList}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/") ||
                      (item.href === "/app/dashboard" && pathname === "/app");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setDrawerOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`${sbStyles.navLink} ${active ? sbStyles.navLinkActive : ""}`}
                      >
                        <span className={sbStyles.navIcon}>
                          <Icon size={19} stroke={1.8} />
                        </span>
                        <span className={sbStyles.navLabel}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className={sbStyles.foot}>
            <button
              type="button"
              onClick={goMarketing}
              className={sbStyles.backLink}
              style={{ background: "none", border: 0, cursor: "pointer", width: "100%" }}
            >
              <IconArrowLeft size={18} stroke={1.8} className={sbStyles.backIcon} />
              Nazad na Porezni Kalkulator
            </button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {/* Banner: jasno da je pregled */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.85rem 1.5rem",
              background: "#d6e8d9",
              borderBottom: "1px solid #c2d9c6",
            }}
          >
            <p style={{ margin: 0, fontSize: 13.5, color: "#2d4633" }}>
              <strong>PK Office stiže uskoro.</strong> Ovo je pregled izgleda,
              prikazani podaci su primjer i nisu stvarni.
            </p>
            <button
              type="button"
              onClick={goMarketing}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                background: "#3a5c42",
                border: 0,
                borderRadius: 8,
                padding: "0.5rem 0.95rem",
                cursor: "pointer",
              }}
            >
              Nazad na Porezni Kalkulator
            </button>
          </div>

          {/* Ekran (ne-interaktivno) */}
          <div aria-hidden style={{ pointerEvents: "none", userSelect: "none" }}>
            {isBank ? (
              <BankScreen />
            ) : isDashboard ? (
              <DashboardScreen />
            ) : (
              <UskoroScreen />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── Početna (dashboard) ─────────────────────────────────────────── */

const TX = [
  { id: 1, inn: true, title: "Uplata po fakturi 2026-014", date: "12.06.2026.", amount: "+1.450,00 KM" },
  { id: 2, inn: false, title: "Plaćanje dobavljaču, Veletrgovina d.o.o.", date: "10.06.2026.", amount: "−820,00 KM" },
  { id: 3, inn: true, title: "Uplata po fakturi 2026-013", date: "07.06.2026.", amount: "+2.100,00 KM" },
  { id: 4, inn: false, title: "Doprinosi, mjesečna uplata", date: "05.06.2026.", amount: "−1.310,40 KM" },
];

const OBLIGATIONS = [
  { id: 1, done: false, title: "MIP-1023 za maj", meta: "rok 30.06.2026.", status: "čeka" },
  { id: 2, done: false, title: "PDV prijava", meta: "rok 10.07.2026.", status: "čeka" },
  { id: 3, done: true, title: "Isplata plata, maj", meta: "rok 31.05.2026.", status: "gotovo" },
];

function DashboardScreen() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.periodBadge}>Juni 2026</div>
        <h1 className={styles.h1}>
          Dobar dan<em>.</em>
        </h1>
        <div className={styles.headerMeta}>
          <span>subota, 21. juni 2026.</span>
          <span className={styles.metaDot}>·</span>
          <span className={styles.metaOrg}>Demo obrt</span>
          <span className={styles.orgBadge}>Moj obrt</span>
        </div>
      </header>

      <div className={styles.topGrid}>
        <div className={styles.balanceCard}>
          <p className={styles.balanceLabel}>
            <IconWallet size={15} />
            Trenutno stanje računa
          </p>
          <p className={styles.balanceValue}>14.280,50 KM</p>
          <p className={styles.balanceMeta}>
            UniCredit · stanje sa izvoda 11.06.2026.
          </p>
        </div>

        <div className={styles.balanceCard}>
          <p className={styles.balanceLabel}>
            <IconCoins size={15} />
            Plate · maj 2026.
          </p>
          <div className={styles.payrollRows}>
            <div className={styles.payrollRow}>
              <span className={styles.payrollRowLabel}>Obračun plata</span>
              <span className={`${styles.payrollChip} ${styles.payrollChipOk}`}>
                <IconCircleCheck size={14} />
                obračunate
              </span>
            </div>
            <div className={styles.payrollRow}>
              <span className={styles.payrollRowLabel}>MIP-1023 XML</span>
              <span className={`${styles.payrollChip} ${styles.payrollChipWarn}`}>
                <IconAlertCircle size={14} />
                nije preuzet
              </span>
            </div>
            <span className={styles.payrollCardLink}>
              Obračuni plata
              <IconArrowRight size={14} />
            </span>
          </div>
        </div>
      </div>

      <div className={styles.metricGrid}>
        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconSuccess}`}>
            <IconArrowDownLeft size={22} />
          </div>
          <p className={styles.metricLabel}>Potražuje</p>
          <p className={styles.metricValue}>8.450,00 KM</p>
          <p className={styles.metricDelta}>ovaj mjesec, sa izvoda</p>
        </div>

        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconNeutral}`}>
            <IconArrowUpRight size={22} />
          </div>
          <p className={styles.metricLabel}>Duguje</p>
          <p className={styles.metricValue}>3.120,40 KM</p>
          <p className={styles.metricDelta}>ovaj mjesec, sa izvoda</p>
        </div>

        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconInfo}`}>
            <IconFileInvoice size={22} />
          </div>
          <p className={styles.metricLabel}>Otvorene fakture</p>
          <p className={styles.metricValue}>3</p>
          <p className={styles.metricDelta}>5.640,00 KM ukupno</p>
        </div>

        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconWarning}`}>
            <IconAlertCircle size={22} />
          </div>
          <p className={styles.metricLabel}>Nepovezane transakcije</p>
          <p className={styles.metricValue}>2</p>
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
              <p className={styles.sectionSubtitle}>sa bankovnih izvoda</p>
            </div>
            <span className={styles.sectionLink}>
              Sve
              <IconArrowRight size={14} />
            </span>
          </header>
          <div className={styles.sectionBody}>
            {TX.map((t) => (
              <div key={t.id} className={styles.row}>
                <span
                  className={`${styles.rowIcon} ${
                    t.inn ? styles.rowIconIn : styles.rowIconOut
                  }`}
                >
                  {t.inn ? (
                    <IconArrowDownLeft size={18} />
                  ) : (
                    <IconArrowUpRight size={18} />
                  )}
                </span>
                <div className={styles.rowMain}>
                  <p className={styles.rowTitle}>{t.title}</p>
                  <p className={styles.rowMeta}>{t.date}</p>
                </div>
                <div
                  className={`${styles.rowAmount} ${
                    t.inn ? styles.rowAmountIn : ""
                  }`}
                >
                  {t.amount}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionTitleWrap}>
              <h2 className={styles.sectionTitle}>Predstojeće obaveze</h2>
              <p className={styles.sectionSubtitle}>2 na čekanju · 1 završeno</p>
            </div>
            <span className={styles.sectionLink}>
              Sve
              <IconArrowRight size={14} />
            </span>
          </header>
          <div className={styles.sectionBody}>
            {OBLIGATIONS.map((o) => (
              <div key={o.id} className={styles.row}>
                <span
                  className={`${styles.rowIcon} ${
                    o.done ? styles.rowIconDone : styles.rowIconPending
                  }`}
                >
                  {o.done ? (
                    <IconCircleCheck size={18} />
                  ) : (
                    <IconAlertCircle size={18} />
                  )}
                </span>
                <div className={styles.rowMain}>
                  <p className={styles.rowTitle}>{o.title}</p>
                  <p className={styles.rowMeta}>{o.meta}</p>
                </div>
                <span
                  className={`${styles.rowStatus} ${
                    o.done ? styles.rowStatusDone : styles.rowStatusPending
                  }`}
                >
                  {o.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Bankovni izvodi (upload + auto-knjiženje) ───────────────────── */

const STATEMENTS = [
  {
    bank: "UniCredit Bank",
    account: "3389002208123456",
    items: [
      { id: 1, br: "112", date: "11.06.2026.", tx: 24, ok: true, reviewed: 24, file: "uni-izvod-112.pdf" },
      { id: 2, br: "111", date: "04.06.2026.", tx: 18, ok: false, unmatched: 3, file: "uni-izvod-111.pdf" },
    ],
  },
  {
    bank: "Raiffeisen Bank",
    account: "1610450012345678",
    items: [
      { id: 3, br: "56", date: "09.06.2026.", tx: 9, ok: true, reviewed: 9, file: "rba-izvod-56.pdf" },
    ],
  },
];

const AUTO_BOOK = [
  { id: 1, title: "UPLATA PO RAČUNU 2026-014", inn: true, amount: "+1.450,00 KM", cat: "Prihod od prodaje", tone: "bg-brand-100 text-brand-700" },
  { id: 2, title: "JP ELEKTROPRIVREDA, struja", inn: false, amount: "−168,40 KM", cat: "Režije", tone: "bg-cream-200 text-text-secondary" },
  { id: 3, title: "NAKNADA ZA VOĐENJE RAČUNA", inn: false, amount: "−12,00 KM", cat: "Bankarske naknade", tone: "bg-cream-200 text-text-secondary" },
  { id: 4, title: "DOPRINOSI PIO/MIO", inn: false, amount: "−612,30 KM", cat: "Doprinosi", tone: "bg-accent-bg text-accent-500" },
];

function BankScreen() {
  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      <div className="mb-6">
        <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
          <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
          Finansije
        </div>
        <h1 className="font-serif-display text-[28px] leading-tight text-text-primary mb-[5px]">
          Bankovni izvodi.
        </h1>
        <p className="text-[13px] leading-6 text-text-tertiary max-w-[470px]">
          Učitajte PDF izvod iz e-bankinga. Promet se provjerava prema saldu
          izvoda prije uvoza, pa u knjige ne može ući pogrešno pročitan red.
        </p>
      </div>

      {/* Akcijske kartice (vizuelno, upload onemogućen u pregledu) */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4 mb-4 items-stretch">
        <div className="rounded-xl border-2 border-dashed border-brand-600/60 bg-brand-100/45 px-[18px] py-6 text-center">
          <span className="w-[54px] h-[54px] rounded-full bg-brand-600 text-white inline-flex items-center justify-center mb-3">
            <IconCloudUpload size={26} />
          </span>
          <div className="font-serif-display text-[18px] leading-tight text-text-primary">
            Učitaj bankovni izvod
          </div>
          <div className="text-[12.5px] text-text-tertiary mt-1.5">
            Prevuci PDF ili klikni za odabir
          </div>
          <div className="text-[11px] text-text-tertiary mt-2.5">
            UniCredit · Raiffeisen · Sparkasse · KIB · BBI · MF · Ziraat
          </div>
        </div>

        <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-6 flex flex-col items-center justify-center text-center">
          <span className="w-[46px] h-[46px] rounded-full bg-cream-200 text-text-secondary inline-flex items-center justify-center mb-3">
            <IconPencilPlus size={22} />
          </span>
          <div className="text-[15px] font-medium text-text-primary">
            Unesi izvod ručno
          </div>
          <div className="text-[11.5px] text-text-tertiary mt-1">
            Za banke koje još ne čitamo ili papirne izvode
          </div>
        </div>
      </div>

      {/* KPI red */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <BankKpi label="Učitano (juni)" value="48" sub="transakcija" icon={IconReceipt2} tileBg="bg-brand-100" tileColor="text-brand-700" />
        <BankKpi label="Potvrđeno" value="42" sub="ovaj mjesec" icon={IconCircleCheck} tileBg="bg-brand-100" tileColor="text-brand-700" />
        <BankKpi label="Za pregled" value="3" sub="treba potvrda" icon={IconAlertCircle} tileBg="bg-accent-bg" tileColor="text-accent-500" />
        <BankKpi label="Posljednji upload" value="11.06.2026." sub="uni-izvod-112.pdf" icon={IconCalendarEvent} tileBg="bg-cream-200" tileColor="text-text-secondary" valueSmall />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 items-start">
        {/* Lista izvoda */}
        <div className="rounded-xl bg-cream-100 border border-cream-300">
          <div className="pt-4 px-4 pb-3">
            <h2 className="font-serif-display text-[21px] leading-tight text-text-primary">
              Izvodi
            </h2>
            <p className="text-[13px] italic text-text-tertiary mt-0.5">
              Grupisani po banci i računu, najnoviji prvo
            </p>
          </div>
          <div className="pb-2">
            {STATEMENTS.map((group) => (
              <div key={group.account}>
                <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
                  <span className="w-8 h-8 rounded-lg bg-cream-200 text-text-secondary inline-flex items-center justify-center">
                    <IconBuildingBank size={16} />
                  </span>
                  <span className="text-[15px] font-medium text-text-primary">
                    {group.bank}
                  </span>
                  <span className="text-[13.5px] text-text-tertiary tabular-nums">
                    {group.account}
                  </span>
                </div>
                <ul>
                  {group.items.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 pl-[52px] pr-4 py-[11px] border-b border-cream-300/50 last:border-b-0"
                    >
                      <span className="w-8 h-8 rounded-lg bg-brand-100/60 text-brand-700 inline-flex items-center justify-center shrink-0">
                        <IconFileText size={15} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14.5px] font-medium text-text-primary">
                          Izvod br. {s.br}
                          <span className="text-text-tertiary font-normal">
                            {" "}· {s.date}
                          </span>
                        </div>
                        <div className="text-[12.5px] text-text-tertiary truncate mt-0.5">
                          {s.tx} stavki · {s.file}
                        </div>
                      </div>
                      <span
                        className={[
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12.5px] font-medium shrink-0",
                          s.ok ? "bg-brand-100 text-brand-700" : "bg-accent-bg text-accent-500",
                        ].join(" ")}
                      >
                        {s.ok ? (
                          <>
                            <IconCircleCheck size={11} /> potvrđen ({s.reviewed}/{s.tx})
                          </>
                        ) : (
                          <>
                            <IconAlertCircle size={11} /> {s.unmatched} za pregled
                          </>
                        )}
                      </span>
                      <IconChevronRight size={16} className="text-[rgba(15,26,18,0.28)] shrink-0" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Automatsko knjiženje */}
        <div className="rounded-xl bg-cream-100 border border-cream-300">
          <div className="pt-4 px-4 pb-3 flex items-start justify-between gap-2">
            <div>
              <h2 className="font-serif-display text-[21px] leading-tight text-text-primary">
                Automatsko knjiženje
              </h2>
              <p className="text-[13px] italic text-text-tertiary mt-0.5">
                Kategorije se predlažu automatski iz opisa
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-cream-200 text-text-secondary shrink-0">
              <IconClock size={12} /> uskoro
            </span>
          </div>
          <ul className="pb-2">
            {AUTO_BOOK.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 px-4 py-[11px] border-b border-cream-300/50 last:border-b-0"
              >
                <span
                  className={[
                    "w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0",
                    t.inn ? "bg-brand-100/60 text-brand-700" : "bg-cream-200 text-text-secondary",
                  ].join(" ")}
                >
                  {t.inn ? <IconArrowDownLeft size={16} /> : <IconArrowUpRight size={16} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">
                    {t.title}
                  </p>
                  <span
                    className={[
                      "inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                      t.tone,
                    ].join(" ")}
                  >
                    {t.cat}
                  </span>
                </div>
                <div
                  className={[
                    "text-[14px] tabular-nums shrink-0 font-serif-display",
                    t.inn ? "text-[#2d6e54]" : "text-text-primary",
                  ].join(" ")}
                >
                  {t.amount}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function BankKpi({
  label,
  value,
  sub,
  icon: Icon,
  tileBg,
  tileColor,
  valueSmall,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tileBg: string;
  tileColor: string;
  valueSmall?: boolean;
}) {
  return (
    <div className="rounded-xl bg-cream-100 border border-cream-300 p-4">
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className={`w-8 h-8 rounded-lg inline-flex items-center justify-center ${tileBg} ${tileColor}`}>
          <Icon size={17} />
        </span>
        <span className="text-[10.5px] uppercase tracking-[0.08em] text-text-tertiary font-medium">
          {label}
        </span>
      </div>
      <p
        className={`font-serif-display text-text-primary leading-none ${
          valueSmall ? "text-[18px]" : "text-[26px]"
        }`}
      >
        {value}
      </p>
      <p className="text-[11.5px] text-text-tertiary mt-1.5 truncate">{sub}</p>
    </div>
  );
}

/* ── Genericki ekran za rute bez mockupa ─────────────────────────── */

function UskoroScreen() {
  return (
    <div className="px-6 py-16 max-w-[680px] mx-auto text-center">
      <span className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 inline-flex items-center justify-center mb-4">
        <IconClock size={26} />
      </span>
      <h1 className="font-serif-display text-[26px] leading-tight text-text-primary mb-2">
        Ovaj ekran stiže uskoro.
      </h1>
      <p className="text-[14px] leading-6 text-text-tertiary">
        Radimo na njemu. U pregledu možete pogledati Početnu i Bankovne izvode
        iz menija lijevo.
      </p>
    </div>
  );
}
