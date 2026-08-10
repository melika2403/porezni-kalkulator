"use client";

// Pregled i ESC/P štampa naloga stvarnog obračuna plate (admin, Faza 1).
// Tok: izbor firme + obračuna + datuma valute → tabela naloga sa kvačicama i
// sumom označenih → vizuelni pregled kako pada na pred-štampani obrazac →
// "Štampaj X naloga" preuzme .prn samo od označenih.
// Spec: docs/faza1-escp-stampa-naloga.md

import { useEffect, useMemo, useState } from "react";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import DateInput from "src/components/DateInput/DateInput";
import {
  getIzvozObracuni,
  getIzvozOrganizacije,
  getNaloziZaStampu,
  type IzvozObracun,
  type IzvozOrg,
  type StampaNalozi,
} from "src/api/adminPaymentExport";
import { buildPrn, FIELD_MAP_TIP1, type NalogValues } from "./escpNalog";
import { nalogUVrijednosti } from "./nalogVrijednosti";
import { preuzmiPrn, PORUKA_STAMPA, type EscpPostavke } from "./AdminTestNalog";

const MONTHS = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

const fmtKM = (n: number) =>
  (Number(n) || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const slug = (s: string) =>
  String(s || "org")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "org";

const danasIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ── Vizuelni pregled: pojednostavljen Grafis obrazac + polja na mreži ────────
// Ista formula kao stari PDF pristup: x = (kolona-1) × 2.1167 mm,
// y = (linija-1) × 4.2333 mm, skalirano na širinu prikaza (papir 195×101 mm).
const PAPIR_W_MM = 195;
const PAPIR_H_MM = 101;
const COL_MM = 2.1167;
const LINE_MM = 4.2333;
const PRIKAZ_W = 720; // px
const SCALE = PRIKAZ_W / PAPIR_W_MM;
const CHAR_PX = COL_MM * SCALE;
const LINE_PX = LINE_MM * SCALE;
// Courier advance = 0.6 em → font-size da znak zauzme tačno jednu kolonu
const FONT_PX = CHAR_PX / 0.6;

// Pojednostavljeni pred-štampani obrazac: sitne labele + kućice (linija,
// kolona, širina u kolonama). Nije vjeran Grafis izgled, služi da se vidi da
// polja padaju na svoja mjesta.
const OBRAZAC_LABELE: { text: string; line: number; col: number }[] = [
  { text: "UPLATIO JE", line: 1, col: 4 },
  { text: "SVRHA", line: 4, col: 4 },
  { text: "PRIMALAC", line: 7, col: 4 },
  { text: "RAČUN POŠILJAOCA", line: 2.25, col: 48 },
  { text: "RAČUN PRIMAOCA", line: 4.25, col: 48 },
  { text: "IZNOS", line: 6.25, col: 48 },
  { text: "HITNO", line: 6.25, col: 70 },
  { text: "BROJ OBVEZNIKA", line: 9.25, col: 47 },
  { text: "VRSTA UPLATE", line: 9.25, col: 68 },
  { text: "MJESTO I DATUM UPLATE", line: 10.25, col: 8 },
  { text: "PERIOD OD", line: 10.25, col: 70 },
  { text: "VRSTA PRIHODA", line: 11.25, col: 47 },
  { text: "PERIOD DO", line: 12.25, col: 70 },
  { text: "OPĆINA", line: 15.25, col: 47 },
  { text: "BUDŽ. ORGANIZACIJA", line: 15.25, col: 63 },
  { text: "POZIV NA BROJ", line: 17.25, col: 47 },
];

const OBRAZAC_KUCICE: { line: number; col: number; w: number }[] = [
  { line: 3, col: 48, w: 16 }, // račun pošiljaoca
  { line: 5, col: 48, w: 16 }, // račun primaoca
  { line: 7, col: 48, w: 19 }, // iznos
  { line: 7, col: 70, w: 3 }, // hitno
  { line: 10, col: 47, w: 13 }, // broj obveznika (JIB)
  { line: 10, col: 77, w: 2 }, // vrsta uplate
  { line: 11, col: 70, w: 6 }, // period od
  { line: 12, col: 47, w: 6 }, // vrsta prihoda
  { line: 13, col: 70, w: 6 }, // period do
  { line: 16, col: 47, w: 3 }, // općina
  { line: 16, col: 63, w: 7 }, // budžetska organizacija
  { line: 18, col: 47, w: 10 }, // poziv na broj
];

function NalogPapir({ values, naslov }: { values: NalogValues; naslov: string }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ fontSize: 12.5, color: "var(--mid, #7a8a7d)", margin: "0 0 0.3rem" }}>
        {naslov}
      </div>
      <div
        style={{
          position: "relative",
          width: PRIKAZ_W,
          height: PAPIR_H_MM * SCALE,
          background: "#fffdf6",
          border: "1px solid #c9c2b4",
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        {OBRAZAC_LABELE.map((l, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: (l.col - 1) * CHAR_PX,
              top: (l.line - 1) * LINE_PX,
              fontSize: 8,
              letterSpacing: "0.04em",
              color: "#a49a86",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {l.text}
          </span>
        ))}
        {OBRAZAC_KUCICE.map((k, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: (k.col - 1) * CHAR_PX - 2,
              top: (k.line - 1) * LINE_PX - 1,
              width: k.w * CHAR_PX + 4,
              height: LINE_PX + 2,
              border: "1px solid #cdc5b5",
              borderRadius: 2,
            }}
          />
        ))}
        {FIELD_MAP_TIP1.map((f) => {
          const text = values[f.key];
          if (!text) return null;
          return (
            <span
              key={f.key}
              style={{
                position: "absolute",
                left: (f.col - 1) * CHAR_PX,
                top: (f.line - 1) * LINE_PX,
                fontFamily: '"Courier New", monospace',
                fontSize: FONT_PX,
                lineHeight: `${LINE_PX}px`,
                color: "#1a1a1a",
                whiteSpace: "pre",
              }}
            >
              {text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Glavna sekcija ───────────────────────────────────────────────────────────
export default function NaloziStampa({ postavke }: { postavke: EscpPostavke }) {
  const [orgs, setOrgs] = useState<IzvozOrg[]>([]);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [obracuni, setObracuni] = useState<IzvozObracun[]>([]);
  const [obracunKey, setObracunKey] = useState<string | null>(null);
  const [datumValute, setDatumValute] = useState(danasIso());
  const [combineKantonal, setCombineKantonal] = useState(false);
  const [podaci, setPodaci] = useState<StampaNalozi | null>(null);
  const [oznaceni, setOznaceni] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getIzvozOrganizacije().then((r) => {
      if (r.ok) setOrgs(r.data);
    });
  }, []);

  useEffect(() => {
    setObracuni([]);
    setObracunKey(null);
    setPodaci(null);
    setMsg(null);
    if (!orgId) return;
    getIzvozObracuni(orgId).then((r) => {
      if (r.ok) setObracuni(r.data);
    });
  }, [orgId]);

  const ucitaj = async () => {
    if (!orgId || !obracunKey) return;
    const [y, m] = obracunKey.split("-").map(Number);
    setBusy(true);
    setErr(null);
    setMsg(null);
    setPodaci(null);
    try {
      const r = await getNaloziZaStampu({
        orgId,
        year: y,
        month: m,
        datumValute,
        combineKantonal,
      });
      if (!r.ok) {
        setErr(
          r.error === "NEMA_OBRACUNA"
            ? "Za ovaj mjesec nema obračuna plata."
            : r.error,
        );
        return;
      }
      setPodaci(r.data);
      setOznaceni(new Set(r.data.nalozi.map((n) => n.rb)));
    } finally {
      setBusy(false);
    }
  };

  const izabrani = useMemo(
    () => (podaci ? podaci.nalozi.filter((n) => oznaceni.has(n.rb)) : []),
    [podaci, oznaceni],
  );
  const suma = izabrani.reduce((s, n) => s + n.iznosKm, 0);

  const vrijednosti = useMemo(
    () =>
      podaci
        ? izabrani.map((n) => ({
            rb: n.rb,
            naziv: n.naziv,
            values: nalogUVrijednosti(n, podaci.platilac, datumValute),
          }))
        : [],
    [izabrani, podaci, datumValute],
  );

  const toggle = (rb: number) =>
    setOznaceni((prev) => {
      const next = new Set(prev);
      if (next.has(rb)) next.delete(rb);
      else next.add(rb);
      return next;
    });

  const sviOznaceni = !!podaci && oznaceni.size === podaci.nalozi.length;
  const toggleSve = () =>
    setOznaceni(
      sviOznaceni || !podaci
        ? new Set()
        : new Set(podaci.nalozi.map((n) => n.rb)),
    );

  const stampaj = () => {
    if (!podaci || vrijednosti.length === 0 || !obracunKey) return;
    const [y, m] = obracunKey.split("-").map(Number);
    const bytes = buildPrn(
      vrijednosti.map((v) => v.values),
      {
        kodnaStranica: postavke.nasaSlova ? "pc852" : "ascii",
        pomakKolona: postavke.pomakKolona,
        pomakLinija: postavke.pomakLinija,
      },
    );
    preuzmiPrn(
      bytes,
      `nalozi-${slug(podaci.platilac.naziv)}-${String(m).padStart(2, "0")}-${y}.prn`,
    );
    setMsg(PORUKA_STAMPA);
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    fontSize: 11.5,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--mid, #7a8a7d)",
    padding: "0.45rem 0.55rem",
    borderBottom: "1px solid var(--border, #d4cfc4)",
    whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.45rem 0.55rem",
    fontSize: 13.5,
    borderBottom: "1px solid var(--border, #eee8dc)",
    verticalAlign: "top",
  };

  return (
    <div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--mid, #7a8a7d)",
          marginBottom: "0.8rem",
        }}
      >
        Pregled i štampa naloga obračuna
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div style={{ minWidth: 240 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--mid, #7a8a7d)", marginBottom: 4 }}>
            Firma
          </div>
          <StyledSelect
            value={orgId}
            onChange={(v) => setOrgId(v == null ? null : Number(v))}
            groups={[
              {
                options: orgs.map((o) => ({
                  value: o.id,
                  label: `${o.name}${o.city ? `, ${o.city}` : ""}`,
                })),
              },
            ]}
            placeholder="– Izaberi firmu –"
            searchable
            ariaLabel="Firma"
          />
        </div>
        <div style={{ minWidth: 200 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--mid, #7a8a7d)", marginBottom: 4 }}>
            Obračun
          </div>
          <StyledSelect
            value={obracunKey}
            onChange={(v) => setObracunKey(v == null ? null : String(v))}
            groups={[
              {
                options: obracuni.map((o) => ({
                  value: `${o.year}-${o.month}`,
                  label: `${MONTHS[o.month - 1]} ${o.year} (${o.obracunato}/${o.ukupno})`,
                })),
              },
            ]}
            placeholder="– Izaberi mjesec –"
            disabled={!orgId}
            ariaLabel="Obračun"
          />
        </div>
        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--mid, #7a8a7d)", marginBottom: 4 }}>
            Datum uplate
          </div>
          <DateInput value={datumValute} onValueChange={setDatumValute} />
        </div>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            fontSize: 13.5,
            paddingBottom: "0.55rem",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={combineKantonal}
            onChange={(e) => setCombineKantonal(e.target.checked)}
          />
          Objedini kantonalne
        </label>
        <button
          type="button"
          onClick={ucitaj}
          disabled={busy || !orgId || !obracunKey}
          style={{
            padding: "0.6rem 1.1rem",
            background: "var(--sage, #3a5c42)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
            opacity: busy || !orgId || !obracunKey ? 0.6 : 1,
          }}
        >
          {busy ? "Učitavam…" : "Učitaj naloge"}
        </button>
      </div>

      {err && (
        <div style={{ marginTop: "0.9rem", fontSize: 13.5, color: "#a3322f" }}>
          {err}
        </div>
      )}

      {podaci && (
        <>
          <div style={{ marginTop: "1.1rem", overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={thStyle}>
                    <input
                      type="checkbox"
                      checked={sviOznaceni}
                      onChange={toggleSve}
                      title="Označi / odznači sve"
                    />
                  </th>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Primalac</th>
                  <th style={thStyle}>Svrha</th>
                  <th style={thStyle}>Račun primaoca</th>
                  <th style={thStyle}>Vrsta prihoda</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Iznos (KM)</th>
                </tr>
              </thead>
              <tbody>
                {podaci.nalozi.map((n) => (
                  <tr
                    key={n.rb}
                    style={{ opacity: oznaceni.has(n.rb) ? 1 : 0.45 }}
                  >
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={oznaceni.has(n.rb)}
                        onChange={() => toggle(n.rb)}
                      />
                    </td>
                    <td style={tdStyle}>{n.rb}</td>
                    <td style={tdStyle}>{n.naziv}</td>
                    <td style={{ ...tdStyle, maxWidth: 260 }}>
                      {n.svrha.length > 48 ? `${n.svrha.slice(0, 48)}…` : n.svrha}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "monospace" }}>{n.racun}</td>
                    <td style={tdStyle}>{n.vrstaPrihoda || "–"}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {fmtKM(n.iznosKm)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
              padding: "0.6rem 0.55rem",
              fontSize: 14,
            }}
          >
            <span style={{ color: "var(--mid, #7a8a7d)" }}>
              Označeno {oznaceni.size} od {podaci.nalozi.length}, ukupno:
            </span>
            <strong>{fmtKM(suma)} KM</strong>
          </div>

          {podaci.preskoceni.length > 0 && (
            <div
              style={{
                margin: "0.4rem 0 0",
                padding: "0.6rem 0.8rem",
                borderRadius: 8,
                border: "1px solid #f0d9a6",
                background: "#fdf6e3",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <strong>Nisu u nalozima ({podaci.preskoceni.length}):</strong>{" "}
              {podaci.preskoceni
                .map(
                  (p) =>
                    `${p.stavka}, ${fmtKM(p.iznosKm)} KM${p.radnik ? `, ${p.radnik}` : ""} (${p.razlog})`,
                )
                .join(" · ")}
            </div>
          )}

          {/* Vizuelni pregled označenih naloga */}
          {vrijednosti.length > 0 && (
            <div style={{ marginTop: "1.1rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {vrijednosti.map((v) => (
                <NalogPapir
                  key={v.rb}
                  values={v.values}
                  naslov={`Nalog ${v.rb}: ${v.naziv}`}
                />
              ))}
            </div>
          )}

          <div style={{ marginTop: "1.1rem", display: "flex", alignItems: "center", gap: "0.9rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={stampaj}
              disabled={vrijednosti.length === 0}
              style={{
                padding: "0.65rem 1.3rem",
                background: "var(--sage, #3a5c42)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14.5,
                fontWeight: 600,
                cursor: vrijednosti.length === 0 ? "default" : "pointer",
                opacity: vrijednosti.length === 0 ? 0.5 : 1,
              }}
            >
              Štampaj {vrijednosti.length}{" "}
              {vrijednosti.length === 1 ? "nalog" : "naloga"}
            </button>
            {msg && <span style={{ fontSize: 13.5, color: "#1f5e44" }}>{msg}</span>}
          </div>
        </>
      )}
    </div>
  );
}
