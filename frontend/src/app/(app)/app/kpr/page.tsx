"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconDownload,
  IconLoader2,
  IconBook2,
  IconArrowRight,
  IconFileText,
} from "@tabler/icons-react";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { formatBAM, formatDate } from "src/lib/format";
import { parseDateInput } from "src/lib/dateInput";
import { categoryDisplayLabel } from "src/lib/bankCategories";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { useKpr } from "src/hooks/useBankStatements";
import { ZbirniObracunModal } from "src/sections/kpr/ZbirniObracun";
import { KnjigaPrometa } from "src/sections/kpr/KnjigaPrometa";
import type { KprCols, KprRow } from "src/api/bankStatements";

const MJESECI = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

const PRIHOD_COLS: Array<{ key: keyof KprCols; n: number; label: string }> = [
  { key: "k11", n: 11, label: "U gotovini" },
  { key: "k12", n: 12, label: "Preko računa" },
  { key: "k13", n: 13, label: "U stvarima" },
  { key: "k14", n: 14, label: "PDV u prihodima" },
  { key: "k15", n: 15, label: "Ukupni prihodi" },
];

const RASHOD_COLS: Array<{ key: keyof KprCols; n: number; label: string }> = [
  { key: "k16", n: 16, label: "Roba / materijal" },
  { key: "k17", n: 17, label: "Bruto plaće" },
  { key: "k18", n: 18, label: "Doprinosi poduzetnika" },
  { key: "k19", n: 19, label: "Ostali" },
  { key: "k20", n: 20, label: "PDV u rashodima" },
  { key: "k21", n: 21, label: "Ukupni rashodi" },
];

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
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [customPeriod, setCustomPeriod] = useState(false);
  const [fromStr, setFromStr] = useState(`01.01.${currentYear}.`);
  const [toStr, setToStr] = useState(`31.12.${currentYear}.`);
  const [exporting, setExporting] = useState(false);
  // zbirni obračun (informativni pregled poslovanja za period)
  const [zbirniOpen, setZbirniOpen] = useState(false);
  // KPR-1041 ili Knjiga prometa KP-1042 (sestrinske knjige istog pravilnika)
  const [tab, setTab] = useState<"kpr" | "kp">("kpr");
  // ekranski filteri knjige (PDF uvijek štampa punu knjigu)
  const [vrstaFilter, setVrstaFilter] = useState<"sve" | "prihodi" | "rashodi">(
    "sve",
  );
  const [katFilter, setKatFilter] = useState("");

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  // period: godina ili ručni raspon (obrt otvoren/zatvoren u toku godine)
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

  // red je prihodovni ako ima nešto u kolonama 11-13, rashodovni za 16-19
  const jePrihod = (r: KprRow) => r.k11 !== 0 || r.k12 !== 0 || r.k13 !== 0;
  const jeRashod = (r: KprRow) =>
    r.k16 !== 0 || r.k17 !== 0 || r.k18 !== 0 || r.k19 !== 0;

  // kategorije prisutne u knjizi (za filter), sa brojem stavki
  const kategorije = useMemo(() => {
    const seen = new Map<string, number>();
    for (const r of data?.rows ?? []) {
      seen.set(r.kategorija, (seen.get(r.kategorija) ?? 0) + 1);
    }
    return [...seen.entries()].map(([id, cnt]) => ({
      value: id,
      label: `${categoryDisplayLabel(id) ?? id} (${cnt})`,
    }));
  }, [data]);

  const filterAktivan = vrstaFilter !== "sve" || katFilter !== "";
  const filteredRows = useMemo(() => {
    let rows = data?.rows ?? [];
    if (vrstaFilter === "prihodi") rows = rows.filter(jePrihod);
    else if (vrstaFilter === "rashodi") rows = rows.filter(jeRashod);
    if (katFilter) rows = rows.filter((r) => r.kategorija === katFilter);
    return rows;
  }, [data, vrstaFilter, katFilter]);

  // sume filtriranog prikaza (footer); KPI traka uvijek pokazuje punu knjigu
  const filteredTotals = useMemo(() => {
    const t: KprCols = {
      k11: 0, k12: 0, k13: 0, k14: 0, k15: 0,
      k16: 0, k17: 0, k18: 0, k19: 0, k20: 0, k21: 0,
    };
    for (const r of filteredRows) {
      for (const k of Object.keys(t) as (keyof KprCols)[]) t[k] += r[k];
    }
    return t;
  }, [filteredRows]);

  // grupisanje po mjesecima sa međuzbirovima (default prikaz: cijela godina)
  const mjeseci = useMemo(() => {
    const map = new Map<string, KprRow[]>();
    for (const r of filteredRows) {
      const k = String(r.datum).slice(0, 7);
      const arr = map.get(k);
      if (arr) arr.push(r);
      else map.set(k, [r]);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([mjesec, rows]) => ({
        mjesec,
        label: `${MJESECI[Number(mjesec.slice(5, 7)) - 1]} ${mjesec.slice(0, 4)}.`,
        rows,
        prihodi: rows.reduce((s, r) => s + r.k15, 0),
        rashodi: rows.reduce((s, r) => s + r.k21, 0),
      }));
  }, [filteredRows]);

  const dohodak = data ? data.totals.k15 - data.totals.k21 : 0;

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
      <div className="relative flex flex-wrap items-end justify-between gap-3 mb-6">
        <HelpButton slug="kpr" className="absolute top-0 right-0" />
        <div>
          <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
            <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
            Knjige i evidencije
          </div>
          <h1 className="font-serif-display text-[28px] leading-tight text-text-primary mb-[5px]">
            Knjiga prihoda i rashoda.
          </h1>
          <p className="text-[13px] leading-6 text-text-tertiary max-w-[520px]">
            KPR-1041 se puni automatski iz potvrđenih stavki bankovnih izvoda.
            Princip blagajne: prihod na datum naplate, rashod na datum plaćanja.
          </p>
        </div>
        {tab === "kpr" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[13px] text-text-secondary cursor-pointer select-none mr-1">
            <input
              type="checkbox"
              checked={customPeriod}
              onChange={(e) => setCustomPeriod(e.target.checked)}
              className="w-4 h-4 accent-[#3a5c42]"
            />
            Ručni period
          </label>
          {customPeriod ? (
            <>
              <PkDateInput
                value={fromStr}
                onChange={setFromStr}
                ariaLabel="Period od"
                className="w-[145px]"
              />
              <span className="text-text-tertiary text-[13px]">do</span>
              <PkDateInput
                value={toStr}
                onChange={setToStr}
                ariaLabel="Period do"
                className="w-[145px]"
              />
            </>
          ) : (
            <PkSelect
              ariaLabel="Godina"
              value={year}
              onChange={(v) => setYear(Number(v))}
              options={years.map((y) => ({ value: y, label: `${y}.` }))}
            />
          )}
          <Link
            href="/app/obrasci"
            title="SPR-1053 (godišnja specifikacija) se popunjava automatski iz ove knjige, na stranici Obrasci"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconFileText size={16} />
            Sačini SPR
          </Link>
          <button
            type="button"
            onClick={() => setZbirniOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
            title="Informativni pregled poslovanja za period (za banku/klijenta)"
          >
            Zbirni obračun
          </button>
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
        )}
      </div>

      {/* tabovi: KPR-1041 / Knjiga prometa */}
      <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100 mb-6 flex-wrap">
        {(
          [
            ["kpr", "KPR-1041"],
            ["kp", "Knjiga prometa (KP-1042)"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={[
              "px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors whitespace-nowrap",
              tab === id
                ? "bg-brand-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-cream-200",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <ZbirniObracunModal
        orgId={orgId}
        open={zbirniOpen}
        onClose={() => setZbirniOpen(false)}
      />

      {tab === "kp" && <KnjigaPrometa orgId={orgId} />}
      {tab === "kpr" && (
      <>

      {/* KPI: puna knjiga za period (filteri ne diraju ove cifre) */}
      {data && data.rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-cream-100 border border-cream-300 rounded-xl p-[18px]">
            <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
              Ukupni prihodi (15)
            </div>
            <div className="font-serif-display text-[22px] leading-none tabular-nums text-brand-600">
              {formatBAM(data.totals.k15)}
            </div>
          </div>
          <div className="bg-cream-100 border border-cream-300 rounded-xl p-[18px]">
            <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
              Ukupni rashodi (21)
            </div>
            <div className="font-serif-display text-[22px] leading-none tabular-nums text-text-primary">
              {formatBAM(data.totals.k21)}
            </div>
          </div>
          <div className="bg-cream-100 border border-cream-300 rounded-xl p-[18px]">
            <div
              className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1"
              title="Prihodi minus rashodi; osnova za SPR i akontacije"
            >
              Dohodak (15 - 21)
            </div>
            <div
              className={`font-serif-display text-[22px] leading-none tabular-nums ${
                dohodak >= 0 ? "text-brand-700" : "text-accent-500"
              }`}
            >
              {formatBAM(dohodak)}
            </div>
            <div className="text-[11.5px] text-text-tertiary mt-1.5">
              za period {periodLabel}
            </div>
          </div>
        </div>
      )}

      {/* ekranski filteri (PDF štampa punu knjigu) */}
      {data && data.rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100">
            {(
              [
                ["sve", "Sve"],
                ["prihodi", "Prihodi"],
                ["rashodi", "Rashodi"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setVrstaFilter(id)}
                className={[
                  "px-3.5 py-1.5 text-[12.5px] font-medium rounded-full transition-colors",
                  vrstaFilter === id
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-cream-200",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
          <PkSelect
            ariaLabel="Kategorija"
            value={katFilter}
            onChange={(v) => setKatFilter(String(v ?? ""))}
            options={[
              { value: "", label: "Sve kategorije" },
              ...kategorije,
            ]}
          />
          {filterAktivan && (
            <span className="text-[12px] text-text-tertiary">
              {filteredRows.length} od {data.rows.length} stavki; PDF uvijek
              štampa punu knjigu
            </span>
          )}
        </div>
      )}

      {/* Knjiga */}
      <div className="rounded-xl bg-cream-100 border border-cream-300">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
            Učitavanje knjige...
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
              KPR i pojaviće se ovdje.
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
          <div className="overflow-auto max-h-[72vh]">
            <table className="w-full text-[14px] min-w-[1300px]">
              <thead>
                <tr className="text-text-tertiary">
                  <th className="sticky top-0 z-10 bg-cream-100 border-b border-cream-300 text-left px-4 py-3.5 font-medium whitespace-nowrap text-[12.5px] uppercase tracking-[0.05em]">Rb.</th>
                  <th className="sticky top-0 z-10 bg-cream-100 border-b border-cream-300 text-left px-4 py-3.5 font-medium whitespace-nowrap text-[12.5px] uppercase tracking-[0.05em]">Datum</th>
                  <th className="sticky top-0 z-10 bg-cream-100 border-b border-cream-300 text-left px-4 py-3.5 font-medium whitespace-nowrap text-[12.5px] uppercase tracking-[0.05em]">Dokument</th>
                  <th className="sticky top-0 z-10 bg-cream-100 border-b border-cream-300 text-left px-4 py-3.5 font-medium min-w-[180px] text-[12.5px] uppercase tracking-[0.05em]">Opis</th>
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      className={[
                        "sticky top-0 z-10 bg-cream-100 border-b border-cream-300 text-right px-4 py-3.5 font-medium whitespace-nowrap text-[12.5px] uppercase tracking-[0.05em]",
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
                {mjeseci.map((m) => (
                  <Fragment key={m.mjesec}>
                    {/* podnaslov mjeseca sa međuzbirom */}
                    <tr className="border-b border-cream-300 bg-cream-50/70">
                      <td colSpan={4 + cols.length} className="px-4 py-2">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="text-[12.5px] font-semibold text-text-primary">
                            {m.label}
                          </span>
                          <span className="ml-auto text-[11.5px] text-text-tertiary tabular-nums">
                            Prihodi {formatBAM(m.prihodi)} · Rashodi{" "}
                            {formatBAM(m.rashodi)} · Dohodak{" "}
                            <strong
                              className={
                                m.prihodi - m.rashodi >= 0
                                  ? "text-brand-700"
                                  : "text-accent-500"
                              }
                            >
                              {formatBAM(m.prihodi - m.rashodi)}
                            </strong>
                          </span>
                        </div>
                      </td>
                    </tr>
                    {m.rows.map((r) => {
                      const jeKp = r.brojDokumenta === "KP-1042";
                      const klik = r.statementId != null || jeKp;
                      return (
                        <tr
                          key={r.rbr}
                          onClick={
                            r.statementId != null
                              ? () =>
                                  router.push(
                                    `/app/bankovni-izvodi/${r.statementId}`,
                                  )
                              : jeKp
                                ? () => setTab("kp")
                                : undefined
                          }
                          title={
                            r.statementId != null
                              ? "Otvori izvod"
                              : jeKp
                                ? "Otvori Knjigu prometa (KP-1042)"
                                : undefined
                          }
                          className={[
                            "border-b border-cream-300/50 hover:bg-[rgba(15,26,18,0.02)]",
                            klik ? "cursor-pointer" : "",
                          ].join(" ")}
                        >
                          <td className="px-4 py-3.5 text-text-tertiary">
                            {r.rbr}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {formatDate(r.datum)}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {r.brojDokumenta}
                          </td>
                          <td
                            className="px-4 py-3.5 max-w-[300px] truncate"
                            title={r.opis}
                          >
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
                      );
                    })}
                  </Fragment>
                ))}
                {filterAktivan && filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4 + cols.length}
                      className="px-4 py-8 text-center text-[13px] text-text-tertiary"
                    >
                      Nijedna stavka ne odgovara izabranom filteru.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-cream-300 bg-cream-50/60">
                  <td colSpan={4} className="px-4 py-4 font-semibold text-text-primary text-[14.5px]">
                    {filterAktivan
                      ? "Ukupno (filtrirano)"
                      : `Ukupno za period ${periodLabel}`}
                  </td>
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className="px-4 py-4 text-right tabular-nums font-semibold whitespace-nowrap text-[14.5px]"
                    >
                      <Num
                        value={
                          filterAktivan
                            ? filteredTotals[c.key]
                            : data.totals[c.key]
                        }
                        bold
                        green={c.n <= 15}
                      />
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
        Napomena: da bi knjiga bila kompletna za poreznu prijavu, učitajte sve
        izvode od početka godine (ili od otvaranja obrta). Banke drže arhivu
        izvoda u e-bankingu.
      </p>
      </>
      )}
    </div>
  );
}
