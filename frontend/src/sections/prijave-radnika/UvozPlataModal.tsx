"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  Uvoz prethodnih plata (za GIP). Klijent koji pređe na nas u toku godine ovdje
//  ubaci obračune radnika iz ranijeg programa, samo da bi godišnji GIP-1022 bio
//  kompletan. Grid: radnici (redovi) x 12 mjeseci (kolone), po ćeliji bruto, a
//  porezni koeficijent po radniku. Motor (backend) iz bruta + koeficijenta
//  izračuna doprinose/porez/neto, BEZ minulog rada. Mjeseci koji već imaju
//  stvarni obračun su zaključani (ne diraju se).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listPayrolls,
  importPayrolls,
  type Payroll,
  type ImportPayrollRow,
} from "src/api/payroll";
import type { Worker } from "src/api/profile";
import { formatMoneyLive, formatMoneyBlur, parseMoneyInput } from "src/lib/format";
import DateInput from "src/components/DateInput/DateInput";
import uvozStyles from "./uvozPlata.module.css";

const MONTHS = [
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

const r2 = (n: number) => Math.round(n * 100) / 100;
const toNum = (s: string | number | null | undefined) =>
  Number(String(s ?? "").replace(",", ".")) || 0;

// Klijentski pregled neto plate, ista formula kao backend (bez minulog rada).
// Autoritativni izračun radi backend pri spremanju, ovo je samo orijentir.
function netoPreview(bruto: number, koef: number) {
  if (!(bruto > 0)) return 0;
  const empTotal = r2(r2(bruto * 0.17) + r2(bruto * 0.125) + r2(bruto * 0.015));
  const deduction = r2(koef * 300);
  const taxBase = Math.max(0, r2(bruto - empTotal - deduction));
  const incomeTax = r2(taxBase * 0.1);
  return r2(bruto - empTotal - incomeTax);
}

// Broj -> "1.610,30" (locale-neutralno, isti oblik kao formatMoneyBlur izlaz).
const fmt = (n: number) => {
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "-" : ""}${withThousands},${decPart}`;
};

// Zadnji dan mjeseca kao ISO (YYYY-MM-DD), default datum isplate za GIP.
function lastDayOfMonthIso(year: number, m: number) {
  const last = new Date(year, m, 0).getDate();
  return `${year}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

export default function UvozPlataModal({
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
  const queryClient = useQueryClient();

  // Vlasnik obrta ide u 2002, ne u GIP, pa ga ne uvozimo.
  const workers = useMemo(
    () => radnici.filter((w) => !(isObrt && w.role === "VLASNIK")),
    [radnici, isObrt],
  );

  // Učitaj svih 12 mjeseci da znamo postojeće (zaključane) i uvezene obračune.
  const yearQ = useQuery({
    queryKey: ["importYearPayrolls", orgId, year],
    queryFn: async () => {
      const months = await Promise.all(
        Array.from({ length: 12 }, (_, i) => listPayrolls(orgId, year, i + 1)),
      );
      const map = new Map<string, Payroll>();
      months.forEach((res, i) => {
        if (res.ok) for (const p of res.data) map.set(`${p.workerId}:${i + 1}`, p);
      });
      return map;
    },
  });

  const [koef, setKoef] = useState<Record<number, string>>({});
  const [bruto, setBruto] = useState<Record<string, string>>({});
  // Datum isplate po mjesecu (1-12), za GIP. Default zadnji dan mjeseca.
  const [dates, setDates] = useState<Record<number, string>>({});
  const [seeded, setSeeded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const lsKey = `pk_uvoz_v2_${orgId}_${year}`;

  // Seed jednom kad stignu podaci: koeficijent iz profila, bruto iz već uvezenih
  // obračuna, pa preko toga nesnimljeni nacrt iz localStorage (da se unos pamti
  // i bez klika "Sačuvaj uvoz", da se ne izgubi na Zatvori).
  useEffect(() => {
    if (seeded || !yearQ.data) return;
    const k: Record<number, string> = {};
    const b: Record<string, string> = {};
    const dts: Record<number, string> = {};
    for (const w of workers) {
      k[w.id] = String(w.taxCoefficient ?? 1);
      for (let m = 1; m <= 12; m++) {
        const p = yearQ.data.get(`${w.id}:${m}`);
        if (p && p.imported) b[`${w.id}:${m}`] = fmt(Number(p.gross));
      }
    }
    // Datum po mjesecu: iz uvezenog obračuna ako postoji, inače zadnji dan.
    for (let m = 1; m <= 12; m++) {
      let pd = "";
      for (const w of workers) {
        const p = yearQ.data.get(`${w.id}:${m}`);
        if (p && p.imported && p.paymentDate) {
          pd = String(p.paymentDate).slice(0, 10);
          break;
        }
      }
      dts[m] = pd || lastDayOfMonthIso(year, m);
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
    setSeeded(true);
  }, [yearQ.data, seeded, workers, lsKey, year]);

  // Snimaj nacrt u localStorage na svaku promjenu (pamćenje bez "Sačuvaj uvoz").
  useEffect(() => {
    if (!seeded) return;
    try {
      localStorage.setItem(lsKey, JSON.stringify({ koef, bruto, dates }));
    } catch {
      /* ignore */
    }
  }, [koef, bruto, dates, seeded, lsKey]);

  // Escape zatvara.
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const isLocked = (workerId: number, month: number) => {
    const p = yearQ.data?.get(`${workerId}:${month}`);
    return !!p && !p.imported; // stvarni obračun aplikacije, ne diramo
  };

  const setCell = (workerId: number, month: number, val: string) =>
    setBruto((prev) => ({ ...prev, [`${workerId}:${month}`]: val }));

  // Kopiraj prvu unesenu bruto vrijednost kroz prazne mjesece (do kraja godine).
  const fillRight = (w: Worker) => {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = now.getMonth() + 1;
    // Ne popunjavaj tekući ni buduće mjesece tekuće godine, oni se obračunavaju
    // u programu, ne uvoze. Za prošle godine popuni svih 12.
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
      for (const w of workers) {
        const kc = toNum(koef[w.id] ?? w.taxCoefficient ?? 1) || 1;
        for (let m = 1; m <= 12; m++) {
          if (isLocked(w.id, m)) continue;
          const v = bruto[`${w.id}:${m}`];
          if (v == null || v === "") continue;
          const g = parseMoneyInput(v) ?? 0;
          if (!(g > 0)) continue;
          rows.push({
            workerId: w.id,
            month: m,
            gross: g,
            taxCoefficient: kc,
            paymentDate: dates[m] || lastDayOfMonthIso(year, m),
          });
        }
      }
      if (rows.length === 0) throw new Error("Nema unesenih plata za uvoz");
      const r = await importPayrolls({ organizationId: orgId, year, rows });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls", orgId] });
      queryClient.invalidateQueries({
        queryKey: ["importYearPayrolls", orgId, year],
      });
      // Nacrt je sad spremljen u bazu; obriši localStorage nacrt. Unesene
      // vrijednosti ostaju u stanju (vidljive), a na ponovno otvaranje se
      // seed-uju iz baze (uvezeni obračuni).
      try {
        localStorage.removeItem(lsKey);
      } catch {
        /* ignore */
      }
    },
  });

  if (!mounted) return null;

  const ctrlInput: React.CSSProperties = {
    width: 98,
    padding: "7px 9px",
    border: "1px solid var(--border, #d4cfc4)",
    borderRadius: 5,
    fontSize: 14,
    textAlign: "right",
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "3vh 1rem",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--paper, #fff)",
          borderRadius: 12,
          width: "min(1320px, 98vw)",
          maxHeight: "96vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.1rem 1.4rem",
            borderBottom: "1px solid var(--border, #d4cfc4)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 23 }}>
            Uvoz prethodnih plata ({year})
          </h2>
          <p
            style={{
              margin: "0.5rem 0 0",
              fontSize: 14.5,
              color: "var(--muted, #7a8a7d)",
              lineHeight: 1.5,
            }}
          >
            Za radnike koji su platu primali u ranijem programu, ako ste tek u
            toku godine počeli koristiti naš program. Upišite bruto i porezni
            koeficijent, ostalo (doprinosi, porez, neto) računa se automatski,
            samo da GIP-1022 bude kompletan. Mjeseci koji već imaju obračun su
            zaključani.
          </p>
          <p
            style={{
              margin: "0.45rem 0 0",
              fontSize: 13.5,
              color: "var(--mid, #6c6862)",
            }}
          >
            Datum ispod naziva svakog mjeseca je <strong>datum isplate plate</strong>{" "}
            za taj mjesec (ulazi u GIP). Default je zadnji dan mjeseca, možete ga
            prepraviti ako znate stvarni datum.
          </p>
        </div>

        {/* Body / grid */}
        <div style={{ overflow: "auto", padding: "0.5rem 1.4rem 0.5rem 0", flex: 1 }}>
          {yearQ.isLoading ? (
            <p style={{ color: "var(--muted, #7a8a7d)" }}>Učitavam...</p>
          ) : workers.length === 0 ? (
            <p style={{ color: "var(--muted, #7a8a7d)" }}>
              Nema radnika za uvoz.
            </p>
          ) : (
            <table style={{ borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={thLeft}>Radnik</th>
                  <th style={thMid}>Koef.</th>
                  {MONTHS.map((m, i) => {
                    const mm = i + 1;
                    return (
                      <th key={m} style={thMid}>
                        {m}
                        <div style={{ marginTop: 6, width: 128 }}>
                          <DateInput
                            className={uvozStyles.dateField}
                            value={dates[mm] ?? lastDayOfMonthIso(year, mm)}
                            onValueChange={(iso) =>
                              setDates((p) => ({ ...p, [mm]: iso }))
                            }
                            title="Datum isplate plate za ovaj mjesec (ide u GIP)"
                          />
                        </div>
                      </th>
                    );
                  })}
                  <th style={thMid}>Akcija</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => {
                  const kc = toNum(koef[w.id] ?? w.taxCoefficient ?? 1) || 1;
                  return (
                    <tr key={w.id}>
                      <td style={tdName}>
                        {w.lastName} {w.firstName}
                      </td>
                      <td style={tdCell}>
                        <input
                          value={koef[w.id] ?? ""}
                          onChange={(e) =>
                            setKoef((p) => ({ ...p, [w.id]: e.target.value }))
                          }
                          inputMode="decimal"
                          style={{ ...ctrlInput, width: 50 }}
                        />
                      </td>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                        const key = `${w.id}:${m}`;
                        if (isLocked(w.id, m)) {
                          const p = yearQ.data?.get(key);
                          return (
                            <td key={m} style={tdCell}>
                              <div
                                title="Već postoji obračun za ovaj mjesec"
                                style={{
                                  fontSize: 11,
                                  color: "var(--muted, #7a8a7d)",
                                  textAlign: "right",
                                  padding: "5px 2px",
                                }}
                              >
                                {fmt(Number(p?.gross) || 0)}
                                <div style={{ fontSize: 9 }}>obračunato</div>
                              </div>
                            </td>
                          );
                        }
                        const val = bruto[key] ?? "";
                        const g = parseMoneyInput(val) ?? 0;
                        return (
                          <td key={m} style={tdCell}>
                            <input
                              value={val}
                              onChange={(e) =>
                                setCell(w.id, m, formatMoneyLive(e.target.value))
                              }
                              onBlur={(e) =>
                                setCell(w.id, m, formatMoneyBlur(e.target.value))
                              }
                              inputMode="decimal"
                              placeholder="bruto"
                              style={ctrlInput}
                            />
                            {g > 0 && (
                              <div
                                style={{
                                  fontSize: 10,
                                  color: "var(--muted, #7a8a7d)",
                                  textAlign: "right",
                                  marginTop: 2,
                                }}
                              >
                                neto {fmt(netoPreview(g, kc))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td style={tdCell}>
                        <button
                          type="button"
                          onClick={() => fillRight(w)}
                          title="Kopiraj prvu unesenu bruto kroz prazne mjesece"
                          style={{
                            fontSize: 11,
                            padding: "5px 8px",
                            border: "1px solid var(--border, #d4cfc4)",
                            borderRadius: 5,
                            background: "transparent",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Popuni udesno
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.4rem",
            borderTop: "1px solid var(--border, #d4cfc4)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          {saveMut.isError && (
            <span style={{ color: "#c0392b", fontSize: 13, marginRight: "auto" }}>
              {(saveMut.error as Error)?.message || "Greška pri uvozu"}
            </span>
          )}
          {saveMut.isSuccess && saveMut.data && (
            <span style={{ color: "var(--sage, #3a5c42)", fontSize: 13, marginRight: "auto" }}>
              Uvezeno: {saveMut.data.created} novih, {saveMut.data.updated} izmijenjenih
              {saveMut.data.skipped.length > 0
                ? `, ${saveMut.data.skipped.length} preskočeno`
                : ""}
              .
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.6rem 1.1rem",
              border: "1px solid var(--border, #d4cfc4)",
              borderRadius: 6,
              background: "transparent",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Zatvori
          </button>
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || yearQ.isLoading}
            style={{
              padding: "0.6rem 1.3rem",
              border: "1px solid var(--sage, #3a5c42)",
              borderRadius: 6,
              background: "var(--sage, #3a5c42)",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {saveMut.isPending ? "Spremam..." : "Sačuvaj uvoz"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const thLeft: React.CSSProperties = {
  position: "sticky",
  left: 0,
  zIndex: 3,
  background: "var(--paper, #f5f2eb)",
  borderRight: "1px solid var(--border, #d4cfc4)",
  textAlign: "left",
  padding: "8px 10px 8px 1.4rem",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--muted, #7a8a7d)",
  borderBottom: "1px solid var(--border, #d4cfc4)",
};
const thMid: React.CSSProperties = {
  textAlign: "center",
  padding: "8px 6px",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--muted, #7a8a7d)",
  borderBottom: "1px solid var(--border, #d4cfc4)",
};
const tdName: React.CSSProperties = {
  position: "sticky",
  left: 0,
  zIndex: 2,
  background: "var(--paper, #f5f2eb)",
  borderRight: "1px solid var(--border, #d4cfc4)",
  padding: "6px 10px 6px 1.4rem",
  whiteSpace: "nowrap",
  fontWeight: 500,
  borderBottom: "1px solid var(--border, #ede8db)",
};
const tdCell: React.CSSProperties = {
  padding: "6px 4px",
  textAlign: "center",
  verticalAlign: "top",
  borderBottom: "1px solid var(--border, #ede8db)",
};
