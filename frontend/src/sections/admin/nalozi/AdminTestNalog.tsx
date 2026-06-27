"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import {
  buildNaloziPdf,
  testNalogValues,
  PAGE_W_MM,
  PAGE_H_MM,
} from "./nalogPlacanjePdf";

// Kalibracioni offseti se pamte u localStorage (per-uređaj, kao postavke štampe
// u starom programu). Default: X 8 mm, Y 6 mm (početne vrijednosti za prvi test).
const LS_KEY = "pk_nalog_kalibracija_tip1";

function loadCal(): { x: number; y: number } {
  if (typeof window === "undefined") return { x: 8, y: 6 };
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return {
        x: Number.isFinite(o.x) ? o.x : 8,
        y: Number.isFinite(o.y) ? o.y : 6,
      };
    }
  } catch {
    // ignore
  }
  return { x: 8, y: 6 };
}

export default function AdminTestNalog() {
  const [xOff, setXOff] = useState("8");
  const [yOff, setYOff] = useState("6");
  const [count, setCount] = useState("3");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Učitaj sačuvanu kalibraciju na mount.
  useEffect(() => {
    const c = loadCal();
    setXOff(String(c.x));
    setYOff(String(c.y));
  }, []);

  const parse = (s: string, def: number) => {
    const n = Number(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : def;
  };

  const saveCal = (x: number, y: number) => {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify({ x, y }));
    } catch {
      // ignore
    }
  };

  const generate = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const x = parse(xOff, 8);
      const y = parse(yOff, 6);
      const n = Math.max(1, Math.min(Math.round(parse(count, 1)), 50));
      saveCal(x, y);
      const bytes = await buildNaloziPdf(testNalogValues(), {
        xOffsetMm: x,
        yOffsetMm: y,
        count: n,
      });
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-nalog_${n}x_X${x}_Y${y}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg(`Generisano ${n} test naloga (offset X ${x} mm, Y ${y} mm).`);
    } catch (e) {
      setMsg("Greška: " + ((e as Error)?.message || "nepoznata"));
    } finally {
      setBusy(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--mid, #7a8a7d)",
    marginBottom: 4,
  };
  const inputStyle: React.CSSProperties = {
    width: 110,
    padding: "0.5rem 0.6rem",
    border: "1px solid var(--border, #d4cfc4)",
    borderRadius: 8,
    fontSize: 14,
  };
  const cardStyle: React.CSSProperties = {
    background: "var(--white, #fff)",
    border: "1px solid var(--border, #d4cfc4)",
    borderRadius: 12,
    padding: "1.1rem 1.25rem",
    maxWidth: 760,
  };

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <h1
          style={{
            fontFamily: "DM Serif Display, serif",
            fontSize: "1.7rem",
            margin: "0 0 0.3rem",
            color: "var(--ink, #0f1a12)",
          }}
        >
          Test nalog za plaćanje
        </h1>
        <p
          style={{
            color: "var(--mid, #7a8a7d)",
            margin: "0 0 1.25rem",
            fontSize: "0.95rem",
            maxWidth: 760,
          }}
        >
          Generiše PDF sa test nalozima (X-evi i 9-ke u svim poljima) za
          kalibraciju matričnog štampača na pred-štampani Grafis obrazac. Stranica
          je {PAGE_W_MM} × {PAGE_H_MM} mm, jedan nalog po stranici.
        </p>

        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              gap: "1.25rem",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div>
              <label style={labelStyle}>Pomak X (mm)</label>
              <input
                style={inputStyle}
                type="text"
                inputMode="decimal"
                value={xOff}
                onChange={(e) => setXOff(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Pomak Y (mm)</label>
              <input
                style={inputStyle}
                type="text"
                inputMode="decimal"
                value={yOff}
                onChange={(e) => setYOff(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Broj naloga</label>
              <input
                style={inputStyle}
                type="text"
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              style={{
                padding: "0.6rem 1.1rem",
                background: "var(--sage, #3a5c42)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: busy ? "default" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? "Generišem…" : "Generiši test PDF"}
            </button>
          </div>

          {msg && (
            <div
              style={{
                marginTop: "0.9rem",
                fontSize: 13,
                color: msg.startsWith("Greška") ? "#a3322f" : "#1f5e44",
              }}
            >
              {msg}
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: "1.25rem",
            maxWidth: 760,
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--ink, #0f1a12)",
            background: "#fdf6e3",
            border: "1px solid #f0d9a6",
            borderRadius: 10,
            padding: "0.85rem 1rem",
          }}
        >
          <strong>Kako testirati (matrični LX-350, traktorska traka):</strong>
          <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem" }}>
            <li>
              Postavi broj naloga na npr. 3 ili više, generiši PDF.
            </li>
            <li>
              Štampaj u <strong>continuous / fanfold</strong> modu, na{" "}
              <strong>stvarna veličina (100%)</strong>, bez "fit to page" i bez
              margina. Najbolje iz pravog PDF čitača (Acrobat/SumatraPDF), ne iz
              browsera.
            </li>
            <li>
              Provjeri da i <strong>prvi i zadnji</strong> nalog padaju na
              obrazac. Ako prvi valja a zadnji drifta gore/dolje, problem je
              visina stranice / form length, ne offset.
            </li>
            <li>
              Ako je sve pomjereno jednako, koriguj <strong>Pomak X / Y</strong>{" "}
              u koracima od 1 mm i generiši ponovo. Vrijednosti se pamte.
            </li>
          </ol>
        </div>
      </div>
    </RoleGuard>
  );
}
