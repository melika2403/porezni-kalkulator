"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Uvoz prethodnih plata (PK Office dizajn). Koristi se i u /app (obračuni
//  plata) i na marketing stranici obračuna (odluka vlasnika: isti dizajn na
//  obje strane, kao karton radnika): Modal iz app-shell-a nosi .pk-scope pa
//  PK stil (pk-embed.css) važi i van /app. Backend je POST /api/payroll/import,
//  podaci su isti Payroll zapisi, pa je sinhronizacija automatska u oba smjera.
//  Grid: radnici (redovi) x 12 mjeseci (kolone), po ćeliji bruto, porezni
//  koeficijent po radniku, datum isplate po mjesecu (za GIP). Motor iz bruta
//  izračuna doprinose/porez/neto BEZ minulog rada. Mjeseci koji već imaju
//  stvarni obračun su zaključani.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import "src/styles/pk-embed.css";
import {
  listYearPayrolls,
  importPayrolls,
  type Payroll,
  type ImportPayrollRow,
} from "src/api/payroll";
import type { Worker } from "src/api/profile";
import { parseDecimal, sanitizeDecimalInput } from "src/utils/parseDecimal";
import { Modal } from "src/components/app-shell/Modal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { formatKm, parseKm } from "src/lib/amountInput";
import { isoToDisplay, parseDateInput } from "src/lib/dateInput";

const r2 = (n: number) => Math.round(n * 100) / 100;

// Porezni koeficijent: 0 je validan (lični odbitak 0), pa NE smije `|| 1` koji
// bi falsy-nulu vratio na 1. Prazno polje koristi koeficijent radnika.
// parseDecimal prihvata i tačku i zarez, da koeficijent ne divergira po ekranu.
export const coefFor = (
  raw: string | number | null | undefined,
  workerCoef: number | null | undefined,
): number => {
  const src =
    raw != null && String(raw).trim() !== "" ? raw : (workerCoef ?? 1);
  const n = parseDecimal(String(src));
  return Number.isFinite(n) && n >= 0 ? n : 1;
};

// Klijentski pregled neto plate, ista formula kao backend (bez minulog rada).
// Autoritativni izračun radi backend pri spremanju, ovo je samo orijentir.
export function netoPreview(bruto: number, koef: number) {
  if (!(bruto > 0)) return 0;
  const empTotal = r2(r2(bruto * 0.17) + r2(bruto * 0.125) + r2(bruto * 0.015));
  const deduction = r2(koef * 300);
  const taxBase = Math.max(0, r2(bruto - empTotal - deduction));
  const incomeTax = r2(taxBase * 0.1);
  return r2(bruto - empTotal - incomeTax);
}

// Zadnji dan mjeseca kao ISO (YYYY-MM-DD), default datum isplate za GIP.
export function lastDayOfMonthIso(year: number, m: number) {
  const last = new Date(year, m, 0).getDate();
  return `${year}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

const MJESECI_KRATKO = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Maj",
  "Jun",
  "Jul",
  "Avg",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];

const thCls =
  "px-2 py-2 text-center text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap border-b border-cream-300";

export function UvozPlataPkModal({
  orgId,
  year,
  radnici,
  isObrt,
  onClose,
}: {
  orgId: number;
  year: number;
  radnici: Worker[];
  isObrt: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  // Vlasnik obrta ide u 2002, ne u GIP, pa ga ne uvozimo.
  const workers = useMemo(
    () => radnici.filter((w) => !(isObrt && w.role === "VLASNIK")),
    [radnici, isObrt],
  );

  // Svih 12 mjeseci: postojeći (zaključani) i već uvezeni obračuni. Jedan poziv
  // za cijelu godinu (ne 12 paralelnih), mapiran po radniku i mjesecu.
  const yearQ = useQuery({
    queryKey: ["pk-import-year", orgId, year],
    queryFn: async () => {
      const res = await listYearPayrolls(orgId, year);
      const map = new Map<string, Payroll>();
      if (res.ok) for (const p of res.data) map.set(`${p.workerId}:${p.month}`, p);
      return map;
    },
  });

  const [koef, setKoef] = useState<Record<number, string>>({});
  const [bruto, setBruto] = useState<Record<string, string>>({});
  // Datum isplate po mjesecu (display "DD.MM.GGGG."), za GIP.
  const [dates, setDates] = useState<Record<number, string>>({});

  // Poseban ključ od marketing modala: PK drži display formate u nacrtu.
  const lsKey = `pk_uvoz_office_${orgId}_${year}`;

  // Seed jednom kad stignu podaci (render-adjust, ne effect): koeficijent iz
  // profila, bruto iz već uvezenih obračuna, pa preko toga nesnimljeni nacrt
  // iz localStorage (pamćenje unosa i bez klika "Sačuvaj uvoz").
  const [seedKey, setSeedKey] = useState<string | null>(null);
  const seeded = seedKey === lsKey;
  // čekaj i workers: bez njih seed ne bi popunio koeficijente ni uvezeni
  // bruto, a seedKey lock bi spriječio kasniji re-seed kad radnici stignu
  if (yearQ.data && workers.length > 0 && !seeded) {
    setSeedKey(lsKey);
    const k: Record<number, string> = {};
    const b: Record<string, string> = {};
    const dts: Record<number, string> = {};
    for (const w of workers) {
      k[w.id] = String(w.taxCoefficient ?? 1).replace(".", ",");
      for (let m = 1; m <= 12; m++) {
        const p = yearQ.data.get(`${w.id}:${m}`);
        if (p && p.imported) b[`${w.id}:${m}`] = formatKm(Number(p.gross));
      }
    }
    for (let m = 1; m <= 12; m++) {
      let pd = "";
      for (const w of workers) {
        const p = yearQ.data.get(`${w.id}:${m}`);
        if (p && p.imported && p.paymentDate) {
          pd = String(p.paymentDate).slice(0, 10);
          break;
        }
      }
      dts[m] = isoToDisplay(pd || lastDayOfMonthIso(year, m));
    }
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const d = JSON.parse(raw) as {
          koef?: Record<number, string>;
          bruto?: Record<string, string>;
          dates?: Record<number, string>;
        };
        if (d.koef) Object.assign(k, d.koef);
        if (d.bruto) Object.assign(b, d.bruto);
        if (d.dates) Object.assign(dts, d.dates);
      }
    } catch {
      /* ignore */
    }
    setKoef(k);
    setBruto(b);
    setDates(dts);
  }

  // Nacrt u localStorage na svaku promjenu (pamćenje bez "Sačuvaj uvoz").
  useEffect(() => {
    if (!seeded) return;
    try {
      localStorage.setItem(lsKey, JSON.stringify({ koef, bruto, dates }));
    } catch {
      /* ignore */
    }
  }, [koef, bruto, dates, seeded, lsKey]);

  const isLocked = (workerId: number, month: number) => {
    const p = yearQ.data?.get(`${workerId}:${month}`);
    return !!p && !p.imported; // stvarni obračun aplikacije, ne diramo
  };

  const setCell = (workerId: number, month: number, val: string) =>
    setBruto((prev) => ({ ...prev, [`${workerId}:${month}`]: val }));

  // Kopiraj prvu unesenu bruto vrijednost kroz prazne mjesece. Tekući i
  // budući mjeseci tekuće godine se obračunavaju u programu, ne uvoze.
  const fillRight = (w: Worker) => {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    const maxMonth = year < curY ? 12 : year === curY ? curM - 1 : 0;
    setBruto((prev) => {
      const next = { ...prev };
      let val = "";
      for (let m = 1; m <= maxMonth; m++) {
        if (isLocked(w.id, m)) continue;
        const key = `${w.id}:${m}`;
        if (next[key] && next[key] !== "") {
          val = next[key];
          continue;
        }
        if (val) next[key] = val;
      }
      return next;
    });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const rows: ImportPayrollRow[] = [];
      // ćelije koje su nešto sadržavale ali se ne parsiraju u pozitivan iznos
      // (npr. "1.234," sa visećim zarezom): NE smiju se tiho preskočiti jer bi
      // taj radnik/mjesec nestao iz uvoza i GIP ostao nekompletan
      const nevalidne: string[] = [];
      for (const w of workers) {
        const kc = coefFor(koef[w.id], w.taxCoefficient);
        for (let m = 1; m <= 12; m++) {
          if (isLocked(w.id, m)) continue;
          const v = bruto[`${w.id}:${m}`];
          if (v == null || v.trim() === "") continue;
          const g = parseKm(v);
          if (g == null || g <= 0) {
            nevalidne.push(`${w.lastName} ${w.firstName} (${MJESECI_KRATKO[m - 1]})`);
            continue;
          }
          rows.push({
            workerId: w.id,
            month: m,
            gross: g,
            taxCoefficient: kc,
            paymentDate:
              parseDateInput(dates[m] ?? "") ?? lastDayOfMonthIso(year, m),
          });
        }
      }
      if (nevalidne.length > 0) {
        throw new Error(
          `Ispravite bruto iznos: ${nevalidne.join(", ")}. Uvoz je zaustavljen da nijedan mjesec ne ispadne.`,
        );
      }
      if (rows.length === 0) throw new Error("Nema unesenih plata za uvoz");
      const r = await importPayrolls({ organizationId: orgId, year, rows });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-payrolls", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-payrolls-year", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-payroll-summary", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-import-year", orgId, year] });
      // marketing stranica obračuna (isti modal se koristi i tamo)
      qc.invalidateQueries({ queryKey: ["payrolls", orgId] });
      // izvedeni pregledi koji zbrajaju SVE obračune (uvoz mijenja sume):
      // marketing rekapitulacija/uplatnice, moje statistike, i PK Office
      // payroll-status badge, da ne ostanu na pred-uvoznim brojevima
      qc.invalidateQueries({ queryKey: ["monthlySummary", orgId] });
      qc.invalidateQueries({ queryKey: ["myStats"] });
      qc.invalidateQueries({ queryKey: ["pk-office", "payroll-status"] });
      try {
        localStorage.removeItem(lsKey);
      } catch {
        /* ignore */
      }
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Uvoz prethodnih plata (${year}.)`}
      maxWidthClass="max-w-[1320px]"
      footer={
        <>
          {saveMut.isError && (
            <span className="text-[12.5px] text-accent-500 mr-auto">
              {(saveMut.error as Error)?.message || "Greška pri uvozu"}
            </span>
          )}
          {saveMut.isSuccess && saveMut.data && (
            <span className="text-[12.5px] text-success mr-auto">
              Uvezeno: {saveMut.data.created} novih, {saveMut.data.updated}{" "}
              izmijenjenih
              {saveMut.data.skipped.length > 0
                ? `, ${saveMut.data.skipped.length} preskočeno`
                : ""}
              .
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg border border-cream-300 text-text-secondary text-[12.5px] font-medium hover:bg-cream-200 transition-colors"
          >
            Zatvori
          </button>
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || yearQ.isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saveMut.isPending && (
              <IconLoader2 size={15} className="animate-spin" />
            )}
            {saveMut.isPending ? "Spremam..." : "Sačuvaj uvoz"}
          </button>
        </>
      }
    >
      <p className="text-[12.5px] leading-5 text-text-tertiary mb-1">
        Za radnike koji su platu primali u ranijem programu, ako ste tek u toku
        godine prešli na PK Office. Upišite bruto i porezni koeficijent, ostalo
        (doprinosi, porez, neto) računa se automatski, samo da godišnji GIP-1022
        bude kompletan. Mjeseci koji već imaju stvarni obračun su zaključani.
      </p>
      <p className="text-[12.5px] leading-5 text-text-tertiary mb-3">
        Datum ispod naziva mjeseca je <strong>datum isplate plate</strong> za
        taj mjesec (ulazi u GIP): default je zadnji dan mjeseca, prepravite ga
        ako znate stvarni datum.
      </p>

      {yearQ.isLoading ? (
        <p className="text-[13px] text-text-tertiary py-6 text-center">
          Učitavanje...
        </p>
      ) : workers.length === 0 ? (
        <p className="text-[13px] text-text-tertiary py-6 text-center">
          Nema radnika za uvoz.
        </p>
      ) : (
        <div className="overflow-x-auto">
          {/* border-separate umjesto collapse: sticky ćelija sa collapse ne
              crta pouzdano pozadinu/border pa se skrolani sadržaj providi */}
          <table className="border-separate border-spacing-0">
            <thead>
              <tr>
                <th
                  className={`${thCls} text-left sticky left-0 bg-cream-100 z-[2] border-r border-r-cream-300`}
                >
                  Radnik
                </th>
                <th className={thCls}>Koef.</th>
                {MJESECI_KRATKO.map((m, i) => {
                  const mm = i + 1;
                  return (
                    <th key={m} className={thCls}>
                      {m}
                      <div className="mt-1.5 font-normal normal-case tracking-normal">
                        <PkDateInput
                          value={dates[mm] ?? ""}
                          onChange={(v) =>
                            setDates((p) => ({ ...p, [mm]: v }))
                          }
                          ariaLabel={`Datum isplate za ${m}`}
                          title="Datum isplate plate za ovaj mjesec (ide u GIP)"
                          className="w-[128px]"
                        />
                      </div>
                    </th>
                  );
                })}
                <th className={thCls} />
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => {
                const kc = coefFor(koef[w.id], w.taxCoefficient);
                // border-separate ne crta border na <tr>, pa svaka ćelija
                // nosi svoj donji border
                const tdB = "border-b border-cream-200";
                return (
                  <tr key={w.id}>
                    <td
                      className={`px-2 py-1.5 text-[12.5px] font-medium text-text-primary whitespace-nowrap sticky left-0 bg-cream-100 z-[1] ${tdB} border-r border-r-cream-300`}
                    >
                      {w.lastName} {w.firstName}
                    </td>
                    <td className={`px-1 py-1.5 align-top ${tdB}`}>
                      <input
                        value={koef[w.id] ?? ""}
                        onChange={(e) =>
                          setKoef((p) => ({
                            ...p,
                            [w.id]: sanitizeDecimalInput(e.target.value),
                          }))
                        }
                        inputMode="decimal"
                        aria-label={`Porezni koeficijent: ${w.lastName} ${w.firstName}`}
                        className="w-[52px] rounded-lg border border-cream-300 bg-cream-100 px-2 py-1.5 text-[12.5px] text-right tabular-nums text-text-primary focus:outline-none focus:border-brand-600"
                      />
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const key = `${w.id}:${m}`;
                      if (isLocked(w.id, m)) {
                        const p = yearQ.data?.get(key);
                        return (
                          <td key={m} className={`px-1 py-1.5 align-top ${tdB}`}>
                            <div
                              title="Već postoji stvarni obračun za ovaj mjesec"
                              className="text-[11px] text-text-tertiary text-right px-1 py-1 tabular-nums"
                            >
                              {formatKm(Number(p?.gross) || 0)}
                              <div className="text-[9.5px]">obračunato</div>
                            </div>
                          </td>
                        );
                      }
                      const val = bruto[key] ?? "";
                      const g = parseKm(val) ?? 0;
                      return (
                        <td key={m} className={`px-1 py-1.5 align-top ${tdB}`}>
                          <div className="w-[104px]">
                            <PkAmountInput
                              value={val}
                              onChange={(v) => setCell(w.id, m, v)}
                              ariaLabel={`Bruto ${MJESECI_KRATKO[m - 1]}: ${w.lastName} ${w.firstName}`}
                              placeholder="bruto"
                              className="text-right"
                            />
                          </div>
                          {g > 0 && (
                            <div className="text-[10px] text-text-tertiary text-right mt-0.5 tabular-nums">
                              neto {formatKm(netoPreview(g, kc))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className={`px-1 py-1.5 align-top ${tdB}`}>
                      <button
                        type="button"
                        onClick={() => fillRight(w)}
                        title="Kopiraj prvu unesenu bruto kroz prazne mjesece"
                        className="px-2.5 py-1.5 rounded-full border border-cream-300 text-brand-600 text-[11px] font-medium whitespace-nowrap hover:bg-brand-100 transition-colors"
                      >
                        Popuni udesno
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
