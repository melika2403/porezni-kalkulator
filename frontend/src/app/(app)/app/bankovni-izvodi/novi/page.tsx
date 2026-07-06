"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconLoader2,
  IconCircleCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { formatBAM } from "src/lib/format";
import { parseDateInput, todayFormatted } from "src/lib/dateInput";
import { parseKm } from "src/lib/amountInput";
import { bankNameFromAccount, formatBankAccount } from "src/lib/bankCodes";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PartnerCombobox } from "src/components/app-shell/PartnerCombobox";
import {
  PartnerFormModal,
  EMPTY_PARTNER_FORM,
  type PartnerFormState,
} from "src/sections/partneri/PartnerFormModal";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { usePartners } from "src/hooks/usePartners";
import {
  useBankStatements,
  useCreateManualStatement,
} from "src/hooks/useBankStatements";

// Stavke nemaju svoj datum: sve nose datum izvoda (unosi se samo na vrhu).
type RowInput = {
  key: number;
  description: string;
  counterpartyName: string;
  /** potvrđen partner iz autocomplete-a (stavka ide na njegovu karticu) */
  partnerId: number | null;
  amount: string;
  direction: "in" | "out";
};

let keyCounter = 1;

export default function RucniUnosIzvodaPage() {
  const router = useRouter();
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;
  const create = useCreateManualStatement(orgId);

  // žiro računi iz profila obrta; prvi je glavni (backend fallback za "")
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });
  const profileAccounts = (
    fullOrg?.bankAccounts?.length
      ? fullOrg.bankAccounts
      : fullOrg?.bankAccount
        ? [fullOrg.bankAccount]
        : []
  ).map((a) => a.replace(/\D+/g, ""));
  const profileSet = new Set(profileAccounts);

  // računi viđeni na izvodima a još nisu u profilu (novi se auto-dodaju
  // u profil pri učitavanju, pa je ovo prelazni fallback)
  const { data: statements } = useBankStatements(orgId);
  const knownAccounts = [
    ...new Map(
      (statements ?? [])
        .filter((s) => s.account)
        .map((s) => [s.account as string, s.bankName ?? "Banka"]),
    ).entries(),
  ].filter(([account]) => !profileSet.has(account.replace(/\D+/g, "")));
  const [accountChoice, setAccountChoice] = useState(""); // "" = iz profila
  const [customAccount, setCustomAccount] = useState("");

  const [statementNumber, setStatementNumber] = useState("");
  const [statementDate, setStatementDate] = useState(todayFormatted());

  // prijedlog broja izvoda: zadnji uneseni broj (za izabrani račun) + 1
  const numberSuggestion = (() => {
    const relevant = (statements ?? []).filter((s) =>
      accountChoice && accountChoice !== "__custom"
        ? s.account === accountChoice
        : true,
    );
    const nums = relevant
      .map((s) => Number(String(s.statementNumber ?? "").trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    return nums.length > 0 ? Math.max(...nums) + 1 : null;
  })();
  const [totalDuguje, setTotalDuguje] = useState("");
  const [totalPotrazuje, setTotalPotrazuje] = useState("");
  const [rows, setRows] = useState<RowInput[]>([
    {
      key: 0,
      description: "",
      counterpartyName: "",
      partnerId: null,
      amount: "",
      direction: "out",
    },
  ]);
  const [error, setError] = useState<string | null>(null);

  // partneri za autocomplete protivstrane + "+ Novi partner" modal
  const { data: partners } = usePartners(orgId);
  const [partnerModal, setPartnerModal] = useState<{
    rowKey: number;
    initial: PartnerFormState;
  } | null>(null);

  function openNewPartner(rowKey: number, typed: string) {
    const t = typed.trim();
    const digits = t.replace(/\D+/g, "");
    // ukucan žiro račun ide u račune partnera, tekst u naziv
    const isAccount = digits.length >= 8 && /^[\d\s.,-]+$/.test(t);
    setPartnerModal({
      rowKey,
      initial: {
        ...EMPTY_PARTNER_FORM,
        name: isAccount ? "" : t,
        accounts: isAccount ? [digits] : [""],
      },
    });
  }

  function updateRow(key: number, patch: Partial<RowInput>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  // nakon "Dodaj stavku" fokus na opis novog reda (brzi unos bez miša)
  const rowsWrapRef = useRef<HTMLDivElement>(null);
  const focusLastRow = useRef(false);
  useEffect(() => {
    if (!focusLastRow.current) return;
    focusLastRow.current = false;
    const inputs = rowsWrapRef.current?.querySelectorAll<HTMLInputElement>(
      'input[aria-label="Opis stavke"]',
    );
    inputs?.[inputs.length - 1]?.focus();
  }, [rows.length]);

  function addRow() {
    focusLastRow.current = true;
    setRows((rs) => [
      ...rs,
      {
        key: keyCounter++,
        description: "",
        counterpartyName: "",
        partnerId: null,
        amount: "",
        direction: "out",
      },
    ]);
  }
  function removeRow(key: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  // živa kontrola: zbir stavki mora pogoditi deklarisani promet
  const dateIso = parseDateInput(statementDate);
  // izvod može imati samo jednu stranu: prazno polje prometa znači 0,00
  const declaredDuguje = totalDuguje.trim() ? parseKm(totalDuguje) : 0;
  const declaredPotrazuje = totalPotrazuje.trim() ? parseKm(totalPotrazuje) : 0;
  // potpuno prazne stavke (npr. zadnja nakon Entera) se preskaču pri
  // validaciji i snimanju
  const isRowEmpty = (r: RowInput) =>
    !r.description.trim() && !r.counterpartyName.trim() && !r.amount.trim();
  const activeRows = rows.filter((r) => !isRowEmpty(r));

  let sumIn = 0;
  let sumOut = 0;
  let rowsValid = activeRows.length > 0;
  for (const r of activeRows) {
    const amount = parseKm(r.amount);
    if (amount == null || amount <= 0) {
      rowsValid = false;
      continue;
    }
    if (r.direction === "in") sumIn += Math.round(amount * 100);
    else sumOut += Math.round(amount * 100);
  }
  const dugujeMatch =
    declaredDuguje != null && sumOut === Math.round(declaredDuguje * 100);
  const potrazujeMatch =
    declaredPotrazuje != null && sumIn === Math.round(declaredPotrazuje * 100);
  const balanced = dugujeMatch && potrazujeMatch;
  const canSubmit =
    dateIso != null &&
    declaredDuguje != null &&
    declaredPotrazuje != null &&
    rowsValid &&
    balanced &&
    !create.isPending;

  // zašto je "Sačuvaj izvod" sivo: prvi nezadovoljen uslov, redom unosa
  const disabledReason = canSubmit || create.isPending
    ? null
    : dateIso == null
      ? "Unesite datum izvoda."
      : declaredDuguje == null || declaredPotrazuje == null
        ? "Ukupni promet nije validan iznos."
        : activeRows.length === 0
          ? "Unesite bar jednu stavku."
          : !rowsValid
            ? "Svaka stavka treba iznos veći od nule."
            : "Zbir stavki se još ne slaže sa unesenim prometom.";

  function submit() {
    if (!canSubmit) return;
    setError(null);
    const account =
      accountChoice === "__custom"
        ? customAccount.trim() || undefined
        : accountChoice || undefined;
    create.mutate(
      {
        statementNumber: statementNumber.trim() || undefined,
        statementDate: dateIso as string,
        account,
        totalDuguje: declaredDuguje as number,
        totalPotrazuje: declaredPotrazuje as number,
        transactions: activeRows.map((r) => ({
          // sve stavke nose datum izvoda
          date: dateIso as string,
          // prazan opis: podrazumijevano "Izvod N" (broj sa vrha)
          description:
            r.description.trim() ||
            (statementNumber.trim() ? `Izvod ${statementNumber.trim()}` : ""),
          counterpartyName: r.counterpartyName.trim() || undefined,
          partnerId: r.partnerId ?? undefined,
          amount: parseKm(r.amount) as number,
          direction: r.direction,
        })),
      },
      {
        // stavke su već pregledane pri unosu → odmah na listu izvoda
        onSuccess: () => router.push("/app/bankovni-izvodi"),
        onError: (err: unknown) => {
          const e = err as { error?: string; validationErrors?: string[] | null };
          setError(
            e.validationErrors?.join(" ") ??
              `Greška pri snimanju (${e.error ?? "nepoznato"}). Pokušajte ponovo.`,
          );
        },
      },
    );
  }

  const inputCls =
    "w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600";

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      <Link
        href="/app/bankovni-izvodi"
        className="group inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-info-bg text-info text-[14px] font-medium hover:bg-[#c9ddee] transition-colors mb-4"
      >
        <IconArrowLeft
          size={18}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        Svi izvodi
      </Link>

      <div className="mb-5">
        <h1 className="font-serif-display text-[26px] leading-tight text-text-primary mb-1">
          Ručni unos izvoda.
        </h1>
        <p className="text-[13px] leading-6 text-text-tertiary max-w-[560px]">
          Za banke koje još ne čitamo ili papirne izvode. Unesite ukupan promet
          duguje i potražuje sa izvoda, pa stavke: zbir stavki mora se poklopiti
          sa prometom da bi se izvod snimio.
        </p>
      </div>

      {/* Podaci o izvodu */}
      <div className="rounded-xl bg-cream-100 border border-cream-300 p-5 mb-4">
        <h2 className="font-serif-display text-[18px] text-text-primary mb-4">
          Podaci o izvodu
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Field label="Žiro račun">
            <div className="flex flex-col gap-2">
              <PkSelect
                ariaLabel="Žiro račun"
                value={accountChoice}
                onChange={(v) => setAccountChoice(String(v ?? ""))}
                options={[
                  // prvi račun iz profila = glavni; "" je backend fallback na njega
                  {
                    value: "",
                    label: profileAccounts[0]
                      ? `${bankNameFromAccount(profileAccounts[0]) ?? "Banka"} · ${formatBankAccount(profileAccounts[0])} · glavni`
                      : "Iz profila obrta",
                  },
                  ...profileAccounts.slice(1).map((account) => ({
                    value: account,
                    label: `${bankNameFromAccount(account) ?? "Banka"} · ${formatBankAccount(account)}`,
                  })),
                  ...knownAccounts.map(([account, bankName]) => ({
                    value: account,
                    label: `${bankName} · ${formatBankAccount(account)}`,
                  })),
                  { value: "__custom", label: "Drugi račun (upiši)" },
                ]}
                wrapStyle={{ width: "100%" }}
              />
              {accountChoice === "__custom" && (
                <input
                  className={inputCls}
                  value={customAccount}
                  onChange={(e) => setCustomAccount(e.target.value)}
                  placeholder="npr. 1610000000000000"
                  inputMode="numeric"
                />
              )}
            </div>
          </Field>
          <Field label="Broj izvoda">
            <input
              className={inputCls}
              value={statementNumber}
              onChange={(e) => setStatementNumber(e.target.value)}
              placeholder="opciono"
            />
            {!statementNumber.trim() && numberSuggestion != null && (
              <button
                type="button"
                onClick={() => setStatementNumber(String(numberSuggestion))}
                className="mt-1 text-[11.5px] text-brand-700 hover:text-brand-600 font-medium"
                title="Zadnji uneseni broj izvoda + 1"
              >
                Prijedlog: {numberSuggestion}
              </button>
            )}
          </Field>
          <Field label="Datum izvoda *">
            <PkDateInput
              value={statementDate}
              onChange={setStatementDate}
              ariaLabel="Datum izvoda"
              inputClassName="bg-cream-50"
            />
          </Field>
          {/* Ukupni promet: par duguje/potražuje uvijek u istom redu (kucaju
              se jedno za drugim sa izvoda) */}
          <div className="grid grid-cols-2 gap-2.5 sm:col-span-2">
            <Field label="Promet duguje (KM)">
              <PkAmountInput
                value={totalDuguje}
                onChange={setTotalDuguje}
                ariaLabel="Ukupni promet duguje"
                title="Prazno = 0,00 (izvod bez dugovne strane)"
                className="bg-cream-50"
              />
            </Field>
            <Field label="Promet potražuje (KM)">
              <PkAmountInput
                value={totalPotrazuje}
                onChange={setTotalPotrazuje}
                ariaLabel="Ukupni promet potražuje"
                title="Prazno = 0,00 (izvod bez potražne strane)"
                className="bg-cream-50"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Stavke */}
      <div className="rounded-xl bg-cream-100 border border-cream-300 p-5 mb-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-serif-display text-[18px] text-text-primary">
            Stavke ({rows.length})
          </h2>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3 py-[7px] rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconPlus size={15} />
            Dodaj stavku
          </button>
        </div>

        <div ref={rowsWrapRef} className="flex flex-col gap-3">
          {rows.map((r) => (
            <div
              key={r.key}
              className="grid grid-cols-2 lg:grid-cols-[210px_minmax(0,1fr)_minmax(0,1fr)_120px_36px] gap-2.5 items-end rounded-lg border border-cream-300/70 bg-cream-50/50 p-3"
            >
              <Field label="Smjer" small>
                <div className="flex rounded-lg border border-cream-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => updateRow(r.key, { direction: "out" })}
                    className={[
                      "flex-1 px-3 py-2 text-[12.5px] font-medium transition-colors",
                      r.direction === "out"
                        ? "bg-brand-600 text-white"
                        : "bg-cream-50 text-text-tertiary hover:bg-cream-200",
                    ].join(" ")}
                  >
                    Duguje
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRow(r.key, { direction: "in" })}
                    className={[
                      "flex-1 px-3 py-2 text-[12.5px] font-medium transition-colors border-l border-cream-300",
                      r.direction === "in"
                        ? "bg-brand-600 text-white"
                        : "bg-cream-50 text-text-tertiary hover:bg-cream-200",
                    ].join(" ")}
                  >
                    Potražuje
                  </button>
                </div>
              </Field>
              <Field label="Opis" small>
                <input
                  className={inputCls}
                  value={r.description}
                  onChange={(e) => updateRow(r.key, { description: e.target.value })}
                  placeholder={
                    statementNumber.trim()
                      ? `prazno = Izvod ${statementNumber.trim()}`
                      : "npr. Uplata po fakturi 12/26"
                  }
                  aria-label="Opis stavke"
                />
              </Field>
              <Field label="Protivstrana" small>
                <PartnerCombobox
                  value={r.counterpartyName}
                  partnerId={r.partnerId}
                  onChange={(text, pid) =>
                    updateRow(r.key, { counterpartyName: text, partnerId: pid })
                  }
                  partners={partners ?? []}
                  onRequestNew={(typed) => openNewPartner(r.key, typed)}
                  placeholder="opciono · naziv, šifra ili žiro račun partnera"
                  ariaLabel="Protivstrana"
                  inputClassName="bg-cream-50"
                />
              </Field>
              <Field label="Iznos (KM)" small>
                <PkAmountInput
                  value={r.amount}
                  onChange={(v) => updateRow(r.key, { amount: v })}
                  ariaLabel="Iznos stavke"
                  className="bg-cream-50"
                  title="Enter dodaje novu stavku"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addRow();
                    }
                  }}
                />
              </Field>
              <button
                type="button"
                title="Ukloni stavku"
                onClick={() => removeRow(r.key)}
                disabled={rows.length === 1}
                className="h-[37px] rounded-lg border border-cream-300 text-text-tertiary hover:text-danger hover:border-danger/40 transition-colors disabled:opacity-40 flex items-center justify-center"
              >
                <IconTrash size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Kontrola prometa + snimanje */}
      <div className="rounded-xl bg-cream-100 border border-cream-300 p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13.5px]">
          <ControlSum
            label="Duguje"
            entered={sumOut}
            declared={declaredDuguje}
            match={dugujeMatch}
          />
          <ControlSum
            label="Potražuje"
            entered={sumIn}
            declared={declaredPotrazuje}
            match={potrazujeMatch}
          />
          {declaredDuguje != null && declaredPotrazuje != null && rowsValid && (
            <span
              className={[
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12.5px] font-medium",
                balanced ? "bg-success-bg text-success" : "bg-warning-bg text-warning",
              ].join(" ")}
            >
              {balanced ? (
                <>
                  <IconCircleCheck size={14} /> izvod se slaže
                </>
              ) : (
                <>
                  <IconAlertCircle size={14} /> promet se još ne slaže
                </>
              )}
            </span>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-warning-bg text-warning text-[12.5px] leading-5 px-3 py-2">
            {error}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 text-white text-[13.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {create.isPending && (
              <IconLoader2 size={16} className="animate-spin" />
            )}
            Sačuvaj izvod
          </button>
          {disabledReason && (
            <span className="text-[12.5px] text-text-tertiary">
              {disabledReason}
            </span>
          )}
        </div>
      </div>

      {/* "+ Novi partner" iz protivstrane: nakon snimanja red se odmah poveže */}
      <PartnerFormModal
        orgId={orgId}
        initial={partnerModal?.initial ?? null}
        onClose={() => setPartnerModal(null)}
        onSaved={(p) => {
          if (partnerModal) {
            updateRow(partnerModal.rowKey, {
              counterpartyName: p.name,
              partnerId: p.id,
            });
          }
        }}
      />
    </div>
  );
}

function ControlSum({
  label,
  entered,
  declared,
  match,
}: {
  label: string;
  entered: number; // u feninzima
  declared: number | null;
  match: boolean;
}) {
  // razlika deklarisanog prometa i zbira stavki, u feninzima
  const diff = declared != null ? Math.round(declared * 100) - entered : null;
  return (
    <span className="text-text-tertiary">
      {label}:{" "}
      <span
        className={[
          "font-semibold tabular-nums",
          declared == null
            ? "text-text-primary"
            : match
              ? "text-success"
              : "text-warning",
        ].join(" ")}
      >
        {formatBAM(entered / 100)}
      </span>
      {declared != null && (
        <span className="text-text-tertiary"> od {formatBAM(declared)}</span>
      )}
      {diff != null && diff !== 0 && (
        <span className="text-warning font-medium tabular-nums">
          {" "}
          ({diff > 0 ? "fali" : "višak"} {formatBAM(Math.abs(diff) / 100)})
        </span>
      )}
    </span>
  );
}

function Field({
  label,
  children,
  small,
}: {
  label: string;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className={small ? "min-w-0" : ""}>
      <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}
