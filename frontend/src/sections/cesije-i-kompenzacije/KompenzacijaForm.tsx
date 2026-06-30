"use client";
import { useState } from "react";
import styles from "../ugovor-o-pozajmici/ugovor.module.css";
import DateInput from "src/components/DateInput/DateInput";
import UgovorFillSelect from "src/components/PersonFillSelect/UgovorFillSelect";
import { trackEvent } from "src/api/activity";
import { LuFileText, LuFileDown } from "react-icons/lu";
import { formatMoneyLive, formatMoneyBlur, parseIznos, formatKM, kompTotals } from "./money";
import btn from "./cesije.module.css";
import type { KompenzacijaData } from "./types";

const isoToDisplay = (iso: string) => {
  if (!iso || !iso.includes("-")) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Row = { opis: string; iznos: string };
type Party = { naziv: string; adresa: string; id: string; pdv: string; sifra: string };

const EMPTY_PARTY: Party = { naziv: "", adresa: "", id: "", pdv: "", sifra: "" };

export default function KompenzacijaForm({ canGenerate }: { canGenerate: boolean }) {
  const [broj, setBroj] = useState("");
  const [datum, setDatum] = useState(() => new Date().toISOString().slice(0, 10));
  const [duznik, setDuznik] = useState<Party>(EMPTY_PARTY);
  const [povjerilac, setPovjerilac] = useState<Party>(EMPTY_PARTY);
  const [duznikRows, setDuznikRows] = useState<Row[]>([{ opis: "", iznos: "" }]);
  const [povjeriocRows, setPovjeriocRows] = useState<Row[]>([{ opis: "", iznos: "" }]);
  const [loadingDocx, setLoadingDocx] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  function buildData(): KompenzacijaData {
    const toStavke = (rows: Row[]) =>
      rows
        .filter((r) => r.opis.trim() || parseIznos(r.iznos) > 0)
        .map((r) => ({ opis: r.opis.trim(), iznos: parseIznos(r.iznos) }));
    return {
      broj,
      datum: isoToDisplay(datum),
      duznikNaziv: duznik.naziv,
      duznikAdresa: duznik.adresa,
      duznikId: duznik.id,
      duznikPdv: duznik.pdv,
      duznikSifra: duznik.sifra,
      povjeriocNaziv: povjerilac.naziv,
      povjeriocAdresa: povjerilac.adresa,
      povjeriocId: povjerilac.id,
      povjeriocPdv: povjerilac.pdv,
      povjeriocSifra: povjerilac.sifra,
      duznikStavke: toStavke(duznikRows),
      povjeriocStavke: toStavke(povjeriocRows),
    };
  }

  async function handleDocx() {
    if (!canGenerate) return;
    setLoadingDocx(true);
    try {
      const { generateKompenzacijaDocx } = await import("./kompenzacijaDocx");
      downloadBlob(await generateKompenzacijaDocx(buildData()), "Kompenzacija.docx");
      trackEvent("KOMPENZACIJA_GENERATE", "Prijedlog za kompenzaciju");
    } finally {
      setLoadingDocx(false);
    }
  }

  async function handlePdf() {
    if (!canGenerate) return;
    setLoadingPdf(true);
    try {
      const { generateKompenzacijaPdf } = await import("./kompenzacijaPdf");
      downloadBlob(await generateKompenzacijaPdf(buildData()), "Kompenzacija.pdf");
      trackEvent("KOMPENZACIJA_GENERATE", "Prijedlog za kompenzaciju");
    } finally {
      setLoadingPdf(false);
    }
  }

  // Live totali za prikaz
  const preview = kompTotals({
    ...buildData(),
  });

  const partyFields = (
    label: string,
    value: Party,
    setValue: (p: Party) => void,
  ) => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{label}</h2>
      <div className={styles.fieldGrid}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Popuni podatke</label>
          <UgovorFillSelect
            onFill={({ name, address, city, id }) =>
              setValue({
                ...value,
                naziv: name,
                adresa: [address, city].filter(Boolean).join(", "),
                id,
              })
            }
          />
        </div>
      </div>
      <div className={styles.fieldGrid}>
        <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
          <label className={styles.fieldLabel}>Naziv</label>
          <input
            className={styles.fieldInput}
            value={value.naziv}
            onChange={(e) => setValue({ ...value, naziv: e.target.value })}
            placeholder="Naziv firme / obrta"
          />
        </div>
        <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
          <label className={styles.fieldLabel}>Adresa</label>
          <input
            className={styles.fieldInput}
            value={value.adresa}
            onChange={(e) => setValue({ ...value, adresa: e.target.value })}
            placeholder="Ulica i broj, mjesto"
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>ID broj</label>
          <input
            className={styles.fieldInput}
            value={value.id}
            onChange={(e) => setValue({ ...value, id: e.target.value })}
            placeholder="XXXXXXXXXXXXX"
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>PDV broj (opcionalno)</label>
          <input
            className={styles.fieldInput}
            value={value.pdv}
            onChange={(e) => setValue({ ...value, pdv: e.target.value })}
            placeholder="XXXXXXXXXXXX"
          />
        </div>
      </div>
    </div>
  );

  const stavkeEditor = (
    label: string,
    rows: Row[],
    setRows: (r: Row[]) => void,
  ) => {
    const total = rows.reduce((a, r) => a + parseIznos(r.iznos), 0);
    const update = (i: number, patch: Partial<Row>) =>
      setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    const remove = (i: number) => setRows(rows.filter((_, idx) => idx !== i));
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{label}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ width: 22, fontSize: 13, color: "var(--mid,#666)" }}>{i + 1}.</span>
              <input
                className={styles.fieldInput}
                style={{ flex: 1 }}
                value={r.opis}
                onChange={(e) => update(i, { opis: e.target.value })}
                placeholder="Broj računa / osnov (npr. Početno stanje)"
              />
              <input
                className={styles.fieldInput}
                style={{ width: 140, textAlign: "right" }}
                value={r.iznos}
                onChange={(e) => update(i, { iznos: formatMoneyLive(e.target.value) })}
                onBlur={(e) => update(i, { iznos: formatMoneyBlur(e.target.value) })}
                placeholder="0,00"
                inputMode="decimal"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={rows.length === 1}
                title="Ukloni stavku"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--line, #d4cfc4)",
                  background: "#fff",
                  cursor: rows.length === 1 ? "not-allowed" : "pointer",
                  color: "#b3261e",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setRows([...rows, { opis: "", iznos: "" }])}
            style={{
              border: "1px solid var(--sage, #3a5c42)",
              color: "var(--sage, #3a5c42)",
              background: "#fff",
              borderRadius: 8,
              padding: "0.4rem 0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            + Dodaj stavku
          </button>
          <span style={{ fontSize: 14 }}>
            Ukupno: <strong>{formatKM(total)}</strong>
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Opći podaci */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Opći <em>podaci</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Broj dokumenta</label>
            <input
              className={styles.fieldInput}
              value={broj}
              onChange={(e) => setBroj(e.target.value)}
              placeholder="npr. 001-000165"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Datum</label>
            <DateInput
              className={styles.fieldInput}
              value={datum}
              onValueChange={setDatum}
            />
          </div>
        </div>
      </div>

      {partyFields("Dužnik", duznik, setDuznik)}
      {stavkeEditor("Obaveze dužnika", duznikRows, setDuznikRows)}
      {partyFields("Povjerilac (vjerovnik)", povjerilac, setPovjerilac)}
      {stavkeEditor("Obaveze povjerioca", povjeriocRows, setPovjeriocRows)}

      {/* Rezime */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Rezime <em>kompenzacije</em>
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "0.85rem 1.1rem",
              borderRadius: 10,
              background: "var(--sage-pale, #eef3ef)",
              border: "1px solid rgba(58, 92, 66, 0.28)",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              Iznos za kompenzaciju
            </span>
            <strong
              style={{ fontSize: 22, color: "var(--sage, #3a5c42)", whiteSpace: "nowrap" }}
            >
              {formatKM(preview.kompenzacija)}
            </strong>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "0.85rem 1.1rem",
              borderRadius: 10,
              background: "var(--paper, #faf8f3)",
              border: "1px solid var(--border, #d4cfc4)",
            }}
          >
            <span style={{ fontWeight: 500, fontSize: 15 }}>
              Nekompenzirani iznos{" "}
              <span style={{ color: "var(--mid, #7a8a7d)", fontWeight: 400, fontSize: 13 }}>
                (uplaćuje se na žiro račun)
              </span>
            </span>
            <strong style={{ fontSize: 20, whiteSpace: "nowrap" }}>
              {formatKM(preview.nekompenzirani)}
            </strong>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={btn.downloadRow}>
        <button
          type="button"
          className={btn.btnDownload}
          onClick={handlePdf}
          disabled={loadingPdf || !canGenerate}
          title={canGenerate ? undefined : "Dostupno uz Business pretplatu"}
        >
          <LuFileText aria-hidden />
          {loadingPdf ? "Generisanje..." : "Preuzmi PDF"}
        </button>
        <button
          type="button"
          className={`${btn.btnDownload} ${btn.btnDownloadAlt}`}
          onClick={handleDocx}
          disabled={loadingDocx || !canGenerate}
          title={canGenerate ? undefined : "Dostupno uz Business pretplatu"}
        >
          <LuFileDown aria-hidden />
          {loadingDocx ? "Generisanje..." : "Preuzmi Word (DOCX)"}
        </button>
      </div>
      <p className={styles.dataNapomena}>
        Porezni kalkulator ne zadržava popunjene podatke. Nakon spremanja dokumenta uvijek provjerite tačnost podataka.
      </p>
    </>
  );
}
