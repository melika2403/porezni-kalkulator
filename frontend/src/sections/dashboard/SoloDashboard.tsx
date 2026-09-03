"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  IconAlertCircle,
  IconArrowDownLeft,
  IconArrowRight,
  IconArrowUpRight,
  IconCircleCheck,
  IconCloudUpload,
  IconCoins,
  IconCopy,
  IconFileInvoice,
  IconFileText,
  IconWallet,
} from "@tabler/icons-react";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { formatBAM, formatDate } from "src/lib/format";
import { usePkOfficeMe, usePayrollStatus } from "src/hooks/usePkOfficeMe";
import {
  useBankStatements,
  useBankSummary,
  useBankTransactions,
  useObligations,
  useOrgInvoices,
} from "src/hooks/useBankStatements";
import { unwrap } from "src/api/auth";
import { listInvoices } from "src/api/invoices";
import { categoryLabel } from "src/lib/bankCategories";
import type { BankTransaction } from "src/api/bankStatements";
import styles from "./dashboard.module.css";

// Naslovnica u Solo režimu ("vodim sam sebi"): umjesto pregleda za
// knjigovođu, lista obaveza za tekući mjesec sa rokovima i statusom, brze
// radnje (faktura je prva), kratki KPI i zadnje transakcije. Isti podaci i
// hookovi kao na punom dashboardu, samo drugačije složeni.

const MONTHS = [
  "januar", "februar", "mart", "april", "maj", "juni",
  "juli", "august", "septembar", "oktobar", "novembar", "decembar",
];

const pad2 = (n: number) => String(n).padStart(2, "0");
const isoDan = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function txDesc(t: BankTransaction): string {
  const base = t.counterpartyName || t.description || (t.direction === "IN" ? "Uplata" : "Plaćanje");
  return base.length > 60 ? `${base.slice(0, 60)}...` : base;
}

type Stavka = {
  key: string;
  title: string;
  meta: string;
  done: boolean;
  overdue: boolean;
  href: string;
};

export default function SoloDashboard() {
  const { data: me } = usePkOfficeMe();
  const now = new Date();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;
  const firstName = me?.firstName?.trim();
  const hour = now.getHours();
  const pozdrav = hour < 10 ? "Dobro jutro" : hour < 18 ? "Dobar dan" : "Dobro veče";
  const mjesec = MONTHS[now.getMonth()];

  // Sve mjesečne obaveze (izvod, doprinosi vlasnika, PDV) odnose se na
  // PRETHODNI mjesec, a rok im je 10. u tekućem. Zato se period računa
  // fiksno unazad, ne kroz defaultObracunPeriod (on od 16. otvara tekući
  // mjesec, pa bi red stajao uz rok koji je već prošao).
  const prethodni = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYear = prethodni.getFullYear();
  const prevMonth = prethodni.getMonth() + 1;
  const prosliMjesec = MONTHS[prethodni.getMonth()];
  const prevStart = `${prevYear}-${pad2(prevMonth)}-01`;
  const prevEnd = `${prevYear}-${pad2(prevMonth)}-${pad2(new Date(prevYear, prevMonth, 0).getDate())}`;

  const { data: bankSummary } = useBankSummary(orgId);
  const { data: statements } = useBankStatements(orgId);
  const { data: lastTransactions } = useBankTransactions(orgId, 5);
  const { data: openInvoices } = useOrgInvoices(orgId, { status: "ISSUED" });
  const { data: obligationsData } = useObligations(orgId);
  const { data: payrollData } = usePayrollStatus(prevYear, prevMonth);
  const { data: sveFakture } = useQuery({
    queryKey: ["pk-invoices", orgId, "all"],
    queryFn: () => unwrap(listInvoices({ organizationId: orgId as number, type: "INVOICE" })),
    enabled: orgId != null,
  });

  const balance = bankSummary?.balance ?? null;
  const unmatched = bankSummary?.unmatched ?? 0;
  const lastUpload = bankSummary?.lastUpload ?? null;
  // lastUpload je objekat izvoda: datum je statementDate, a createdAt rezerva
  // kad izvod nema datum (npr. ručno unesen).
  const zadnjiIzvodDan = lastUpload
    ? String(lastUpload.statementDate || lastUpload.createdAt || "").slice(0, 10) || null
    : null;
  // Obaveza se mjeri PERIODOM izvoda (datum izvoda pada u prethodni mjesec),
  // ne trenutkom učitavanja fajla: obrtnik sa dnevnim izvodima bi inače uvijek
  // ispadao uredan iako mu fali cijeli prošli mjesec.
  const izvodZaProsliMjesec = (statements ?? []).some((s) => {
    const dan = String(s.statementDate || "").slice(0, 10);
    return !!dan && dan >= prevStart && dan <= prevEnd;
  });
  const openCount = (openInvoices ?? []).length;
  const openTotal = (openInvoices ?? []).reduce((s, i) => s + Number(i.grossTotal), 0);
  const zadnjaFaktura = [...(sveFakture ?? [])]
    .sort((a, b) => (b.issueDate > a.issueDate ? 1 : b.issueDate < a.issueDate ? -1 : b.id - a.id))[0];
  const vlasnikStatus = activeOrg
    ? [...(payrollData?.own ?? []), ...(payrollData?.clients ?? [])].find((o) => o.id === activeOrg.id)
        ?.payrollStatus
    : undefined;
  const doprinosiObracunati = vlasnikStatus === "obracunato" || vlasnikStatus === "isplaceno";

  const rok10 = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-10`;
  const danas = isoDan(now);
  const stavke: Stavka[] = [
    {
      key: "izvod",
      title: `Bankovni izvod za ${prosliMjesec}`,
      meta: izvodZaProsliMjesec
        ? `izvod za ${prosliMjesec} je učitan`
        : zadnjiIzvodDan
          ? `zadnji izvod: ${formatDate(zadnjiIzvodDan)}`
          : "još nijedan izvod nije učitan",
      done: izvodZaProsliMjesec,
      overdue: !izvodZaProsliMjesec && now.getDate() > 10,
      href: "/app/bankovni-izvodi",
    },
    {
      key: "knjizenje",
      title: "Transakcije povezane i proknjižene",
      meta: unmatched > 0 ? `${unmatched} nepovezanih čeka pregled` : "sve sa izvoda je razvrstano",
      done: !!lastUpload && unmatched === 0,
      overdue: false,
      href: "/app/transakcije?status=UNMATCHED",
    },
    {
      key: "2002",
      title: `Obračun doprinosa vlasnika (Obrazac 2002) za ${prosliMjesec}`,
      meta: doprinosiObracunati
        ? "obračunato, uplatnice spremne"
        : `obračun i uplatnice, rok ${formatDate(rok10)}`,
      done: doprinosiObracunati,
      overdue: !doprinosiObracunati && danas > rok10,
      href: "/app/obracuni-plata",
    },
    ...(obligationsData?.items ?? []).map((o) => ({
      key: o.id,
      title: o.title,
      meta: `rok ${formatDate(o.due)}`,
      done: o.done,
      overdue: o.overdue,
      href: o.id === "pdv" ? "/app/pdv" : o.id === "doprinosi" ? "/app/obracuni-plata" : "/app/transakcije",
    })),
  ];
  const otvoreno = stavke.filter((s) => !s.done).length;

  const brzeAkcije = [
    { href: "/app/fakture/nova", icon: <IconFileInvoice size={16} />, label: "Nova faktura", primarno: true },
    ...(zadnjaFaktura
      ? [{ href: `/app/fakture/nova?duplicateFrom=${zadnjaFaktura.id}`, icon: <IconCopy size={16} />, label: "Kopiraj zadnju fakturu", primarno: false }]
      : []),
    { href: "/app/bankovni-izvodi", icon: <IconCloudUpload size={16} />, label: "Učitaj izvod", primarno: false },
    { href: "/app/obracuni-plata", icon: <IconCoins size={16} />, label: "Doprinosi i uplatnice", primarno: false },
    { href: "/app/obrasci", icon: <IconFileText size={16} />, label: "Obrasci i kraj godine", primarno: false },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.periodBadge}>
          {mjesec} {now.getFullYear()} · Solo
        </div>
        <div className="flex items-center gap-4">
          <h1 className={styles.h1}>
            {firstName ? `${pozdrav}, ${firstName}` : pozdrav}
            <em>.</em>
          </h1>
          <HelpButton slug="solo-pocetna" label="Kako vodim sam sebi" />
        </div>
        <div className={styles.headerMeta}>
          <span>{activeOrg?.name}</span>
          <span className={styles.metaDot} />
          <span>
            {otvoreno === 0
              ? "sve obaveze za ovaj mjesec su riješene"
              : `${otvoreno} ${otvoreno === 1 ? "obaveza čeka" : "obaveze čekaju"}`}
          </span>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 mb-5">
        {brzeAkcije.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className={
              a.primarno
                ? "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
                : "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-cream-300 bg-cream-100 text-[13px] font-medium text-text-primary hover:bg-cream-200 transition-colors"
            }
          >
            <span className={a.primarno ? "" : "text-brand-600"}>{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>

      {/* vodiči korak po korak (uputstva u kliznom panelu) */}
      <div className="flex flex-wrap items-center gap-2 mb-5 text-[12.5px] text-text-tertiary">
        <span className="mr-1">Vodiči:</span>
        <HelpButton slug="solo-prvi-mjesec" label="Prvi mjesec" uTok />
        <HelpButton slug="solo-kraj-godine" label="Kraj godine" uTok />
        <HelpButton slug="solo-rjecnik" label="Rječnik pojmova" uTok />
      </div>

      <section className={styles.section} style={{ marginBottom: "1.25rem" }}>
        <header className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrap}>
            <h2 className={styles.sectionTitle}>Šta trebam ovaj mjesec</h2>
            <p className={styles.sectionSubtitle}>
              {stavke.length - otvoreno} od {stavke.length} riješeno · rokovi su 10. u mjesecu za prethodni mjesec
            </p>
          </div>
        </header>
        <div className={styles.sectionBody}>
          {stavke.map((s) => (
            <Link key={s.key} href={s.href} className={styles.row}>
              <span className={`${styles.rowIcon} ${s.done ? styles.rowIconDone : styles.rowIconPending}`}>
                {s.done ? <IconCircleCheck size={18} /> : <IconAlertCircle size={18} />}
              </span>
              <div className={styles.rowMain}>
                <p className={styles.rowTitle}>{s.title}</p>
                <p className={styles.rowMeta}>{s.meta}</p>
              </div>
              <span className={`${styles.rowStatus} ${s.done ? styles.rowStatusDone : styles.rowStatusPending}`}>
                {s.done ? "gotovo" : s.overdue ? "kasni" : "čeka"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className={styles.metricGrid}>
        <Link href="/app/transakcije?direction=IN" className={styles.metric}>
          <span className={`${styles.metricIcon} ${styles.metricIconSuccess}`}>
            <IconArrowDownLeft size={18} />
          </span>
          <div>
            <div className={styles.metricLabel}>Naplaćeno u {mjesec}u</div>
            <div className={styles.metricValue}>{formatBAM(bankSummary?.totalInThisMonth ?? 0)}</div>
          </div>
        </Link>
        <Link href="/app/transakcije?direction=OUT" className={styles.metric}>
          <span className={`${styles.metricIcon} ${styles.metricIconNeutral}`}>
            <IconArrowUpRight size={18} />
          </span>
          <div>
            <div className={styles.metricLabel}>Plaćeno u {mjesec}u</div>
            <div className={styles.metricValue}>{formatBAM(bankSummary?.totalOutThisMonth ?? 0)}</div>
          </div>
        </Link>
        <Link href="/app/fakture?status=ISSUED" className={styles.metric}>
          <span className={`${styles.metricIcon} ${openCount > 0 ? styles.metricIconWarning : styles.metricIconInfo}`}>
            <IconFileInvoice size={18} />
          </span>
          <div>
            <div className={styles.metricLabel}>Otvorene fakture ({openCount})</div>
            <div className={styles.metricValue}>{formatBAM(openTotal)}</div>
          </div>
        </Link>
        <Link href="/app/bankovni-izvodi" className={styles.metric}>
          <span className={`${styles.metricIcon} ${styles.metricIconInfo}`}>
            <IconWallet size={18} />
          </span>
          <div>
            <div className={styles.metricLabel}>Stanje računa</div>
            <div className={styles.metricValue}>{balance ? formatBAM(balance.total) : "–"}</div>
          </div>
        </Link>
      </div>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrap}>
            <h2 className={styles.sectionTitle}>Posljednje transakcije</h2>
            <p className={styles.sectionSubtitle}>sa učitanih izvoda</p>
          </div>
          <Link href="/app/transakcije" className={styles.sectionLink}>
            Sve
            <IconArrowRight size={14} />
          </Link>
        </header>
        <div className={styles.sectionBody}>
          {(lastTransactions ?? []).length === 0 ? (
            <p className={styles.rowMeta} style={{ padding: "0.75rem 0" }}>
              Još nema transakcija. Učitajte prvi izvod iz e-bankinga.
            </p>
          ) : (
            (lastTransactions ?? []).map((t) => (
              <div key={t.id} className={styles.row}>
                <span className={`${styles.rowIcon} ${t.direction === "IN" ? styles.rowIconIn : styles.rowIconOut}`}>
                  {t.direction === "IN" ? <IconArrowDownLeft size={18} /> : <IconArrowUpRight size={18} />}
                </span>
                <div className={styles.rowMain}>
                  <p className={styles.rowTitle}>{txDesc(t)}</p>
                  <p className={styles.rowMeta}>
                    {formatDate(t.date)}
                    {t.category ? ` · ${categoryLabel(t.category)}` : " · nerazvrstano"}
                  </p>
                </div>
                <span className={`${styles.rowAmount} ${t.direction === "IN" ? styles.rowAmountIn : ""}`}>
                  {t.direction === "IN" ? "+" : "-"}
                  {formatBAM(Number(t.amount))}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
