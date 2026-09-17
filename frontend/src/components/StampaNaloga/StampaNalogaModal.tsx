"use client";

// Štampa naloga za plaćanje na matričnom pisaču (pred-štampani obrazac na
// traci). Tok: učitaj naloge mjeseca → kvačicama izaberi šta se štampa →
// (opciono) pogledaj kako pada na obrazac → "Štampaj N naloga" preuzme .prn.
// Sve se generiše u pregledniku, ništa se ne šalje nazad na server.
// Spec: docs/faza2-stampa-naloga-na-obracunu.md

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DateInput from "src/components/DateInput/DateInput";
import { naloziZaStampu } from "src/api/payroll";
import { trackEvent } from "src/api/activity";
import { buildPrn } from "src/lib/nalozi/escpNalog";
import { nalogUVrijednosti } from "src/lib/nalozi/nalogVrijednosti";
import {
  loadPostavke,
  PORUKA_STAMPA,
  preuzmiPrn,
  savePostavke,
  slugFirme,
  type EscpPostavke,
} from "src/lib/nalozi/postavke";
import NalogPapir from "./NalogPapir";
import PodesavanjePisaca, {
  AkoZapne,
  UputstvoStanica,
  ZastoCmd,
} from "./PodesavanjePisaca";
import styles from "./StampaNaloga.module.css";

const MONTHS = [
  "januar", "februar", "mart", "april", "maj", "juni",
  "juli", "august", "septembar", "oktobar", "novembar", "decembar",
];

const fmtKM = (n: number) =>
  (Number(n) || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const danasIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const mid = "var(--mid, #6c6862)";
const ink = "var(--ink, #0f1a12)";

// Sklopiva sekcija (podešavanje, uputstvo, pregled).
function Sekcija({
  naslov,
  otvorenoPocetno = false,
  children,
}: {
  naslov: string;
  otvorenoPocetno?: boolean;
  children: React.ReactNode;
}) {
  const [otvoreno, setOtvoreno] = useState(otvorenoPocetno);
  return (
    <div
      style={{
        marginTop: "0.7rem",
        border: "1px solid var(--border, #d4cfc4)",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => setOtvoreno((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          padding: "0.6rem 0.85rem",
          background: "var(--paper, #faf8f3)",
          border: "none",
          borderBottom: otvoreno ? "1px solid var(--border, #d4cfc4)" : "none",
          fontSize: 13.5,
          fontWeight: 600,
          color: ink,
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        {naslov}
        <span style={{ color: mid, fontSize: 12 }}>
          {otvoreno ? "sakrij" : "prikaži"}
        </span>
      </button>
      {otvoreno && <div style={{ padding: "0.85rem" }}>{children}</div>}
    </div>
  );
}

export default function StampaNalogaModal({
  organizationId,
  organizationName,
  year,
  month,
  onClose,
}: {
  organizationId: number;
  organizationName: string;
  year: number;
  month: number;
  onClose: () => void;
}) {
  // Uvijek današnji datum (isto pravilo kao izvoz za e-bankarstvo).
  const [datum, setDatum] = useState(danasIso());
  // Zatvaranje samo kad i mousedown I mouseup padnu na pozadinu: povlačenje
  // miša iz polja (npr. selekcija datuma) van okvira ne smije zatvoriti modal.
  const backdropMouseDownRef = useRef(false);
  // Pamte se ODZNAČENI nalozi, ne označeni: novi podaci (druga firma ili
  // datum) tako ne traže usklađivanje stanja, sve je po defaultu označeno.
  const [odznaceni, setOdznaceni] = useState<Set<number>>(new Set());
  const [poruka, setPoruka] = useState<string | null>(null);
  const [postavke, setPostavke] = useState<EscpPostavke>(() => loadPostavke());
  // Uputstvo se otvara samo od sebe dok korisnik SAM ne potvrdi da je pisač
  // podešen (kvačica na dnu uputstva). Preuzimanje fajla se namjerno ne
  // koristi kao signal: preglednik ne vidi da li je pisač išta odštampao.
  const [prviPut] = useState(() => !loadPostavke().uputstvoSakrij);

  const mijenjajPostavke = (p: EscpPostavke) => {
    setPostavke(p);
    savePostavke(p);
  };

  // Nalozi mjeseca; datum uplate se štampa na nalogu pa ulazi u ključ upita.
  const upit = useQuery({
    queryKey: ["nalozi-za-stampu", organizationId, year, month, datum],
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(datum),
    queryFn: async () => {
      const r = await naloziZaStampu({
        organizationId,
        year,
        month,
        datumValute: datum,
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  });
  const podaci = upit.data ?? null;
  const greska = upit.error
    ? {
        NEMA_OBRACUNA: "Za ovaj mjesec nema obračuna plata.",
        FORBIDDEN: "Nemate pristup ovoj firmi.",
        INVALID_DATUM_VALUTE: "Datum uplate nije ispravan.",
      }[upit.error.message] || "Greška pri učitavanju naloga."
    : null;

  const izabrani = useMemo(
    () => (podaci ? podaci.nalozi.filter((n) => !odznaceni.has(n.rb)) : []),
    [podaci, odznaceni],
  );
  const suma = izabrani.reduce((s, n) => s + n.iznosKm, 0);

  const vrijednosti = useMemo(
    () =>
      podaci
        ? izabrani.map((n) => ({
            rb: n.rb,
            naziv: n.naziv,
            values: nalogUVrijednosti(n, podaci.platilac, datum),
          }))
        : [],
    [izabrani, podaci, datum],
  );

  const toggle = (rb: number) =>
    setOdznaceni((prev) => {
      const next = new Set(prev);
      if (next.has(rb)) next.delete(rb);
      else next.add(rb);
      return next;
    });

  const sviOznaceni = !!podaci && izabrani.length === podaci.nalozi.length;
  const toggleSve = () =>
    setOdznaceni(
      sviOznaceni && podaci ? new Set(podaci.nalozi.map((n) => n.rb)) : new Set(),
    );

  const stampaj = () => {
    if (vrijednosti.length === 0) return;
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
      `nalozi-${slugFirme(organizationName)}-${String(month).padStart(2, "0")}-${year}.prn`,
    );
    // admin Aktivnost: ko štampa naloge na matrični pisač i koliko (best-effort)
    trackEvent(
      "NALOG_STAMPA_GENERATE",
      `${vrijednosti.length} ${vrijednosti.length === 1 ? "nalog" : "naloga"}, ${String(month).padStart(2, "0")}/${year}`,
      organizationId,
    );
    setPoruka(PORUKA_STAMPA);
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    fontSize: 11.5,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: mid,
    padding: "0.4rem 0.5rem",
    borderBottom: "1px solid var(--border, #d4cfc4)",
    whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.4rem 0.5rem",
    fontSize: 13,
    borderBottom: "1px solid var(--border, #eee8dc)",
    verticalAlign: "top",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,26,18,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onMouseDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        if (backdropMouseDownRef.current && e.target === e.currentTarget) {
          onClose();
        }
        backdropMouseDownRef.current = false;
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--white, #fff)",
          borderRadius: 12,
          maxWidth: 820,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "1.5rem",
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        }}
      >
        <h3 style={{ margin: "0 0 0.6rem", fontSize: 17, color: ink }}>
          Štampa naloga na matričnom pisaču
        </h3>
        <p
          style={{
            margin: "0 0 1rem",
            fontSize: "0.88rem",
            color: mid,
            lineHeight: 1.5,
          }}
        >
          Štampa naloge za {MONTHS[month - 1]} {year}. na pred-štampani obrazac
          &quot;Nalog za plaćanje&quot; (traka za matrični pisač). Isti nalozi
          kao na uplatnicama: doprinosi, porez i isplate radnicima.
        </p>

        <div style={{ maxWidth: 220 }}>
          <label
            htmlFor="stampaDatumUplate"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: ink,
              marginBottom: 4,
            }}
          >
            Datum uplate
          </label>
          <DateInput
            id="stampaDatumUplate"
            className={styles.fieldInput}
            value={datum}
            onValueChange={(v) => {
              setDatum(v);
              setPoruka(null);
            }}
          />
        </div>

        {greska && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.7rem 0.9rem",
              borderRadius: 8,
              border: "1px solid #e2b4ab",
              background: "#fbeeec",
              color: "#8a2f21",
              fontSize: "0.85rem",
            }}
          >
            {greska}
          </div>
        )}

        {upit.isLoading && (
          <div style={{ marginTop: "1rem", fontSize: 13.5, color: mid }}>
            Učitavam naloge…
          </div>
        )}

        {podaci && !upit.isLoading && (
          <>
            <div style={{ marginTop: "1rem", overflowX: "auto" }}>
              <table
                style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>
                      <input
                        type="checkbox"
                        checked={sviOznaceni}
                        onChange={toggleSve}
                        title="Označi ili odznači sve"
                      />
                    </th>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Primalac</th>
                    <th style={thStyle}>Svrha</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>Iznos (KM)</th>
                  </tr>
                </thead>
                <tbody>
                  {podaci.nalozi.map((n) => (
                    <tr key={n.rb} style={{ opacity: odznaceni.has(n.rb) ? 0.45 : 1 }}>
                      <td style={tdStyle}>
                        <input
                          type="checkbox"
                          checked={!odznaceni.has(n.rb)}
                          onChange={() => toggle(n.rb)}
                        />
                      </td>
                      <td style={tdStyle}>{n.rb}</td>
                      <td style={tdStyle}>{n.naziv}</td>
                      <td style={{ ...tdStyle, maxWidth: 260, color: mid }}>
                        {n.svrha.length > 44 ? `${n.svrha.slice(0, 44)}…` : n.svrha}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
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
                padding: "0.5rem 0.5rem 0",
                fontSize: 13.5,
              }}
            >
              <span style={{ color: mid }}>
                Označeno {izabrani.length} od {podaci.nalozi.length}, ukupno:
              </span>
              <strong style={{ color: ink }}>{fmtKM(suma)} KM</strong>
            </div>

            {podaci.preskoceni.length > 0 && (
              <div
                style={{
                  marginTop: "0.6rem",
                  padding: "0.7rem 0.9rem",
                  borderRadius: 8,
                  border: "1px solid var(--warn-border, #f0d9a6)",
                  background: "var(--warn-bg, #fdf6e3)",
                  color: "var(--warn-text, #6b5518)",
                  fontSize: "0.83rem",
                  lineHeight: 1.5,
                }}
              >
                <strong>Nisu u listi ({podaci.preskoceni.length}):</strong>
                <ul style={{ margin: "0.3rem 0 0.4rem", paddingLeft: "1.1rem" }}>
                  {podaci.preskoceni.map((p, i) => (
                    <li key={i}>
                      {p.stavka}, {fmtKM(p.iznosKm)} KM
                      {p.radnik ? `, ${p.radnik}` : ""} ({p.razlog})
                    </li>
                  ))}
                </ul>
                Te naloge napišite ručno ili dopunite podatke pa ponovite štampu.
              </div>
            )}

            {vrijednosti.length > 0 && (
              <Sekcija naslov="Pogledaj kako pada na obrazac">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.9rem",
                  }}
                >
                  {vrijednosti.map((v) => (
                    <NalogPapir
                      key={v.rb}
                      values={v.values}
                      naslov={`Nalog ${v.rb}: ${v.naziv}`}
                      pomakKolona={postavke.pomakKolona}
                      pomakLinija={postavke.pomakLinija}
                    />
                  ))}
                </div>
              </Sekcija>
            )}
          </>
        )}

        <Sekcija naslov="Podešavanje pisača">
          <PodesavanjePisaca postavke={postavke} onChange={mijenjajPostavke} />
        </Sekcija>

        <Sekcija
          naslov="Prvo podešavanje računara (jednom, par minuta)"
          otvorenoPocetno={prviPut}
        >
          <UputstvoStanica />
          <div style={{ marginTop: "1rem" }}>
            <Sekcija naslov="Zašto se ovo radi kroz Command Prompt">
              <ZastoCmd />
            </Sekcija>
            <Sekcija naslov="Ako zapne">
              <AkoZapne />
            </Sekcija>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.55rem",
              marginTop: "1rem",
              padding: "0.7rem 0.85rem",
              borderRadius: 8,
              background: "var(--paper, #faf8f3)",
              border: "1px solid var(--border, #d4cfc4)",
              fontSize: 13.5,
              color: ink,
              cursor: "pointer",
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              checked={postavke.uputstvoSakrij}
              onChange={(e) =>
                mijenjajPostavke({
                  ...postavke,
                  uputstvoSakrij: e.target.checked,
                })
              }
              style={{ marginTop: 3 }}
            />
            <span>
              Podesio sam pisač, ne otvaraj više uputstvo automatski.
              <span style={{ display: "block", color: mid, fontSize: 12.5 }}>
                Uputstvo ostaje ovdje, otvorite ga klikom kad zatreba.
              </span>
            </span>
          </label>
        </Sekcija>

        {poruka && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.7rem 0.9rem",
              borderRadius: 8,
              border: "1px solid #b7d4bd",
              background: "#eef6ef",
              color: "#2d4633",
              fontSize: "0.85rem",
              lineHeight: 1.5,
            }}
          >
            {poruka}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.6rem",
            marginTop: "1.2rem",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: 8,
              border: "1px solid var(--border, #d4cfc4)",
              background: "var(--white, #fff)",
              color: ink,
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Zatvori
          </button>
          <button
            type="button"
            onClick={stampaj}
            disabled={vrijednosti.length === 0}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: 8,
              border: "none",
              background: "var(--sage, #3a5c42)",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: vrijednosti.length === 0 ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: vrijednosti.length === 0 ? 0.6 : 1,
            }}
          >
            Štampaj {vrijednosti.length}{" "}
            {vrijednosti.length === 1 ? "nalog" : "naloga"}
          </button>
        </div>
      </div>
    </div>
  );
}
