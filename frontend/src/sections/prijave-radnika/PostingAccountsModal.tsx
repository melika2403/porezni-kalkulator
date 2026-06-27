"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  getPostingAccounts,
  savePostingAccounts,
  type PostingAccount,
} from "src/api/payroll";

// Doprinosi koji se na dugovnoj strani grupišu po nosiocu (radnik/poslodavac)
// kad je split isključen. Potražna strana je uvijek po fondu.
const CONTRIB_KEYS = new Set(["pio", "zdravstvo", "nezaposlenost"]);

// "4522" → "452-2000" (grupa = prve 3 cifre, ostatak dopunjen nulama do 4).
function formatKontoBlur(v: string | null | undefined): string {
  const d = String(v ?? "").replace(/\D/g, "").slice(0, 7);
  if (!d) return "";
  const group = d.slice(0, 3);
  const rest = d.slice(3).padEnd(4, "0").slice(0, 4);
  return `${group}-${rest}`;
}

function sanitizeLive(v: string | null | undefined): string {
  // Auto-crtica: čim se upišu 3 cifre, ubaci "-" (npr. 520 → "520-").
  const d = String(v ?? "").replace(/\D/g, "").slice(0, 7);
  if (d.length <= 3) return d;
  return `${d.slice(0, 3)}-${d.slice(3)}`;
}

type EditState = Record<string, PostingAccount>;

export default function PostingAccountsModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["postingAccounts"],
    queryFn: () => unwrap(getPostingAccounts()),
  });

  const [edited, setEdited] = useState<EditState>({});
  const [split, setSplit] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data) {
      const init: EditState = {};
      for (const it of [...q.data.items, ...q.data.burdenItems]) {
        init[it.key] = { ...q.data.resolved[it.key] };
      }
      setEdited(init);
      setSplit(!!q.data.splitByContribution);
    }
  }, [q.data]);

  const setCell = (key: string, side: "d" | "p", val: string) => {
    setSaved(false);
    setEdited((prev) => ({
      ...prev,
      [key]: { ...prev[key], [side]: val },
    }));
  };

  const blurCell = (key: string, side: "d" | "p", val: string) =>
    setCell(key, side, formatKontoBlur(val));

  const defaults = q.data?.defaults;
  // Diff prema defaultu, šaljemo samo izmjene (pamti se na nivou agencije).
  const overrides = useMemo(() => {
    if (!defaults) return {};
    const out: Record<string, Partial<PostingAccount>> = {};
    for (const [key, val] of Object.entries(edited)) {
      const def = defaults[key];
      if (!def) continue;
      const entry: Partial<PostingAccount> = {};
      const d = formatKontoBlur(val.d);
      const p = formatKontoBlur(val.p);
      if (d && d !== def.d) entry.d = d;
      if (p && p !== def.p) entry.p = p;
      if (Object.keys(entry).length) out[key] = entry;
    }
    return out;
  }, [edited, defaults]);

  // Stavke koje se STVARNO knjiže u trenutnom modu. Potražna (p) je uvijek po
  // fondu (items). Dugovna (d): po fondu = items; po nosiocu = ne-doprinosna
  // konta + zbirna burden konta. Tako skrivena/nekorištena konta ne pucaju
  // validaciju (npr. 520-2000 u po-nosiocu modu se ne knjiži).
  const creditItems = q.data?.items ?? [];
  const debitItems = useMemo(() => {
    const items = q.data?.items ?? [];
    const burden = q.data?.burdenItems ?? [];
    return split
      ? items
      : [...items.filter((i) => !CONTRIB_KEYS.has(i.key)), ...burden];
  }, [q.data, split]);

  // Isti konto NE smije biti i na trošku (duguje) i na obavezi (potražuje).
  const conflictKonta = useMemo(() => {
    const dSet = new Set<string>();
    for (const it of debitItems) {
      const d = formatKontoBlur(edited[it.key]?.d ?? "");
      if (d) dSet.add(d);
    }
    const pSet = new Set<string>();
    for (const it of creditItems) {
      const p = formatKontoBlur(edited[it.key]?.p ?? "");
      if (p) pSet.add(p);
    }
    return [...dSet].filter((k) => pSet.has(k));
  }, [edited, debitItems, creditItems]);
  const hasConflict = conflictKonta.length > 0;

  // Neispravan format konta (mora biti tačno XXX-XXXX). Prazno polje = default.
  const invalidLabels = useMemo(() => {
    const bad: string[] = [];
    const checkSide = (its: { key: string; label: string }[], side: "d" | "p") => {
      for (const it of its) {
        const raw = edited[it.key]?.[side] ?? "";
        if (!raw) continue;
        if (!/^\d{3}-\d{4}$/.test(formatKontoBlur(raw))) bad.push(it.label);
      }
    };
    checkSide(debitItems, "d");
    checkSide(creditItems, "p");
    return [...new Set(bad)];
  }, [edited, debitItems, creditItems]);
  const hasInvalid = invalidLabels.length > 0;

  const saveMut = useMutation({
    mutationFn: () => unwrap(savePostingAccounts(overrides, split)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["postingAccounts"] });
      setSaved(true);
    },
  });

  const resetToDefault = () => {
    if (!q.data) return;
    const init: EditState = {};
    for (const it of [...q.data.items, ...q.data.burdenItems])
      init[it.key] = { ...q.data.defaults[it.key] };
    setEdited(init);
    setSplit(false);
    setSaved(false);
  };

  const inputStyle: React.CSSProperties = {
    width: 110,
    padding: "0.4rem 0.5rem",
    border: "1px solid #d4cfc4",
    borderRadius: 8,
    fontSize: 14,
    fontVariantNumeric: "tabular-nums",
  };
  const isChanged = (key: string, side: "d" | "p") =>
    !!defaults &&
    formatKontoBlur(edited[key]?.[side] ?? "") !== defaults[key]?.[side];
  const isConflict = (key: string, side: "d" | "p") => {
    const k = formatKontoBlur(edited[key]?.[side] ?? "");
    return !!k && conflictKonta.includes(k);
  };
  const cellBorder = (key: string, side: "d" | "p") =>
    isConflict(key, side)
      ? "#b3261e"
      : isChanged(key, side)
        ? "#3a5c42"
        : "#d4cfc4";

  const debitInput = (key: string) => (
    <input
      style={{ ...inputStyle, borderColor: cellBorder(key, "d") }}
      value={edited[key]?.d ?? ""}
      onChange={(e) => setCell(key, "d", sanitizeLive(e.target.value))}
      onBlur={(e) => blurCell(key, "d", e.target.value)}
      placeholder="XXX-XXXX"
      inputMode="numeric"
    />
  );
  const creditInput = (key: string) => (
    <input
      style={{ ...inputStyle, borderColor: cellBorder(key, "p") }}
      value={edited[key]?.p ?? ""}
      onChange={(e) => setCell(key, "p", sanitizeLive(e.target.value))}
      onBlur={(e) => blurCell(key, "p", e.target.value)}
      placeholder="XXX-XXXX"
      inputMode="numeric"
    />
  );
  const mutedCell = (text: string) => (
    <span style={{ fontSize: 12.5, color: "#9aa39b" }}>{text}</span>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 26, 18, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          width: "min(620px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "1.4rem 1.6rem",
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "0.4rem",
          }}
        >
          <h2 style={{ fontSize: 20, margin: 0 }}>Konta za nalog za knjiženje</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zatvori"
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "#7a8a7d",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <p style={{ fontSize: 13, color: "#666", marginTop: 0 }}>
          Izmjene se pamte za sve vaše organizacije (i klijentske). Konto je u
          formatu XXX-XXXX (npr. upišete 4522, postaje 452-2000). Prazno polje
          vraća default.
        </p>

        {/* Mod dugovne strane */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.55rem",
            fontSize: 13.5,
            color: "#0f1a12",
            background: "#faf8f3",
            border: "1px solid #d4cfc4",
            borderRadius: 8,
            padding: "0.6rem 0.75rem",
            marginBottom: "0.8rem",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={split}
            onChange={(e) => {
              setSplit(e.target.checked);
              setSaved(false);
            }}
            style={{ width: 16, height: 16, marginTop: 2, accentColor: "#3a5c42" }}
          />
          <span>
            Razdvoji troškove po pojedinačnim doprinosima
            <br />
            <span style={{ fontSize: 12, color: "#7a8a7d" }}>
              Default: doprinosi na trošku idu zbirno, radnikov dio (520-0100) i
              poslodavčev dio (520-0200). Uključi ovo da se PIO, zdravstvo i
              nezaposlenost knjiže odvojeno i na dugovnoj strani.
            </span>
          </span>
        </label>

        <p
          style={{
            fontSize: 12.5,
            color: "#3a5c42",
            background: "#f3f7f3",
            border: "1px solid #d6e8d9",
            borderRadius: 8,
            padding: "0.5rem 0.7rem",
            marginTop: 0,
            marginBottom: "0.8rem",
          }}
        >
          Napomena: ako isti konto stavite na više stavki, te stavke se na
          nalogu saberu u jedan red (zbir iznosa).
        </p>

        {q.isLoading ? (
          <div style={{ padding: "1rem 0", color: "#666" }}>Učitavam…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 11, color: "#7a8a7d" }}>
                <th style={{ padding: "0.4rem 0", fontWeight: 600 }}>STAVKA</th>
                <th style={{ padding: "0.4rem 0", fontWeight: 600 }}>
                  TROŠAK (duguje)
                </th>
                <th style={{ padding: "0.4rem 0", fontWeight: 600 }}>
                  OBAVEZA (potražuje)
                </th>
              </tr>
            </thead>
            <tbody>
              {q.data?.items.map((it) => {
                const contribNoSplit = CONTRIB_KEYS.has(it.key) && !split;
                return (
                  <Fragment key={it.key}>
                    <tr style={{ borderTop: "1px solid #ede8db" }}>
                      <td style={{ padding: "0.45rem 0", fontSize: 14 }}>
                        {it.label}
                      </td>
                      <td style={{ padding: "0.45rem 0" }}>
                        {contribNoSplit
                          ? mutedCell("zbirno (vidi dolje)")
                          : debitInput(it.key)}
                      </td>
                      <td style={{ padding: "0.45rem 0" }}>
                        {creditInput(it.key)}
                      </td>
                    </tr>
                    {it.key === "nezaposlenost" &&
                      !split &&
                      q.data?.burdenItems.map((b) => (
                        <tr key={b.key} style={{ background: "#faf8f3" }}>
                          <td
                            style={{
                              padding: "0.45rem 0 0.45rem 0.6rem",
                              fontSize: 13,
                              color: "#3a5c42",
                            }}
                          >
                            {b.label}
                          </td>
                          <td style={{ padding: "0.45rem 0" }}>
                            {debitInput(b.key)}
                          </td>
                          <td style={{ padding: "0.45rem 0" }}>
                            {mutedCell("po fondu ↑")}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {hasConflict && (
          <p
            style={{
              fontSize: 12.5,
              color: "#b3261e",
              background: "#fdeceb",
              border: "1px solid #f3c2bf",
              borderRadius: 8,
              padding: "0.5rem 0.7rem",
              marginTop: "1rem",
              marginBottom: 0,
            }}
          >
            Isti konto je istovremeno na trošku i na obavezi (
            {conflictKonta.join(", ")}). Konto na dugovnoj i potražnoj strani
            mora biti različito, ispravite prije snimanja.
          </p>
        )}
        {hasInvalid && (
          <p
            style={{
              fontSize: 12.5,
              color: "#b3261e",
              background: "#fdeceb",
              border: "1px solid #f3c2bf",
              borderRadius: 8,
              padding: "0.5rem 0.7rem",
              marginTop: "1rem",
              marginBottom: 0,
            }}
          >
            Konto mora biti u formatu XXX-XXXX (3 cifre, crtica, 4 cifre).
            Provjerite: {invalidLabels.join(", ")}.
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "1.2rem",
            gap: "0.6rem",
          }}
        >
          <button
            type="button"
            onClick={resetToDefault}
            style={{
              background: "none",
              border: "1px solid #d4cfc4",
              borderRadius: 8,
              padding: "0.55rem 0.9rem",
              fontSize: 13,
              cursor: "pointer",
              color: "#555",
            }}
          >
            Vrati na default
          </button>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            {saved && (
              <span style={{ fontSize: 13, color: "#3a5c42" }}>Sačuvano</span>
            )}
            {saveMut.isError && (
              <span style={{ fontSize: 13, color: "#b3261e" }}>
                Greška pri snimanju
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "1px solid #d4cfc4",
                borderRadius: 8,
                padding: "0.55rem 1rem",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Zatvori
            </button>
            <button
              type="button"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending || hasConflict || hasInvalid}
              title={
                hasConflict
                  ? "Isti konto je i na trošku i na obavezi, ispravite prije snimanja"
                  : hasInvalid
                    ? "Konto mora biti u formatu XXX-XXXX"
                    : undefined
              }
              style={{
                background: hasConflict || hasInvalid ? "#9bb5a1" : "#3a5c42",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "0.55rem 1.2rem",
                fontSize: 14,
                cursor: hasConflict || hasInvalid ? "not-allowed" : "pointer",
              }}
            >
              {saveMut.isPending ? "Snimam…" : "Sačuvaj"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
