"use client";

import Link from "next/link";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconFileInvoice,
  IconAlertCircle,
  IconCircleCheck,
  IconWallet,
  IconCoins,
  IconArrowRight,
} from "@tabler/icons-react";
import { formatBAM, formatDate } from "src/lib/format";
import { usePkOfficeMe, usePayrollStatus } from "src/hooks/usePkOfficeMe";
import {
  useBankSummary,
  useBankTransactions,
  useObligations,
  useOrgInvoices,
} from "src/hooks/useBankStatements";
import type { PayrollStatus } from "src/api/pkOffice";
import type { BankTransaction } from "src/api/bankStatements";
import styles from "./dashboard.module.css";

function txDesc(t: BankTransaction): string {
  const base = t.counterpartyName || t.description || (t.direction === "IN" ? "Uplata" : "Plaćanje");
  return base.length > 60 ? `${base.slice(0, 60)}...` : base;
}

const MONTHS = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

const DAYS = [
  "nedjelja", "ponedjeljak", "utorak", "srijeda",
  "četvrtak", "petak", "subota",
];

// Labela i ton chipa za status plata aktivne org u tekućem mjesecu.
// no_workers se ne prikazuje (org bez radnika nema šta obračunati).
const PAYROLL_CHIP: Partial<
  Record<PayrollStatus, { label: string; ok: boolean }>
> = {
  none: { label: "nisu obračunate", ok: false },
  partial: { label: "djelimično obračunate", ok: false },
  obracunato: { label: "obračunate", ok: true },
  isplaceno: { label: "isplaćene", ok: true },
};

export default function Dashboard() {
  const { data } = usePkOfficeMe();
  const now = new Date();

  // Plate se obračunavaju za protekli mjesec, pa kartica do 25. u mjesecu
  // prikazuje prethodni mjesec; od 25. prelazi na tekući.
  let payrollYear = now.getFullYear();
  let payrollMonth = now.getMonth() + 1;
  if (now.getDate() < 25) {
    payrollMonth -= 1;
    if (payrollMonth === 0) {
      payrollMonth = 12;
      payrollYear -= 1;
    }
  }
  const { data: payrollData } = usePayrollStatus(payrollYear, payrollMonth);
  const payrollMonthName = MONTHS[payrollMonth - 1].toLowerCase();

  const firstName = data?.firstName?.trim();
  const activeOrg = data?.activeOrganization ?? data?.organizations?.[0] ?? null;
  const orgName = activeOrg?.name ?? "Vaš obrt";
  const orgId = activeOrg?.id ?? null;
  const period = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const monthName = MONTHS[now.getMonth()].toLowerCase();
  const fullDate = `${DAYS[now.getDay()]}, ${now.getDate()}. ${monthName} ${now.getFullYear()}.`;

  // prave cifre sa bankovnih izvoda
  const { data: bankSummary } = useBankSummary(orgId);
  const { data: lastTransactions } = useBankTransactions(orgId, 4);
  const balance = bankSummary?.balance ?? null;
  const balanceNeg = (balance?.total ?? 0) < 0;

  // otvorene fakture + predstojeće obaveze
  const { data: openInvoices } = useOrgInvoices(orgId, { status: "ISSUED" });
  const openCount = (openInvoices ?? []).length;
  const openTotal = (openInvoices ?? []).reduce(
    (s, inv) => s + Number(inv.grossTotal),
    0,
  );
  const { data: obligationsData } = useObligations(orgId);
  const obligations = obligationsData?.items ?? [];
  const pendingCount = obligations.filter((o) => !o.done).length;
  const doneCount = obligations.length - pendingCount;

  const activePayroll = activeOrg
    ? [...(payrollData?.own ?? []), ...(payrollData?.clients ?? [])].find(
        (o) => o.id === activeOrg.id,
      )
    : undefined;
  const payrollChip = activePayroll
    ? PAYROLL_CHIP[activePayroll.payrollStatus]
    : undefined;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.periodBadge}>{period}</div>
        <h1 className={styles.h1}>
          {firstName ? `Dobar dan, ${firstName}` : "Dobar dan"}
          <em>.</em>
        </h1>
        <div className={styles.headerMeta}>
          <span>{fullDate}</span>
          {activeOrg && (
            <>
              <span className={styles.metaDot}>·</span>
              <span className={styles.metaOrg}>{orgName}</span>
              <span
                className={
                  activeOrg.isClientOrg ? styles.orgBadgeClient : styles.orgBadge
                }
              >
                {activeOrg.isClientOrg ? "Klijent" : "Moj obrt"}
              </span>
            </>
          )}
        </div>
      </header>

      <div className={styles.topGrid}>
        <div className={styles.balanceCard}>
          <p className={styles.balanceLabel}>
            <IconWallet size={15} />
            Trenutno stanje računa
          </p>
          <p
            className={`${styles.balanceValue} ${
              balanceNeg ? styles.balanceValueNeg : ""
            }`}
          >
            {balance ? formatBAM(balance.total) : "–"}
          </p>
          <p className={styles.balanceMeta}>
            {balance
              ? balance.accounts.length === 1
                ? `${balance.accounts[0].bankName ?? "žiro račun"} · stanje sa izvoda ${balance.accounts[0].statementDate ? formatDate(balance.accounts[0].statementDate) : ""}`
                : `zbir ${balance.accounts.length} računa, po zadnjim izvodima`
              : "učitajte prvi izvod da vidite stanje"}
          </p>
        </div>

        <div className={styles.balanceCard}>
          <p className={styles.balanceLabel}>
            <IconCoins size={15} />
            Plate · {payrollMonthName} {payrollYear}.
          </p>
          {!activePayroll ? (
            <p className={styles.balanceMeta}>Učitavanje...</p>
          ) : activePayroll.payrollStatus === "no_workers" ? (
            <p className={styles.balanceMeta}>
              Nema aktivnih radnika u ovom mjesecu.
            </p>
          ) : (
            <div className={styles.payrollRows}>
              <div className={styles.payrollRow}>
                <span className={styles.payrollRowLabel}>Obračun plata</span>
                {payrollChip && (
                  <span
                    className={`${styles.payrollChip} ${
                      payrollChip.ok
                        ? styles.payrollChipOk
                        : styles.payrollChipWarn
                    }`}
                  >
                    {payrollChip.ok ? (
                      <IconCircleCheck size={14} />
                    ) : (
                      <IconAlertCircle size={14} />
                    )}
                    {payrollChip.label}
                  </span>
                )}
              </div>
              <div className={styles.payrollRow}>
                <span className={styles.payrollRowLabel}>MIP-1023 XML</span>
                <span
                  className={`${styles.payrollChip} ${
                    activePayroll.mipDownloadedAt
                      ? styles.payrollChipOk
                      : styles.payrollChipWarn
                  }`}
                >
                  {activePayroll.mipDownloadedAt ? (
                    <IconCircleCheck size={14} />
                  ) : (
                    <IconAlertCircle size={14} />
                  )}
                  {activePayroll.mipDownloadedAt
                    ? `preuzet ${formatDate(activePayroll.mipDownloadedAt.slice(0, 10))}`
                    : "nije preuzet"}
                </span>
              </div>
              <Link
                href="/app/obracuni-plata"
                className={styles.payrollCardLink}
              >
                Obračuni plata
                <IconArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className={styles.metricGrid}>
        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconSuccess}`}>
            <IconArrowDownLeft size={22} />
          </div>
          <p className={styles.metricLabel}>Potražuje</p>
          <p className={styles.metricValue}>
            {formatBAM(bankSummary?.totalInThisMonth ?? 0)}
          </p>
          <p className={styles.metricDelta}>ovaj mjesec, sa izvoda</p>
        </div>

        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconNeutral}`}>
            <IconArrowUpRight size={22} />
          </div>
          <p className={styles.metricLabel}>Duguje</p>
          <p className={styles.metricValue}>
            {formatBAM(bankSummary?.totalOutThisMonth ?? 0)}
          </p>
          <p className={styles.metricDelta}>ovaj mjesec, sa izvoda</p>
        </div>

        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconInfo}`}>
            <IconFileInvoice size={22} />
          </div>
          <p className={styles.metricLabel}>Otvorene fakture</p>
          <p className={styles.metricValue}>{openCount}</p>
          <p className={styles.metricDelta}>
            {openCount > 0 ? `${formatBAM(openTotal)} ukupno` : "sve naplaćeno"}
          </p>
        </div>

        <div className={styles.metric}>
          <div className={`${styles.metricIcon} ${styles.metricIconWarning}`}>
            <IconAlertCircle size={22} />
          </div>
          <p className={styles.metricLabel}>Nepovezane transakcije</p>
          <p className={styles.metricValue}>{bankSummary?.unmatched ?? 0}</p>
          <p
            className={`${styles.metricDelta} ${
              (bankSummary?.unmatched ?? 0) > 0 ? styles.metricDeltaWarn : ""
            }`}
          >
            {(bankSummary?.unmatched ?? 0) > 0 ? "treba pregled" : "sve potvrđeno"}
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
            <Link href="/app/bankovni-izvodi" className={styles.sectionLink}>
              Sve →
            </Link>
          </header>
          <div className={styles.sectionBody}>
            {(lastTransactions ?? []).length === 0 && (
              <p className={styles.rowMeta} style={{ padding: "0.75rem 0" }}>
                Još nema transakcija. Učitajte prvi bankovni izvod.
              </p>
            )}
            {(lastTransactions ?? []).map((t) => {
              const isIn = t.direction === "IN";
              return (
                <div key={t.id} className={styles.row}>
                  <span
                    className={`${styles.rowIcon} ${
                      isIn ? styles.rowIconIn : styles.rowIconOut
                    }`}
                  >
                    {isIn ? (
                      <IconArrowDownLeft size={18} />
                    ) : (
                      <IconArrowUpRight size={18} />
                    )}
                  </span>
                  <div className={styles.rowMain}>
                    <p className={styles.rowTitle}>{txDesc(t)}</p>
                    <p className={styles.rowMeta}>
                      {t.date ? formatDate(t.date) : "–"}
                    </p>
                  </div>
                  <div
                    className={`${styles.rowAmount} ${
                      isIn ? styles.rowAmountIn : ""
                    }`}
                  >
                    {isIn ? "+" : "−"}
                    {formatBAM(Number(t.amount))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionTitleWrap}>
              <h2 className={styles.sectionTitle}>Predstojeće obaveze</h2>
              <p className={styles.sectionSubtitle}>
                {pendingCount} na čekanju · {doneCount} završeno
              </p>
            </div>
            <Link href="/app/transakcije" className={styles.sectionLink}>
              Sve →
            </Link>
          </header>
          <div className={styles.sectionBody}>
            {obligations.map((o) => (
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
                  <p className={styles.rowMeta}>
                    rok {formatDate(o.due)}
                    {o.overdue ? " · prošao rok" : ""}
                  </p>
                </div>
                <span
                  className={`${styles.rowStatus} ${
                    o.done ? styles.rowStatusDone : styles.rowStatusPending
                  }`}
                >
                  {o.done ? "gotovo" : o.overdue ? "kasni" : "čeka"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
