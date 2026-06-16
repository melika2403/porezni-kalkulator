"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconDownload,
  IconLoader2,
  IconBook2,
  IconArrowRight,
} from "@tabler/icons-react";
import { formatBAM, formatDate } from "src/lib/format";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { useKpr } from "src/hooks/useBankStatements";
import type { KprCols } from "src/api/bankStatements";

const PRIHOD_COLS: Array<{ key: keyof KprCols; n: number; label: string }> = [
  { key: "k11", n: 11, label: "U gotovini" },
  { key: "k12", n: 12, label: "Preko raÄuna" },
  { key: "k13", n: 13, label: "U stvarima" },
  { key: "k14", n: 14, label: "PDV u prihodima" },
  { key: "k15", n: 15, label: "Ukupni prihodi" },
];

const RASHOD_COLS: Array<{ key: keyof KprCols; n: number; label: string }> = [
  { key: "k16", n: 16, label: "Roba / materijal" },
  { key: "k17", n: 17, label: "Bruto plaÄ‡e" },
  { key: "k18", n: 18, label: "Doprinosi poduzetnika" },
  { key: "k19", n: 19, label: "Ostali" },
  { key: "k20", n: 20, label: "PDV u rashodima" },
  { key: "k21", n: 21, label: "Ukupni rashodi" },
];

/** "10.06.2026." ili "10.06.2026" â†’ "2026-06-10" ili null */
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

function Num({
  value,
  bold,
  green,
}: {
  value: number;
  bold?: boolean;
  green?: boolean;
}) {
  if (!value || Math.abs(value) < 0.005) {
    return <span className="text-text-tertiary/50">-</span>;
  }
  return (
    <span
      className={[bold ? "font-semibold" : "", green ? "text-brand-600" : ""]
        .join(" ")
        .trim()}
    >
      {formatBAM(value)}
    </span>
  );
}

export default function KprPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [customPeriod, setCustomPeriod] = useState(false);
  const [fromStr, setFromStr] = useState(`01.01.${currentYear}.`);
  const [toStr, setToStr] = useState(`31.12.${currentYear}.`);
  const [exporting, setExporting] = useState(false);

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  // period: godina ili ruÄni raspon (obrt otvoren/zatvoren u toku godine)
  const fromIso = parseDateInput(fromStr);
  const toIso = parseDateInput(toStr);
  const period = customPeriod
    ? fromIso && toIso && fromIso <= toIso
      ? { from: fromIso, to: toIso }
      : null
    : { year };
  const { data, isLoading } = useKpr(orgId, period);

  const periodLabel = customPeriod
    ? `${fromStr.replace(/\.?$/, ".")} - ${toStr.replace(/\.?$/, ".")}`
    : `${year}.`;

  const cols = data
    ? [
        ...PRIHOD_COLS.filter((c) => data.isPdvObveznik || c.n !== 14),
        ...RASHOD_COLS.filter((c) => data.isPdvObveznik || c.n !== 20),
      ]
    : [];
  const years = [currentYear, currentYear - 1, currentYear - 2];

  async function exportPdf() {
    if (!data || data.rows.length === 0 || exporting) return;
    setExporting(true);
    try {
      const { downloadKpr1041 } = await import("src/sections/kpr/fillKpr1041");
      await downloadKpr1041(data);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="px-6 py-6 max-w-[1600px] mx-auto">
      {/* Zaglavlje */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
            <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
            Knjige i evidencije
          </div>
          <h1 className="font-serif-display text-[28px] leading-tight text-text-primary mb-[5px]">
            Knjiga prihoda i rashoda.
          </h1>
          <p className="text-[13px] leading-6 text-text-tertiary max-w-[520px]">
            KPR-1041 se puni automatski iz potvrÄ‘enih stavki bankovnih izvoda.
            Princip blagajne: prihod na datum naplate, rashod na datum plaÄ‡anja.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer select-none mr-1">
            <input
              type="checkbox"
              checked={customPeriod}
              onChange={(e) => setCustomPeriod(e.target.checked)}
              className="w-4 h-4 accent-[#3a5c42]"
            />
            RuÄni period
          </label>
          {customPeriod ? (
            <>
              <input
                value={fromStr}
                onChange={(e) => setFromStr(e.target.value)}
                placeholder="DD.MM.GGGG."
                inputMode="numeric"
                className={[
                  "w-[120px] rounded-lg border bg-cream-100 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600",
                  fromStr && !fromIso ? "border-warning" : "border-cream-300",
                ].join(" ")}
              />
              <span className="text-text-tertiary text-[13px]">do</span>
              <input
                value={toStr}
                onChange={(e) => setToStr(e.target.value)}
                placeholder="DD.MM.GGGG."
                inputMode="numeric"
                className={[
                  "w-[120px] rounded-lg border bg-cream-100 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600",
                  toStr && !toIso ? "border-warning" : "border-cream-300",
                ].join(" ")}
              />
            </>
          ) : (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}.
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={!data || data.rows.length === 0 || exporting}
            onClick={exportPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {exporting ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconDownload size={16} />
            )}
            Preuzmi KPR-1041 (PDF)
          </button>
        </div>
      </div>

      {/* Knjiga */}
      <div className="rounded-xl bg-cream-100 border border-cream-300">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
            UÄitavanje knjige...
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <span className="w-12 h-12 rounded-full bg-cream-200 text-text-tertiary inline-flex items-center justify-center mb-3">
              <IconBook2 size={22} />
            </span>
            <p className="text-[14px] font-medium text-text-primary">
              Knjiga za period {periodLabel} je prazna
            </p>
            <p className="text-[12.5px] text-text-tertiary mt-1 max-w-[400px] mx-auto">
              Potvrdite stavke na bankovnim izvodima sa kategorijom koja ide u
              KPR i pojaviÄ‡e se ovdje.
            </p>
            <Link
              href="/app/bankovni-izvodi"
              className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-medium text-brand-700 hover:text-brand-600"
            >
              Bankovni izvodi
              <IconArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px] min-w-[1300px]">
              <thead>
                <tr className="text-text-tertiary border-b border-cream-300">
                  <th className="text-left px-4 py-3.5 font-medium whitespace-nowrap text-[12.5px] uppercase tracking-[0.05em]">Rb.</th>
                  <th className="text-left px-4 py-3.5 font-medium whitespace-nowrap text-[12.5px] uppercase tracking-[0.05em]">Datum</th>
                  <th className="text-left px-4 py-3.5 font-medium whitespace-nowrap text-[12.5px] uppercase tracking-[0.05em]">Dokument</th>
                  <th className="text-left px-4 py-3.5 font-medium min-w-[180px] text-[12.5px] uppercase tracking-[0.05em]">Opis</th>
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      className={[
                        "text-right px-4 py-3.5 font-medium whitespace-nowrap text-[12.5px] uppercase tracking-[0.05em]",
                        c.n <= 15 ? "text-brand-700" : "text-accent-500",
                      ].join(" ")}
                      title={`${c.n <= 15 ? "Prihodi" : "Rashodi"}: ${c.label}`}
                    >
                      {c.n}) {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr
                    key={r.rbr}
                    className="border-b border-cream-300/50 hover:bg-[rgba(15,26,18,0.02)]"
                  >
                    <td className="px-4 py-3.5 text-text-tertiary">{r.rbr}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {formatDate(r.datum)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {r.brojDokumenta}
                    </td>
                    <td className="px-4 py-3.5 max-w-[300px] truncate" title={r.opis}>
                      {r.opis}
                    </td>
                    {cols.map((c) => (
                      <td
                        key={c.key}
                        className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap"
                      >
                        <Num
                          value={r[c.key]}
                          bold={c.n === 15 || c.n === 21}
                          green={c.n <= 15}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-cream-300 bg-cream-50/60">
                  <td colSpan={4} className="px-4 py-4 font-semibold text-text-primary text-[14.5px]">
                    Ukupno za period {periodLabel}
                  </td>
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className="px-4 py-4 text-right tabular-nums font-semibold whitespace-nowrap text-[14.5px]"
                    >
                      <Num value={data.totals[c.key]} bold green={c.n <= 15} />
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {data && data.rows.length > 0 && (
        <p className="text-[12px] text-text-tertiary mt-3">
          {data.isPdvObveznik
            ? "PDV obveznik: iz prihoda i rashoda sa PDV-om izbija se 17% u kolone 14 i 20, pa kolone 15 i 21 prikazuju osnovicu."
            : "Organizacija nije u PDV sistemu, pa se kolone 14 i 20 ne prikazuju."}
        </p>
      )}

      <p className="text-[12px] text-text-tertiary mt-1.5">
        Napomena: da bi knjiga bila kompletna za poreznu prijavu, uÄitajte sve
        izvode od poÄetka godine (ili od otvaranja obrta). Banke drÅ¾e arhivu
        izvoda u e-bankingu.
      </p>
    </div>
  );
}
