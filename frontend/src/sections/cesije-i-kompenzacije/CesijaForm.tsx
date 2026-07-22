"use client";
import { useState } from "react";
import styles from "../ugovor-o-pozajmici/ugovor.module.css";
import DateInput from "src/components/DateInput/DateInput";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import UgovorFillSelect from "src/components/PersonFillSelect/UgovorFillSelect";
import { trackEvent } from "src/api/activity";
import { LuFileText, LuFileDown } from "react-icons/lu";
import { formatMoneyLive, formatMoneyBlur, parseIznos, formatBroj, iznosUSlova } from "./money";
import btn from "./cesije.module.css";
import type { CesijaData } from "./types";

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

const PRIMJERCI = ["2 (dva)", "3 (tri)", "4 (četiri)", "5 (pet)", "6 (šest)"];

type Form = {
  mjesto: string;
  datum: string; // iso
  cedentNaziv: string;
  cedentId: string;
  cedentZastupnik: string;
  cesionarNaziv: string;
  cesionarId: string;
  cesionarZastupnik: string;
  cesusNaziv: string;
  cesusId: string;
  cesusZastupnik: string;
  iznos: string; // raw money string
  sud: string;
  brojPrimjeraka: string;
};

const INITIAL: Form = {
  mjesto: "",
  datum: "",
  cedentNaziv: "",
  cedentId: "",
  cedentZastupnik: "",
  cesionarNaziv: "",
  cesionarId: "",
  cesionarZastupnik: "",
  cesusNaziv: "",
  cesusId: "",
  cesusZastupnik: "",
  iznos: "",
  sud: "",
  brojPrimjeraka: "3 (tri)",
};

export default function CesijaForm({ canGenerate }: { canGenerate: boolean }) {
  const [form, setForm] = useState<Form>(() => ({
    ...INITIAL,
    datum: new Date().toISOString().slice(0, 10),
  }));
  const [sudTouched, setSudTouched] = useState(false);
  const [loadingDocx, setLoadingDocx] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  function set<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Mjesto zaključenja se prepisuje u nadležni sud dok ga korisnik ne izmijeni.
  function onMjesto(v: string) {
    setForm((prev) => ({ ...prev, mjesto: v, sud: sudTouched ? prev.sud : v }));
  }
  function onSud(v: string) {
    setSudTouched(true);
    set("sud", v);
  }

  function buildData(): CesijaData {
    return {
      mjesto: form.mjesto,
      datum: isoToDisplay(form.datum),
      cedentNaziv: form.cedentNaziv,
      cedentId: form.cedentId,
      cedentZastupnik: form.cedentZastupnik,
      cesionarNaziv: form.cesionarNaziv,
      cesionarId: form.cesionarId,
      cesionarZastupnik: form.cesionarZastupnik,
      cesusNaziv: form.cesusNaziv,
      cesusId: form.cesusId,
      cesusZastupnik: form.cesusZastupnik,
      iznosBroj: parseIznos(form.iznos) > 0 ? `${formatBroj(parseIznos(form.iznos))} KM` : form.iznos,
      iznosSlovima: parseIznos(form.iznos) > 0 ? iznosUSlova(parseIznos(form.iznos)) : "",
      sud: form.sud,
      brojPrimjeraka: form.brojPrimjeraka,
    };
  }

  async function handleDocx() {
    if (!canGenerate) return;
    setLoadingDocx(true);
    try {
      const { generateCesijaDocx } = await import("./cesijaDocx");
      downloadBlob(await generateCesijaDocx(buildData()), "Ugovor-o-cesiji.docx");
      trackEvent("CESIJA_GENERATE", "Ugovor o cesiji");
    } finally {
      setLoadingDocx(false);
    }
  }

  async function handlePdf() {
    if (!canGenerate) return;
    setLoadingPdf(true);
    try {
      const { generateCesijaPdf } = await import("./cesijaPdf");
      downloadBlob(await generateCesijaPdf(buildData()), "Ugovor-o-cesiji.pdf");
      trackEvent("CESIJA_GENERATE", "Ugovor o cesiji");
    } finally {
      setLoadingPdf(false);
    }
  }

  const party = (
    titleLabel: string,
    role: string,
    nazivKey: keyof Form,
    idKey: keyof Form,
    zastupnikKey: keyof Form,
  ) => (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {titleLabel} <em>({role})</em>
      </h2>
      <div className={styles.fieldGrid}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Popuni podatke</label>
          <UgovorFillSelect
            onFill={({ name, id, ownerName }) => {
              set(nazivKey, name as Form[typeof nazivKey]);
              set(idKey, id as Form[typeof idKey]);
              if (ownerName) set(zastupnikKey, ownerName as Form[typeof zastupnikKey]);
            }}
          />
        </div>
      </div>
      <div className={styles.fieldGrid}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Naziv</label>
          <input
            className={styles.fieldInput}
            value={form[nazivKey]}
            onChange={(e) => set(nazivKey, e.target.value as Form[typeof nazivKey])}
            placeholder="Naziv firme / obrta"
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>JIB / ID broj</label>
          <input
            className={styles.fieldInput}
            value={form[idKey]}
            onChange={(e) => set(idKey, e.target.value as Form[typeof idKey])}
            placeholder="XXXXXXXXXXXXX"
          />
        </div>
        <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
          <label className={styles.fieldLabel}>Zastupnik (opcionalno)</label>
          <input
            className={styles.fieldInput}
            value={form[zastupnikKey]}
            onChange={(e) => set(zastupnikKey, e.target.value as Form[typeof zastupnikKey])}
            placeholder="npr. Ime Prezime, vlasnik / direktor"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Opći podaci */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Opći <em>podaci</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Mjesto zaključenja (u)</label>
            <input
              className={styles.fieldInput}
              value={form.mjesto}
              onChange={(e) => onMjesto(e.target.value)}
              placeholder="npr. Cazinu, Sarajevu"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Datum</label>
            <DateInput
              className={styles.fieldInput}
              value={form.datum}
              onValueChange={(iso) => set("datum", iso)}
            />
          </div>
        </div>
      </div>

      {party("Cedent", "ustupalac", "cedentNaziv", "cedentId", "cedentZastupnik")}
      {party("Cesionar", "primalac", "cesionarNaziv", "cesionarId", "cesionarZastupnik")}
      {party("Cesus", "platilac / dužnik", "cesusNaziv", "cesusId", "cesusZastupnik")}

      {/* Iznos */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Iznos <em>potraživanja</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>Iznos koji se ustupa (KM)</label>
            <input
              className={styles.fieldInput}
              value={form.iznos}
              onChange={(e) => set("iznos", formatMoneyLive(e.target.value))}
              onBlur={(e) => set("iznos", formatMoneyBlur(e.target.value))}
              placeholder="Npr. 3.884,40"
              inputMode="decimal"
            />
            {parseIznos(form.iznos) > 0 && (
              <p style={{ margin: "0.4rem 0 0", fontSize: 13, color: "var(--mid, #666)" }}>
                Slovima: <strong>{iznosUSlova(parseIznos(form.iznos))}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Ostalo */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Sud i <em>primjerci</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Nadležni sud (u)</label>
            <input
              className={styles.fieldInput}
              value={form.sud}
              onChange={(e) => onSud(e.target.value)}
              placeholder="npr. Cazinu, Sarajevu"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Broj primjeraka</label>
            <StyledSelect
              value={form.brojPrimjeraka}
              onChange={(v) => set("brojPrimjeraka", String(v ?? ""))}
              groups={[{ options: PRIMJERCI.map((o) => ({ value: o, label: o })) }]}
              ariaLabel="Broj primjeraka"
              wrapStyle={{ width: "100%" }}
            />
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
