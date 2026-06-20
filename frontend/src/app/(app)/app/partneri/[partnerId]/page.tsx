"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconCircleCheck,
  IconRotate,
  IconInbox,
  IconFileInvoice,
  IconReceipt,
  IconArrowsExchange,
  IconDownload,
  IconMail,
  IconLoader2,
  IconPencil,
} from "@tabler/icons-react";
import { formatBAM, formatDate } from "src/lib/format";
import { bankNameFromAccount, formatBankAccount } from "src/lib/bankCodes";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  usePartnerKartica,
  useUpdateUlazniRacun,
  useDeleteUlazniRacun,
} from "src/hooks/usePartners";
import {
  downloadKarticaPdf,
  emailKartica,
  type KarticaType,
  type UlazniRacun,
} from "src/api/partners";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import {
  UlazniRacunModal,
  parseDateInput,
  maskDateInput,
} from "src/sections/partneri/UlazniRacunModal";
import {
  PartnerFormModal,
  formFromPartner,
  type PartnerFormState,
} from "src/sections/partneri/PartnerFormModal";

function RacunBadge({ r }: { r: UlazniRacun }) {
  if (r.status === "PLACEN") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-success-bg text-success shrink-0">
        <IconCircleCheck size={11} /> plaćen
      </span>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  if (r.rokPlacanja && r.rokPlacanja < today) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-accent-bg text-accent-500 shrink-0">
        kasni
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-warning-bg text-warning shrink-0">
      otvoren
    </span>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "muted";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "muted"
          ? "text-text-tertiary"
          : "text-text-primary";
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-xl p-[18px]">
      <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
        {label}
      </div>
      <div
        className={`font-serif-display text-[22px] leading-none tabular-nums ${color}`}
      >
        {value}
      </div>
    </div>
  );
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export default function PartnerKarticaPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId: partnerIdRaw } = use(params);
  const partnerId = Number(partnerIdRaw) || null;

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const { data: kartica, isLoading } = usePartnerKartica(orgId, partnerId);
  const updateRacun = useUpdateUlazniRacun(orgId);
  const deleteRacun = useDeleteUlazniRacun(orgId);

  // PDV status obrta zbog PDV split-a kod knjiženja
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const [racunModalOpen, setRacunModalOpen] = useState(false);
  const [editInitial, setEditInitial] = useState<PartnerFormState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [mailInfo, setMailInfo] = useState<string | null>(null);
  // period štampe kartice (prazno = cijeli period prometa)
  const [periodOd, setPeriodOd] = useState("");
  const [periodDo, setPeriodDo] = useState("");
  const [periodError, setPeriodError] = useState<string | null>(null);

  const p = kartica?.partner ?? null;
  const totals = kartica?.totals ?? null;

  const jeKupac =
    (totals?.totalIn ?? 0) > 0 || (kartica?.invoices ?? []).length > 0;
  const jeDobavljac =
    (totals?.totalOut ?? 0) > 0 || (kartica?.ulazniRacuni ?? []).length > 0;

  // koju karticu prikazujemo na ekranu (toggle ako je partner oboje)
  const [ledgerType, setLedgerType] = useState<KarticaType | null>(null);
  const activeLedger: KarticaType =
    ledgerType ?? (jeDobavljac || !jeKupac ? "dobavljac" : "kupac");

  // redovi kartice prometa, isti raspored kao na PDF-u
  const ledgerRows = useMemo(() => {
    if (!kartica) return [];
    const rows: { date: string; label: string; duguje: number; potrazuje: number }[] = [];
    if (activeLedger === "dobavljac") {
      for (const r of kartica.ulazniRacuni) {
        rows.push({
          date: r.datumRacuna,
          label: `Račun ${r.brojRacuna}`,
          duguje: 0,
          potrazuje: Number(r.iznos) || 0,
        });
      }
      for (const t of kartica.transactions) {
        if (t.status !== "CONFIRMED" || t.direction !== "OUT" || !t.date) continue;
        rows.push({
          date: t.date,
          label: `Plaćanje${t.statement?.statementNumber ? `, izvod br. ${t.statement.statementNumber}` : ""}`,
          duguje: Number(t.amount) || 0,
          potrazuje: 0,
        });
      }
    } else {
      for (const inv of kartica.invoices) {
        if (inv.status !== "ISSUED" && inv.status !== "PAID") continue;
        rows.push({
          date: inv.issueDate,
          label: `Faktura ${inv.fullNumber}`,
          duguje: Number(inv.grossTotal) || 0,
          potrazuje: 0,
        });
      }
      for (const t of kartica.transactions) {
        if (t.status !== "CONFIRMED" || t.direction !== "IN" || !t.date) continue;
        rows.push({
          date: t.date,
          label: `Uplata${t.statement?.statementNumber ? `, izvod br. ${t.statement.statementNumber}` : ""}`,
          duguje: 0,
          potrazuje: Number(t.amount) || 0,
        });
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  }, [kartica, activeLedger]);

  const ledgerTotals = useMemo(() => {
    let duguje = 0;
    let potrazuje = 0;
    for (const r of ledgerRows) {
      duguje += r.duguje;
      potrazuje += r.potrazuje;
    }
    return { duguje, potrazuje, saldo: duguje - potrazuje };
  }, [ledgerRows]);

  function resolvePeriod(): { from?: string; to?: string } | null {
    setPeriodError(null);
    const from = periodOd.trim() ? parseDateInput(periodOd) : undefined;
    const to = periodDo.trim() ? parseDateInput(periodDo) : undefined;
    if (periodOd.trim() && !from) {
      setPeriodError("Datum 'od' nije validan (DD.MM.GGGG.).");
      return null;
    }
    if (periodDo.trim() && !to) {
      setPeriodError("Datum 'do' nije validan (DD.MM.GGGG.).");
      return null;
    }
    return { from: from ?? undefined, to: to ?? undefined };
  }

  async function downloadKartica(type: KarticaType) {
    if (!orgId || !partnerId) return;
    const period = resolvePeriod();
    if (!period) return;
    setBusy(`pdf-${type}`);
    try {
      const r = await downloadKarticaPdf(orgId, partnerId, type, period);
      if (r.ok) triggerBlobDownload(r.blob, r.filename);
    } finally {
      setBusy(null);
    }
  }

  async function sendKartica() {
    if (!orgId || !partnerId) return;
    const period = resolvePeriod();
    if (!period) return;
    setBusy("email");
    setMailInfo(null);
    try {
      const types: KarticaType[] = [];
      if (jeKupac) types.push("kupac");
      if (jeDobavljac) types.push("dobavljac");
      if (types.length === 0) types.push("dobavljac");
      for (const t of types) {
        const r = await emailKartica(orgId, partnerId, t, period);
        if (!r.ok) {
          setMailInfo(
            r.error === "NO_EMAIL"
              ? "Partner nema upisan email."
              : "Slanje nije uspjelo, pokušajte ponovo.",
          );
          return;
        }
      }
      setMailInfo(`Kartica poslana na ${p?.email}.`);
    } finally {
      setBusy(null);
    }
  }

  const sectionTitleCls = "font-serif-display text-[18px] text-text-primary";
  const pdfBtnCls =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 text-text-secondary text-[12px] font-medium hover:border-brand-600/50 hover:text-brand-600 transition-colors disabled:opacity-50";

  if (isLoading || !p) {
    return (
      <div className="px-6 py-10 text-center text-text-tertiary text-[13px]">
        {isLoading ? "Učitavanje kartice..." : "Partner nije pronađen."}
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Nazad + zaglavlje */}
      <Link
        href="/app/partneri"
        className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-info-bg text-info text-[13px] font-medium mb-4 transition-colors hover:brightness-95"
      >
        <IconArrowLeft
          size={16}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        Svi partneri
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="font-serif-display text-[26px] leading-tight text-text-primary mb-1">
            {p.name}
          </h1>
          <p className="text-[12.5px] text-text-tertiary">
            {[
              p.code != null ? `šifra ${String(p.code).padStart(4, "0")}` : null,
              p.jib ? `JIB ${p.jib}` : null,
              p.pdvBroj ? `PDV ${p.pdvBroj} (PDV obveznik)` : null,
              [p.address, p.city].filter(Boolean).join(", ") || null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {p.accounts.length > 0 && (
            <p className="text-[12px] text-text-tertiary mt-1">
              {p.accounts
                .map(
                  (a) =>
                    `${formatBankAccount(a)}${
                      bankNameFromAccount(a)
                        ? ` (${bankNameFromAccount(a)})`
                        : ""
                    }`,
                )
                .join(" · ")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditInitial(formFromPartner(p))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconPencil size={15} />
            Uredi podatke
          </button>
          <button
            type="button"
            onClick={() => setRacunModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <IconPlus size={16} />
            Proknjiži ulazni račun
          </button>
        </div>
      </div>

      {/* Kartica prometa: period + PDF + email */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input
          className="rounded-lg border border-cream-300 bg-cream-100 px-3 py-1.5 text-[12.5px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600 w-[120px]"
          value={periodOd}
          onChange={(e) => setPeriodOd(maskDateInput(e.target.value))}
          placeholder="od DD.MM.GGGG."
          inputMode="numeric"
          title="Period štampe kartice (prazno = cijeli promet)"
        />
        <input
          className="rounded-lg border border-cream-300 bg-cream-100 px-3 py-1.5 text-[12.5px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600 w-[120px]"
          value={periodDo}
          onChange={(e) => setPeriodDo(maskDateInput(e.target.value))}
          placeholder="do DD.MM.GGGG."
          inputMode="numeric"
          title="Period štampe kartice (prazno = do danas)"
        />
        {jeKupac && (
          <button
            type="button"
            disabled={busy != null}
            onClick={() => downloadKartica("kupac")}
            className={pdfBtnCls}
          >
            {busy === "pdf-kupac" ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconDownload size={14} />
            )}
            Kartica kupca (PDF)
          </button>
        )}
        {jeDobavljac && (
          <button
            type="button"
            disabled={busy != null}
            onClick={() => downloadKartica("dobavljac")}
            className={pdfBtnCls}
          >
            {busy === "pdf-dobavljac" ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconDownload size={14} />
            )}
            Kartica dobavljača (PDF)
          </button>
        )}
        {(jeKupac || jeDobavljac) && (
          <button
            type="button"
            disabled={busy != null || !p.email}
            onClick={sendKartica}
            title={
              p.email
                ? `Pošalji karticu na ${p.email}`
                : "Partner nema upisan email"
            }
            className={pdfBtnCls}
          >
            {busy === "email" ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconMail size={14} />
            )}
            Pošalji na email
          </button>
        )}
        {mailInfo && (
          <span className="text-[12px] text-text-tertiary">{mailInfo}</span>
        )}
        {periodError && (
          <span className="text-[12px] text-accent-500">{periodError}</span>
        )}
      </div>

      {/* KPI */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Kpi label="Naplaćeno od partnera" value={formatBAM(totals.totalIn)} />
          <Kpi label="Plaćeno partneru" value={formatBAM(totals.totalOut)} />
          <Kpi
            label="Njihov dug (fakture)"
            value={
              totals.openInvoicesTotal > 0
                ? formatBAM(totals.openInvoicesTotal)
                : "–"
            }
            tone={totals.openInvoicesTotal > 0 ? "success" : "muted"}
          />
          <Kpi
            label="Naš dug (ulazni računi)"
            value={
              totals.openPayablesTotal > 0
                ? formatBAM(totals.openPayablesTotal)
                : "–"
            }
            tone={totals.openPayablesTotal > 0 ? "warning" : "muted"}
          />
        </div>
      )}

      {/* Ulazni računi */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <IconReceipt size={17} className="text-text-tertiary" />
          <h2 className={sectionTitleCls}>Ulazni računi</h2>
        </div>
        <div className="rounded-xl bg-cream-100 border border-cream-300">
          {(kartica?.ulazniRacuni ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center">
              <span className="w-10 h-10 rounded-full bg-cream-200 text-text-tertiary inline-flex items-center justify-center mb-2">
                <IconInbox size={18} />
              </span>
              <p className="text-[13px] text-text-primary font-medium">
                Nema proknjiženih ulaznih računa
              </p>
              <p className="text-[12px] text-text-tertiary mt-1">
                Proknjižite račun dobavljača; plaćanje na izvodu ga automatski
                zatvara.
              </p>
            </div>
          ) : (
            <ul>
              {(kartica?.ulazniRacuni ?? []).map((r, i, arr) => (
                <li
                  key={r.id}
                  className={[
                    "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3",
                    i < arr.length - 1 ? "border-b border-cream-300/70" : "",
                  ].join(" ")}
                >
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-text-primary">
                        Račun {r.brojRacuna}
                      </span>
                      <RacunBadge r={r} />
                    </div>
                    <div className="text-[11.5px] text-text-tertiary mt-0.5">
                      {[
                        formatDate(r.datumRacuna),
                        r.rokPlacanja
                          ? `rok ${formatDate(r.rokPlacanja)}`
                          : null,
                        r.paidAt ? `plaćen ${formatDate(r.paidAt)}` : null,
                        r.pdvIznos != null
                          ? `PDV ${formatBAM(Number(r.pdvIznos))}`
                          : null,
                        r.note,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <span className="text-[13.5px] font-semibold tabular-nums text-text-primary whitespace-nowrap">
                    {formatBAM(Number(r.iznos))}
                  </span>
                  {r.status === "OTVOREN" ? (
                    <button
                      type="button"
                      title="Označi plaćenim (npr. gotovina)"
                      disabled={updateRacun.isPending}
                      onClick={() =>
                        updateRacun.mutate({
                          racunId: r.id,
                          patch: { status: "PLACEN" },
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-600 text-brand-600 text-[12px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
                    >
                      <IconCircleCheck size={14} />
                      Plaćen
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="Vrati u otvoreno"
                      disabled={updateRacun.isPending}
                      onClick={() =>
                        updateRacun.mutate({
                          racunId: r.id,
                          patch: { status: "OTVOREN" },
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cream-300 text-text-tertiary text-[12px] font-medium hover:bg-cream-200 transition-colors disabled:opacity-50"
                    >
                      <IconRotate size={14} />
                      Vrati
                    </button>
                  )}
                  <button
                    type="button"
                    title="Obriši račun"
                    onClick={() => {
                      if (
                        window.confirm(`Obrisati ulazni račun ${r.brojRacuna}?`)
                      ) {
                        deleteRacun.mutate(r.id);
                      }
                    }}
                    className="p-2 rounded-lg border border-cream-300 text-text-tertiary hover:text-accent-500 hover:border-accent-500/50 transition-colors"
                  >
                    <IconTrash size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Kartica prometa: ista forma kao PDF (Duguje/Potražuje/Saldo) */}
      <section>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <IconArrowsExchange size={17} className="text-text-tertiary" />
            <h2 className={sectionTitleCls}>
              {activeLedger === "kupac"
                ? "Kartica kupca"
                : "Kartica dobavljača"}
            </h2>
          </div>
          {jeKupac && jeDobavljac && (
            <div className="flex gap-1 rounded-lg border border-cream-300 p-0.5 bg-cream-100">
              {(["dobavljac", "kupac"] as KarticaType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLedgerType(t)}
                  className={[
                    "px-3 py-1 rounded-md text-[12px] font-medium transition-colors",
                    activeLedger === t
                      ? "bg-brand-600 text-white"
                      : "text-text-tertiary hover:text-text-primary",
                  ].join(" ")}
                >
                  {t === "dobavljac" ? "Dobavljač" : "Kupac"}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl bg-cream-100 border border-cream-300 overflow-x-auto">
          {ledgerRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-text-tertiary">
              Još nema prometa za ovu karticu.
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-cream-200/60 text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
                  <th className="text-right font-medium px-3 py-2 w-[44px]">Rb</th>
                  <th className="text-left font-medium px-3 py-2 w-[100px]">Datum</th>
                  <th className="text-left font-medium px-3 py-2">Opis knjiženja</th>
                  <th className="text-right font-medium px-3 py-2 w-[110px]">Duguje</th>
                  <th className="text-right font-medium px-3 py-2 w-[110px]">Potražuje</th>
                  <th className="text-right font-medium px-3 py-2 w-[120px]">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let saldo = 0;
                  return ledgerRows.map((r, i) => {
                    saldo += r.duguje - r.potrazuje;
                    return (
                      <tr
                        key={`${r.date}-${i}`}
                        className="border-t border-cream-300/60"
                      >
                        <td className="text-right px-3 py-2 text-text-tertiary tabular-nums">
                          {i + 1}.
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                          {formatDate(r.date)}
                        </td>
                        <td className="px-3 py-2">{r.label}</td>
                        <td className="text-right px-3 py-2 tabular-nums">
                          {r.duguje ? formatBAM(r.duguje) : ""}
                        </td>
                        <td className="text-right px-3 py-2 tabular-nums">
                          {r.potrazuje ? formatBAM(r.potrazuje) : ""}
                        </td>
                        <td
                          className={[
                            "text-right px-3 py-2 tabular-nums font-medium",
                            saldo < 0 ? "text-accent-500" : "text-text-primary",
                          ].join(" ")}
                        >
                          {formatBAM(saldo)}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-cream-300 font-semibold">
                  <td className="px-3 py-2" colSpan={3}>
                    <span className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary">
                      Ukupno
                    </span>
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">
                    {formatBAM(ledgerTotals.duguje)}
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">
                    {formatBAM(ledgerTotals.potrazuje)}
                  </td>
                  <td
                    className={[
                      "text-right px-3 py-2 tabular-nums",
                      ledgerTotals.saldo < 0
                        ? "text-accent-500"
                        : "text-text-primary",
                    ].join(" ")}
                  >
                    {formatBAM(ledgerTotals.saldo)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        <p className="text-[11.5px] text-text-tertiary mt-2">
          {activeLedger === "dobavljac"
            ? "Računi dobavljača potražuju, naša plaćanja duguju; negativan saldo = naš dug."
            : "Naše fakture duguju, uplate kupca potražuju; pozitivan saldo = njihov dug."}
        </p>
      </section>

      <UlazniRacunModal
        orgId={orgId}
        open={racunModalOpen}
        onClose={() => setRacunModalOpen(false)}
        fixedPartner={p ? { id: p.id, name: p.name, code: p.code } : null}
        isPdvObveznik={Boolean(fullOrg?.isPdvObveznik)}
      />

      {/* Uređivanje podataka partnera direktno sa kartice */}
      <PartnerFormModal
        orgId={orgId}
        initial={editInitial}
        onClose={() => setEditInitial(null)}
      />
    </div>
  );
}
