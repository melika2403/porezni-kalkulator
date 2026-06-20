"use client";

import { useState } from "react";
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
import { formatBAM } from "src/lib/format";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  useBankStatements,
  useCreateManualStatement,
} from "src/hooks/useBankStatements";

type RowInput = {
  key: number;
  date: string; // DD.MM.YYYY.
  description: string;
  counterpartyName: string;
  amount: string;
  direction: "in" | "out";
};

/** "1.234,56" / "1234.56" / "1234,56" → broj ili null */
function parseKm(s: string): number | null {
  let v = String(s || "").trim().replace(/\s/g, "");
  if (!v) return null;
  if (v.includes(",")) {
    v = v.replace(/\./g, "").replace(",", ".");
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(v)) return null;
  return Number(v);
}

/** "10.06.2026." ili "10.06.2026" → "2026-06-10" ili null */
function parseDateInput(s: string): string | null {
  const m = String(s || "")
    .trim()
    .match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayFormatted(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}.`;
}

let keyCounter = 1;

export default function RucniUnosIzvodaPage() {
  const router = useRouter();
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;
  const create = useCreateManualStatement(orgId);

  // poznati računi sa već učitanih izvoda (obrt sa više banaka bira)
  const { data: statements } = useBankStatements(orgId);
  const knownAccounts = [
    ...new Map(
      (statements ?? [])
        .filter((s) => s.account)
        .map((s) => [s.account as string, s.bankName ?? "Banka"]),
    ).entries(),
  ];
  const [accountChoice, setAccountChoice] = useState(""); // "" = iz profila
  const [customAccount, setCustomAccount] = useState("");

  const [statementNumber, setStatementNumber] = useState("");
  const [statementDate, setStatementDate] = useState(todayFormatted());
  const [totalDuguje, setTotalDuguje] = useState("");
  const [totalPotrazuje, setTotalPotrazuje] = useState("");
  const [rows, setRows] = useState<RowInput[]>([
    {
      key: 0,
      date: todayFormatted(),
      description: "",
      counterpartyName: "",
      amount: "",
      direction: "out",
    },
  ]);
  const [error, setError] = useState<string | null>(null);

  function updateRow(key: number, patch: Partial<RowInput>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [
      ...rs,
      {
        key: keyCounter++,
        date: statementDate,
        description: "",
        counterpartyName: "",
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
  const declaredDuguje = parseKm(totalDuguje);
  const declaredPotrazuje = parseKm(totalPotrazuje);
  let sumIn = 0;
  let sumOut = 0;
  let rowsValid = rows.length > 0;
  for (const r of rows) {
    const amount = parseKm(r.amount);
    if (amount == null || amount <= 0) {
      rowsValid = false;
      continue;
    }
    if (r.date && parseDateInput(r.date) == null) rowsValid = false;
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
        transactions: rows.map((r) => ({
          date: parseDateInput(r.date) ?? undefined,
          description: r.description.trim(),
          counterpartyName: r.counterpartyName.trim() || undefined,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Žiro račun">
            <div className="flex flex-col gap-2">
              <select
                value={accountChoice}
                onChange={(e) => setAccountChoice(e.target.value)}
                className={inputCls}
              >
                <option value="">Iz profila obrta</option>
                {knownAccounts.map(([account, bankName]) => (
                  <option key={account} value={account}>
                    {bankName} · {account}
                  </option>
                ))}
                <option value="__custom">Drugi račun (upiši)</option>
              </select>
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
          </Field>
          <Field label="Datum izvoda *">
            <input
              className={[
                inputCls,
                statementDate && dateIso == null ? "border-warning" : "",
              ].join(" ")}
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              placeholder="DD.MM.YYYY."
              inputMode="numeric"
            />
          </Field>
          <Field label="Ukupni promet duguje (KM) *">
            <input
              className={inputCls}
              value={totalDuguje}
              onChange={(e) => setTotalDuguje(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </Field>
          <Field label="Ukupni promet potražuje (KM) *">
            <input
              className={inputCls}
              value={totalPotrazuje}
              onChange={(e) => setTotalPotrazuje(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </Field>
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

        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div
              key={r.key}
              className="grid grid-cols-2 lg:grid-cols-[210px_120px_minmax(0,1fr)_minmax(0,1fr)_120px_36px] gap-2.5 items-end rounded-lg border border-cream-300/70 bg-cream-50/50 p-3"
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
              <Field label="Datum" small>
                <input
                  className={[
                    inputCls,
                    r.date && parseDateInput(r.date) == null ? "border-warning" : "",
                  ].join(" ")}
                  value={r.date}
                  onChange={(e) => updateRow(r.key, { date: e.target.value })}
                  placeholder="DD.MM.YYYY."
                  inputMode="numeric"
                />
              </Field>
              <Field label="Opis" small>
                <input
                  className={inputCls}
                  value={r.description}
                  onChange={(e) => updateRow(r.key, { description: e.target.value })}
                  placeholder="npr. Uplata po fakturi 12/26"
                />
              </Field>
              <Field label="Protivstrana" small>
                <input
                  className={inputCls}
                  value={r.counterpartyName}
                  onChange={(e) =>
                    updateRow(r.key, { counterpartyName: e.target.value })
                  }
                  placeholder="opciono"
                />
              </Field>
              <Field label="Iznos (KM)" small>
                <input
                  className={inputCls}
                  value={r.amount}
                  onChange={(e) => updateRow(r.key, { amount: e.target.value })}
                  placeholder="0,00"
                  inputMode="decimal"
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

        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 text-white text-[13.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {create.isPending && <IconLoader2 size={16} className="animate-spin" />}
          Sačuvaj izvod
        </button>
      </div>
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
