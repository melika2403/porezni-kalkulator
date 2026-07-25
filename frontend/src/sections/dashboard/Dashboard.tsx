"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconFileInvoice,
  IconAlertCircle,
  IconCalculator,
  IconCashBanknote,
  IconCircleCheck,
  IconCloudUpload,
  IconWallet,
  IconCoins,
  IconArrowRight,
  IconInbox,
} from "@tabler/icons-react";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { OrgSwitcher } from "src/components/app-shell/OrgSwitcher";
import { formatBAM, formatDate } from "src/lib/format";
import {
  usePkOfficeMe,
  usePayrollStatus,
  useActivateOrganization,
  usePkOfficePristup,
} from "src/hooks/usePkOfficeMe";
import {
  useBankSummary,
  useBankTransactions,
  useObligations,
  useOrgInvoices,
} from "src/hooks/useBankStatements";
import { unwrap } from "src/api/auth";
import { getMonthlySummary } from "src/api/payroll";
import { getOrganization, getWorkers } from "src/api/profile";
import { listInvoices } from "src/api/invoices";
import { categoryLabel } from "src/lib/bankCategories";
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
  const orgId = activeOrg?.id ?? null;
  const period = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const monthName = MONTHS[now.getMonth()].toLowerCase();
  const fullDate = `${DAYS[now.getDay()]}, ${now.getDate()}. ${monthName} ${now.getFullYear()}.`;
  const hour = now.getHours();
  const pozdrav =
    hour < 10 ? "Dobro jutro" : hour < 18 ? "Dobar dan" : "Dobro veče";

  // prave cifre sa bankovnih izvoda
  const { data: bankSummary } = useBankSummary(orgId);
  const { data: lastTransactions } = useBankTransactions(orgId, 4);
  const balance = bankSummary?.balance ?? null;
  const balanceNeg = (balance?.total ?? 0) < 0;

  // zadnji izvod stariji od 30 dana: stanje je vjerovatno zastarjelo
  const zadnjiIzvod =
    balance?.accounts
      .map((a) => a.statementDate)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1) ?? null;
  const izvodZastario =
    zadnjiIzvod != null &&
    (now.getTime() - new Date(zadnjiIzvod).getTime()) / 86400000 > 30;

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
  // neriješene prve (po roku), završene na dno
  const sortiraneObaveze = [...obligations].sort(
    (a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due),
  );

  const activePayroll = activeOrg
    ? [...(payrollData?.own ?? []), ...(payrollData?.clients ?? [])].find(
        (o) => o.id === activeOrg.id,
      )
    : undefined;
  const payrollChip = activePayroll
    ? PAYROLL_CHIP[activePayroll.payrollStatus]
    : undefined;

  // broj radnika + neto suma na plate kartici (vlasnik obrta nije u perWorker)
  const { data: plateSummary } = useQuery({
    queryKey: ["pk-payroll-summary", orgId, payrollYear, payrollMonth],
    queryFn: () =>
      unwrap(getMonthlySummary(orgId as number, payrollYear, payrollMonth)),
    enabled: orgId != null,
  });

  // Svi obrti za pregled knjigovođe (vlastiti pa klijentski). payroll-status
  // vraća SVE organizacije (koristi ga i marketing /organizacije sa d.o.o.),
  // a PK Office radi samo sa obrtima: filtriramo na listu iz /api/auth/me
  // (samo BUSINESS) + slot filter, isto kao OrgSwitcher.
  const { data: pristup } = usePkOfficePristup();
  const slotMode = Boolean(pristup?.enforced && pristup?.hasOffice);
  const enabledIds = new Set(
    (pristup?.organizations ?? [])
      .filter((o) => o.pkOfficeEnabled)
      .map((o) => o.id),
  );
  const pkOrgIds = new Set((data?.organizations ?? []).map((o) => o.id));
  const sviObrti = [
    ...(payrollData?.own ?? []).map((o) => ({ ...o, klijent: false })),
    ...(payrollData?.clients ?? []).map((o) => ({ ...o, klijent: true })),
  ].filter((o) => pkOrgIds.has(o.id) && (!slotMode || enabledIds.has(o.id)));
  const aktivirajObrt = useActivateOrganization();

  // svjež obrt (još nema nijedan izvod): umjesto praznih kartica prvi koraci.
  // balance zna biti null i kad su izvodi učitani bez završnog stanja, pa se
  // oslanjamo na lastUpload (null tek kad nijedan izvod nije učitan).
  const svjezObrt =
    bankSummary !== undefined && balance == null && bankSummary.lastUpload == null;
  // puni podaci obrta: prvi koraci (svjež obrt) i lična karta u zaglavlju,
  // pa se traže za svaki obrt (odgovor je keširan po orgId)
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });
  const { data: radniciData } = useQuery({
    queryKey: ["pk-workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId as number)),
    enabled: orgId != null && svjezObrt,
  });
  // "izdana bar jedna faktura" gleda i naplaćene, ne samo otvorene (openCount
  // broji ISSUED); relevantno samo za svjež obrt (gated)
  const { data: sveFakture } = useQuery({
    queryKey: ["pk-invoices", orgId, "all"],
    queryFn: () =>
      unwrap(listInvoices({ organizationId: orgId as number, type: "INVOICE" })),
    enabled: orgId != null && svjezObrt,
  });
  const prviKoraci = [
    {
      key: "podaci",
      label: "Dopuni podatke obrta",
      desc: "JIB, djelatnost, žiro račun i PDV status idu na sve obrasce",
      done: !!(fullOrg?.taxNumber && fullOrg?.activityCode && fullOrg?.bankAccount),
      href: `/organizacija/${orgId}`,
    },
    {
      key: "izvod",
      label: "Učitaj prvi bankovni izvod",
      desc: "PDF iz e-bankinga: knjiženje, KPR i stanje kreću odavde",
      done: false,
      href: "/app/bankovni-izvodi",
    },
    {
      key: "radnici",
      label: "Dodaj radnike (ako ih imaš)",
      desc: "za obračun plata, MIP-1023 i evidencije",
      done: (radniciData ?? []).some((w) => w.role === "RADNIK"),
      href: "/app/zaposlenici",
    },
    {
      key: "faktura",
      label: "Izdaj prvu fakturu",
      desc: "kupci, KIF i PDV se povlače automatski",
      done: (sveFakture ?? []).some(
        (i) => i.status === "ISSUED" || i.status === "PAID",
      ),
      href: "/app/fakture/nova",
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.periodBadge}>{period}</div>
        <div className="flex items-center gap-4">
          <h1 className={styles.h1}>
            {firstName ? `${pozdrav}, ${firstName}` : pozdrav}
            <em>.</em>
          </h1>
          <HelpButton slug="dashboard" label="Kako početi" />
        </div>
        <div className={styles.headerMeta}>
          <span>{fullDate}</span>
        </div>
        {/* Aktivni obrt je najvažniji kontekst stranice (svaka akcija ispod
            piše u njegove knjige), pa stoji u vlastitoj traci i mijenja se
            odmah odavde, bez odlaska u sidebar. Uz traku ide lična karta
            obrta: podaci koje knjigovođa traži čim prebaci klijenta. */}
        <div className={styles.headerRow}>
          <div className={styles.orgStrip}>
            <OrgSwitcher variant="inline" />
          </div>
          {activeOrg && (
            <dl className={styles.orgFacts}>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>JIB</dt>
                <dd className={styles.factValue}>
                  {fullOrg?.taxNumber || activeOrg.taxNumber || "–"}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>PDV</dt>
                <dd
                  className={styles.factValue}
                  title={
                    fullOrg?.isPdvObveznik && fullOrg?.pdvObveznikOd
                      ? `U sistemu PDV-a od ${formatDate(fullOrg.pdvObveznikOd)}`
                      : undefined
                  }
                >
                  {fullOrg === undefined
                    ? "–"
                    : fullOrg.isPdvObveznik
                      ? "Obveznik"
                      : "Nije obveznik"}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>Žiro račun</dt>
                <dd className={styles.factValue} title={fullOrg?.bankAccount ?? undefined}>
                  {fullOrg?.bankAccount || "–"}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>Zadnji izvod</dt>
                <dd
                  className={`${styles.factValue} ${izvodZastario ? styles.factWarn : ""}`}
                  title={
                    izvodZastario
                      ? "Zadnji izvod je stariji od 30 dana, stanje je vjerovatno zastarjelo"
                      : undefined
                  }
                >
                  {zadnjiIzvod ? formatDate(zadnjiIzvod) : "–"}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </header>

      {/* Brze akcije: najčešće dnevne radnje, bez odlaska u sidebar */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          {
            href: "/app/bankovni-izvodi",
            icon: <IconCloudUpload size={16} />,
            label: "Učitaj izvod",
          },
          {
            href: "/app/fakture/nova",
            icon: <IconFileInvoice size={16} />,
            label: "Nova faktura",
          },
          {
            href: "/app/blagajna",
            icon: <IconCashBanknote size={16} />,
            label: "Blagajnički nalog",
          },
          {
            href: "/app/kalkulacije/nova",
            icon: <IconCalculator size={16} />,
            label: "Nova kalkulacija",
          },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-cream-300 bg-cream-100 text-[13px] font-medium text-text-primary hover:bg-cream-200 transition-colors"
          >
            <span className="text-brand-600">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>

      {/* Prvi koraci: obrt bez ijednog izvoda dobije checklist umjesto
          praznih kartica */}
      {svjezObrt && (
        <section className="rounded-xl bg-cream-100 border border-cream-300 px-5 py-4 mb-5">
          <h2 className="font-serif-display text-[18px] text-text-primary mb-0.5">
            Prvi koraci
          </h2>
          <p className="text-[12.5px] text-text-tertiary mb-3">
            Postavite obrt kroz par koraka; kartice ispod se pune same čim
            stignu prvi podaci.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {prviKoraci.map((k) => (
              <Link
                key={k.key}
                href={k.href}
                className="flex items-start gap-2.5 rounded-lg border border-cream-300 bg-cream-50 hover:bg-cream-200 px-3 py-2.5 transition-colors"
              >
                {k.done ? (
                  <IconCircleCheck size={18} className="text-success shrink-0 mt-px" />
                ) : (
                  <IconArrowRight size={18} className="text-brand-600 shrink-0 mt-px" />
                )}
                <span>
                  <span
                    className={`block text-[13px] font-medium ${
                      k.done
                        ? "line-through text-text-tertiary"
                        : "text-text-primary"
                    }`}
                  >
                    {k.label}
                  </span>
                  <span className="block text-[11.5px] text-text-tertiary">
                    {k.desc}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Grupni uvoz izvoda: vidljivo svima, i sa jednim obrtom */}
      <div className="rounded-xl border border-brand-600/25 bg-brand-100/50 px-5 py-4 mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-[240px] flex-1">
            <span className="w-10 h-10 rounded-lg bg-brand-600 text-white inline-flex items-center justify-center shrink-0">
              <IconInbox size={20} />
            </span>
            <div>
              <div className="text-[14.5px] font-medium text-text-primary">
                Grupni uvoz izvoda za sve obrte
              </div>
              <p className="text-[12.5px] leading-5 text-text-tertiary max-w-[520px]">
                Ubacite PDF izvode svih obrta odjednom: svaki izvod se sam
                prepozna po žiro računu, rasporedi na svoj obrt i preskoči ako
                je već uvezen.
              </p>
            </div>
          </div>
          <Link
            href="/app/inbox?tab=izvodi"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity shrink-0"
          >
            Otvori grupni uvoz
            <IconArrowRight size={15} />
          </Link>
        </div>


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
          {izvodZastario && zadnjiIzvod && (
            <p className="mt-2 text-[12px] text-warning flex items-center gap-1">
              <IconAlertCircle size={13} className="shrink-0" />
              Zadnji izvod je od {formatDate(zadnjiIzvod)}: učitajte novije
              izvode za tačno stanje.
            </p>
          )}
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
              {plateSummary && plateSummary.perWorker.length > 0 && (
                <p className={styles.balanceMeta}>
                  {plateSummary.perWorker.length}{" "}
                  {plateSummary.perWorker.length % 10 === 1 &&
                  plateSummary.perWorker.length % 100 !== 11
                    ? "radnik"
                    : "radnika"}{" "}
                  · neto {formatBAM(plateSummary.totals.net)}
                </p>
              )}
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

      {/* KPI kartice vode na filtrirane liste */}
      <div className={styles.metricGrid}>
        <Link
          href="/app/transakcije?direction=IN"
          className={styles.metric}
          title="Prilivi ovog mjeseca na transakcijama"
        >
          <div className={`${styles.metricIcon} ${styles.metricIconSuccess}`}>
            <IconArrowDownLeft size={22} />
          </div>
          <p className={styles.metricLabel}>Potražuje</p>
          <p className={styles.metricValue}>
            {formatBAM(bankSummary?.totalInThisMonth ?? 0)}
          </p>
          <p className={styles.metricDelta}>ovaj mjesec, sa izvoda</p>
        </Link>

        <Link
          href="/app/transakcije?direction=OUT"
          className={styles.metric}
          title="Odlivi ovog mjeseca na transakcijama"
        >
          <div className={`${styles.metricIcon} ${styles.metricIconNeutral}`}>
            <IconArrowUpRight size={22} />
          </div>
          <p className={styles.metricLabel}>Duguje</p>
          <p className={styles.metricValue}>
            {formatBAM(bankSummary?.totalOutThisMonth ?? 0)}
          </p>
          <p className={styles.metricDelta}>ovaj mjesec, sa izvoda</p>
        </Link>

        <Link
          href="/app/fakture?status=ISSUED"
          className={styles.metric}
          title="Otvorene (izdane) fakture"
        >
          <div className={`${styles.metricIcon} ${styles.metricIconInfo}`}>
            <IconFileInvoice size={22} />
          </div>
          <p className={styles.metricLabel}>Otvorene fakture</p>
          <p className={styles.metricValue}>{openCount}</p>
          <p className={styles.metricDelta}>
            {openCount > 0 ? `${formatBAM(openTotal)} ukupno` : "sve naplaćeno"}
          </p>
        </Link>

        <Link
          href="/app/transakcije?status=UNMATCHED"
          className={styles.metric}
          title="Transakcije koje čekaju pregled"
        >
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
        </Link>
      </div>

      {/* Pregled svih obrta: knjigovođa odmah vidi gdje šta kasni */}
      {sviObrti.length > 1 && (
        <section className="rounded-xl bg-cream-100 border border-cream-300 px-5 py-4 mb-6">
          <div className="flex items-baseline justify-between gap-3 mb-1.5 flex-wrap">
            <h2 className="font-serif-display text-[18px] text-text-primary">
              Svi obrti
            </h2>
            <p className="text-[12px] text-text-tertiary">
              plate za {payrollMonthName} {payrollYear}. · klik mijenja aktivni
              obrt
            </p>
          </div>
          <div className="divide-y divide-cream-200">
            {sviObrti.map((o) => {
              const chip = PAYROLL_CHIP[o.payrollStatus];
              const aktivan = o.id === orgId;
              const izvodStar =
                o.lastStatementDate != null &&
                (now.getTime() - new Date(o.lastStatementDate).getTime()) /
                  86400000 >
                  30;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    if (!aktivan) aktivirajObrt.mutate(o.id);
                  }}
                  className={`w-full flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-left ${
                    aktivan ? "" : "cursor-pointer hover:bg-cream-50"
                  }`}
                  title={aktivan ? "Aktivni obrt" : "Postavi kao aktivni obrt"}
                >
                  <span className="flex items-center gap-2 min-w-[180px] flex-1">
                    <span
                      className={`text-[13px] font-medium ${
                        aktivan ? "text-brand-700" : "text-text-primary"
                      }`}
                    >
                      {o.name}
                    </span>
                    {o.klijent && (
                      <span className="px-1.5 py-px rounded-full bg-info-bg text-info text-[10.5px] font-medium shrink-0">
                        klijent
                      </span>
                    )}
                    {aktivan && (
                      <span className="px-1.5 py-px rounded-full bg-brand-100 text-brand-700 text-[10.5px] font-medium shrink-0">
                        aktivni
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[12px] ${
                      o.lastStatementDate && !izvodStar
                        ? "text-text-tertiary"
                        : "text-warning"
                    }`}
                  >
                    {o.lastStatementDate
                      ? `izvod ${formatDate(o.lastStatementDate)}`
                      : "nema izvoda"}
                  </span>
                  {o.payrollStatus === "no_workers" ? (
                    <span className="text-[12px] text-text-tertiary">
                      bez radnika
                    </span>
                  ) : chip ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        chip.ok
                          ? "bg-success-bg text-success"
                          : "bg-warning-bg text-warning"
                      }`}
                    >
                      {chip.ok ? (
                        <IconCircleCheck size={12} />
                      ) : (
                        <IconAlertCircle size={12} />
                      )}
                      {chip.label}
                    </span>
                  ) : null}
                  {o.payrollStatus !== "no_workers" &&
                    (o.mipDownloadedAt ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-success-bg text-success">
                        MIP ✓
                      </span>
                    ) : o.payrollStatus !== "none" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-warning-bg text-warning">
                        MIP nije preuzet
                      </span>
                    ) : null)}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className={styles.sectionGrid}>
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <div className={styles.sectionTitleWrap}>
              <h2 className={styles.sectionTitle}>Posljednje transakcije</h2>
              <p className={styles.sectionSubtitle}>sa bankovnih izvoda</p>
            </div>
            <Link href="/app/bankovni-izvodi" className={styles.sectionLink}>
              Sve
              <IconArrowRight size={14} />
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
                      {categoryLabel(t.category) && (
                        <span
                          className={`ml-1.5 inline-block px-1.5 py-px rounded-full text-[10.5px] font-medium align-middle ${
                            isIn
                              ? "bg-success-bg text-success"
                              : "bg-cream-200 text-text-secondary"
                          }`}
                        >
                          {categoryLabel(t.category)}
                        </span>
                      )}
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
              Sve
              <IconArrowRight size={14} />
            </Link>
          </header>
          <div className={styles.sectionBody}>
            {sortiraneObaveze.map((o) => (
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
                  <p className={styles.rowMeta}>rok {formatDate(o.due)}</p>
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
