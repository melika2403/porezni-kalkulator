"use client";

// Dijeljeni modal za detalj stavke izvoda: kategorija, partner, potvrda,
// svi podaci sa izvoda. Koristi se na detalju izvoda i na Transakcije tabu.
import { useState } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconLink,
  IconLinkOff,
  IconExternalLink,
  IconPlus,
  IconUserPlus,
} from "@tabler/icons-react";
import { formatBAM, formatDate } from "src/lib/format";
import { Modal } from "src/components/app-shell/Modal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PartnerCombobox } from "src/components/app-shell/PartnerCombobox";
import {
  PartnerFormModal,
  EMPTY_PARTNER_FORM,
  type PartnerFormState,
} from "src/sections/partneri/PartnerFormModal";
import {
  useOrgInvoices,
  useUpdateBankTransaction,
} from "src/hooks/useBankStatements";
import { usePartners } from "src/hooks/usePartners";
import { categoriesForDirection } from "src/lib/bankCategories";
import type { BankTransactionWithStatement } from "src/api/bankStatements";

export function txTitle(t: BankTransactionWithStatement) {
  if (t.counterpartyName) return t.counterpartyName;
  if (t.description) {
    return t.description.length > 70
      ? `${t.description.slice(0, 70)}...`
      : t.description;
  }
  return t.direction === "IN" ? "Uplata" : "Plaćanje";
}

export function StatusBadge({
  status,
}: {
  status: BankTransactionWithStatement["status"];
}) {
  if (status === "UNMATCHED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-accent-bg text-accent-500 shrink-0">
        <IconAlertCircle size={11} /> za pregled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-brand-100 text-brand-700 shrink-0">
      <IconLink size={11} /> {status === "IGNORED" ? "zanemareno" : "potvrđeno"}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary shrink-0">
        {label}
      </span>
      <span className="text-[13px] text-text-primary text-right break-all">
        {value}
      </span>
    </div>
  );
}

export function TransactionModal({
  orgId,
  tx,
  onClose,
  showStatementLink = false,
}: {
  orgId: number | null;
  tx: BankTransactionWithStatement | null;
  onClose: () => void;
  /** prikaži link na matični izvod (na Transakcije tabu) */
  showStatementLink?: boolean;
}) {
  const updateTx = useUpdateBankTransaction(orgId);
  // otvorene fakture za ručno povezivanje priliva
  const { data: openInvoices } = useOrgInvoices(
    tx != null && tx.direction === "IN" ? orgId : null,
    { status: "ISSUED" },
  );

  // partneri za (od)vezivanje stavke sa kartice partnera
  const { data: partners } = usePartners(tx != null ? orgId : null);
  const [newPartnerInitial, setNewPartnerInitial] =
    useState<PartnerFormState | null>(null);

  // Naziv povezanog partnera (derivira se iz liste; može stići async).
  const linkedName =
    tx?.partnerId != null
      ? ((partners ?? []).find((p) => p.id === tx.partnerId)?.name ?? "")
      : "";
  // draft = tekst koji korisnik kuca; null = ne uređuje, prikazuje povezanog.
  // Reset SAMO kad se promijeni stavka ili veza (ne kad linkedName async
  // stigne), da refetch liste partnera ne obriše ono što korisnik kuca.
  const [draft, setDraft] = useState<string | null>(null);
  const [prevTxKey, setPrevTxKey] = useState("");
  const txKey = `${tx?.id ?? "x"}:${tx?.partnerId ?? "x"}`;
  if (txKey !== prevTxKey) {
    setPrevTxKey(txKey);
    setDraft(null);
  }
  const partnerText = draft ?? linkedName;
  // dok korisnik kuca (draft != null), combobox se ponaša kao nepovezan
  const shownPartnerId =
    tx?.partnerId != null && draft === null ? tx.partnerId : null;

  // Podaci protivstrane sa izvoda: osnova za novog partnera (dugme + i ponuda)
  const cpNaziv = (tx?.counterpartyName ?? "").trim();
  const cpRacun = (tx?.counterpartyAccount ?? "").replace(/\D+/g, "");
  function otvoriNovogPartnera(naziv?: string) {
    setNewPartnerInitial({
      ...EMPTY_PARTNER_FORM,
      name: (naziv ?? "").trim() || cpNaziv,
      accounts: cpRacun ? [cpRacun] : [""],
    });
  }

  // Ponuda "dodaj kao partnera": izvod nosi firmu, stavka nije vezana i te
  // protivstrane još nema u partnerima (isti kriterij kao auto-match na
  // serveru: žiro račun, pa naziv).
  const normIme = (s: string) => s.toUpperCase().replace(/\s+/g, " ").trim();
  const vecPostoji = (partners ?? []).some(
    (p) =>
      (cpRacun.length >= 8 &&
        (p.accounts ?? []).some((a) => a.replace(/\D+/g, "") === cpRacun)) ||
      (!!cpNaziv && normIme(p.name) === normIme(cpNaziv)),
  );
  const nudiNovog =
    tx != null &&
    tx.partnerId == null &&
    draft === null &&
    !!cpNaziv &&
    !vecPostoji;

  return (
    <Modal
      open={tx != null}
      onClose={onClose}
      title={tx ? txTitle(tx) : ""}
      footer={
        tx && (
          <>
            {showStatementLink && (
              <Link
                href={`/app/bankovni-izvodi/${tx.statementId}`}
                className="inline-flex items-center gap-1.5 mr-auto text-[13px] font-medium text-brand-700 hover:text-brand-600"
              >
                <IconExternalLink size={15} />
                Otvori izvod
              </Link>
            )}
            {tx.status === "UNMATCHED" ? (
              <button
                type="button"
                disabled={updateTx.isPending}
                onClick={() =>
                  updateTx.mutate(
                    {
                      txId: tx.id,
                      patch: { status: "CONFIRMED" },
                    },
                    { onSuccess: () => onClose() },
                  )
                }
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Potvrdi
              </button>
            ) : (
              <button
                type="button"
                disabled={updateTx.isPending}
                onClick={() =>
                  updateTx.mutate({
                    txId: tx.id,
                    patch: { status: "UNMATCHED" },
                  })
                }
                className="px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
              >
                Vrati u pregled
              </button>
            )}
          </>
        )
      }
    >
      {tx && (
        <div className="flex flex-col gap-3 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <span
              className={[
                "text-[22px] font-semibold tabular-nums",
                tx.direction === "IN" ? "text-brand-600" : "text-text-primary",
              ].join(" ")}
            >
              {tx.direction === "IN" ? "+" : "−"}
              {formatBAM(Number(tx.amount))}
            </span>
            <StatusBadge status={tx.status} />
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1.5">
              Kategorija
            </div>
            <PkSelect
              ariaLabel="Kategorija"
              value={tx.category ?? ""}
              disabled={updateTx.isPending}
              onChange={(v) =>
                updateTx.mutate({
                  txId: tx.id,
                  patch: { category: v ? String(v) : null },
                })
              }
              groups={(() => {
                const g = categoriesForDirection(tx.direction);
                return [
                  { options: [{ value: "", label: "Bez kategorije" }] },
                  {
                    label: "Ide u KPR",
                    options: g.uKpr.map((c) => ({
                      value: c.id,
                      label: `${c.label} (Kolona ${c.kprColumn})`,
                    })),
                  },
                  {
                    label: "Ne ide u KPR (nije prihod ni rashod)",
                    options: g.bezKpr.map((c) => ({
                      value: c.id,
                      label: c.label,
                    })),
                  },
                ];
              })()}
              wrapStyle={{ width: "100%" }}
            />
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1.5">
              Partner (kartica)
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <PartnerCombobox
                  value={partnerText}
                  partnerId={shownPartnerId}
                  onChange={(text, pid) => {
                    if (pid != null) {
                      setDraft(null); // vrati na prikaz povezanog
                      updateTx.mutate({
                        txId: tx.id,
                        patch: { partnerId: pid },
                      });
                    } else {
                      setDraft(text);
                    }
                  }}
                  partners={partners ?? []}
                  onRequestNew={(typed) => otvoriNovogPartnera(typed)}
                  placeholder="poveži: naziv, šifra ili žiro račun partnera"
                  ariaLabel="Partner"
                  inputClassName="bg-cream-50"
                />
              </div>
              {tx.partnerId == null && (
                <button
                  type="button"
                  onClick={() => otvoriNovogPartnera(draft ?? "")}
                  title="Novi partner (podaci sa izvoda se popune sami)"
                  aria-label="Novi partner"
                  className="w-9 h-9 shrink-0 rounded-lg border border-cream-300 text-text-tertiary hover:text-brand-600 hover:border-brand-600 inline-flex items-center justify-center transition-colors"
                >
                  <IconPlus size={16} />
                </button>
              )}
              {tx.partnerId != null && (
                <button
                  type="button"
                  disabled={updateTx.isPending}
                  onClick={() =>
                    updateTx.mutate({
                      txId: tx.id,
                      patch: { partnerId: null },
                    })
                  }
                  title="Skini vezu sa partnerom"
                  className="w-9 h-9 shrink-0 rounded-lg border border-cream-300 text-text-tertiary hover:text-danger hover:border-danger/40 inline-flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <IconLinkOff size={15} />
                </button>
              )}
            </div>
            {nudiNovog && (
              <button
                type="button"
                onClick={() => otvoriNovogPartnera()}
                className="mt-2 w-full flex items-start gap-2 text-left px-3 py-2 rounded-lg border border-brand-600/30 bg-brand-100/40 hover:bg-brand-100 transition-colors"
              >
                <IconUserPlus
                  size={15}
                  className="text-brand-600 shrink-0 mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-brand-700 break-words">
                    Dodaj {cpNaziv} kao partnera
                  </span>
                  <span className="block text-[11.5px] text-text-tertiary">
                    Sa izvoda: {cpRacun ? `žiro račun ${cpRacun}` : "naziv"}.
                    Nakon snimanja stavka se odmah veže na njegovu karticu.
                  </span>
                </span>
              </button>
            )}
            <p className="text-[11.5px] text-text-tertiary mt-1.5">
              Povezana stavka se vodi na kartici partnera
              {tx.direction === "OUT"
                ? "; potvrđena isplata dobavljaču zatvara njegov otvoren ulazni račun"
                : ""}
              . Kad prvi put povežete partnera i kategoriju, sljedeći izvod se
              za istu protivstranu popuni sam.
            </p>
          </div>

          {tx.direction === "IN" && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1.5">
                Povezana faktura
              </div>
              <PkSelect
                ariaLabel="Povezana faktura"
                value={tx.invoiceId ?? ""}
                disabled={updateTx.isPending}
                onChange={(v) =>
                  updateTx.mutate({
                    txId: tx.id,
                    patch: { invoiceId: v ? Number(v) : null },
                  })
                }
                options={[
                  { value: "", label: "Nije povezano sa fakturom" },
                  // trenutno povezana (može biti već naplaćena pa nije u otvorenim)
                  ...(tx.invoice &&
                  !(openInvoices ?? []).some((i) => i.id === tx.invoice?.id)
                    ? [
                        {
                          value: tx.invoice.id,
                          label: `${tx.invoice.fullNumber} · ${formatBAM(Number(tx.invoice.grossTotal))}${tx.invoice.status === "PAID" ? " (naplaćena)" : ""}`,
                        },
                      ]
                    : []),
                  ...(openInvoices ?? []).map((inv) => ({
                    value: inv.id,
                    label: `${inv.fullNumber} · ${inv.buyerName} · ${formatBAM(Number(inv.grossTotal))}`,
                  })),
                ]}
                wrapStyle={{ width: "100%" }}
              />
              {tx.invoice && tx.status === "UNMATCHED" && (
                <p className="text-[11.5px] text-text-tertiary mt-1.5">
                  Potvrdom stavke faktura {tx.invoice.fullNumber} se označava
                  naplaćenom na datum priliva.
                </p>
              )}
            </div>
          )}

          <Detail label="Datum" value={tx.date ? formatDate(tx.date) : "–"} />
          {tx.statement && (
            <Detail
              label="Izvod"
              value={`${tx.statement.bankName ?? "Banka"} · br. ${tx.statement.statementNumber ?? "?"}`}
            />
          )}
          {tx.counterpartyName && (
            <Detail label="Protivstrana" value={tx.counterpartyName} />
          )}
          {tx.counterpartyAccount && (
            <Detail label="Protivračun" value={tx.counterpartyAccount} />
          )}
          {tx.reference && <Detail label="Referenca" value={tx.reference} />}
          {tx.balanceAfter != null && (
            <Detail label="Saldo nakon" value={formatBAM(Number(tx.balanceAfter))} />
          )}
          {tx.description && (
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Opis sa izvoda
              </div>
              <div className="text-[12.5px] leading-5 text-text-secondary break-words">
                {tx.description}
              </div>
            </div>
          )}
        </div>
      )}

      {/* "+ Novi partner" iz comboboxa: po snimanju stavka se odmah poveže */}
      <PartnerFormModal
        orgId={orgId}
        initial={newPartnerInitial}
        onClose={() => setNewPartnerInitial(null)}
        onSaved={(p) => {
          if (tx) {
            updateTx.mutate({ txId: tx.id, patch: { partnerId: p.id } });
          }
        }}
      />
    </Modal>
  );
}
