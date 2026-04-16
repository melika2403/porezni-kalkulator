"use client";
import { useState } from "react";
import styles from "./ugovor.module.css";
import type { UgovorData } from "./generateDocx";
import { useEffect } from "react";

type NapomenaTip = "odricanje" | "spor";

const INITIAL: UgovorData = {
  vrsta: "kratkoročnoj",
  datum: "",
  mjesto: "",
  zajmodavac: "",
  zajmoprimac: "",
  zajmodavacAdresa: "",
  zajmoprimacAdresa: "",
  zajmodavacID: "",
  zajmoprimacID: "",
  iznos: "",
  uvjetiDavanja: "",
  svrha: "",
  ziroRacun: "",
  banka: "",
  kamatnaStopa: "0%",
  napomene: "",
  brojPrimjeraka: "4 (četiri) primjerka",
  kopijePoPrimjerku: "2 (dva) primjerka",
};

const PRIMJERCI_OPTIONS = [
  "1 (jedan) primjerak",
  "2 (dva) primjerka",
  "3 (tri) primjerka",
  "4 (četiri) primjerka",
  "5 (pet) primjeraka",
  "6 (šest) primjeraka",
  "7 (sedam) primjeraka",
  "8 (osam) primjeraka",
  "9 (devet) primjeraka",
  "10 (deset) primjeraka",
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const formatZiroRacun = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  const parts = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 14),
    digits.slice(14, 16),
  ].filter(Boolean);
  return parts.join("-");
};

export default function UgovorOPozajmici() {
  const [form, setForm] = useState<UgovorData>(INITIAL);
  const [loadingDocx, setLoadingDocx] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [napomenaTip, setNapomenaTip] = useState<NapomenaTip>("odricanje");
  const [sud, setSud] = useState("Općinski sud u Sarajevu");

  const NAPOMENA_ODRICANJE = "i odriču se njihovog pobijanja ma iz kog razloga";

  const NAPOMENA_SPOR_PREFIX = "i u slučaju spora po ovom ugovoru nadležan je";

  function set(field: keyof UgovorData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleDocx() {
    setLoadingDocx(true);
    try {
      const { generateDocx } = await import("./generateDocx");
      const blob = await generateDocx(form);
      downloadBlob(blob, "Ugovor-o-pozajmici.docx");
    } finally {
      setLoadingDocx(false);
    }
  }

  async function handlePdf() {
    setLoadingPdf(true);
    try {
      const { generatePdf } = await import("./generatePdf");
      const blob = await generatePdf(form);
      downloadBlob(blob, "Ugovor-o-pozajmici.pdf");
    } finally {
      setLoadingPdf(false);
    }
  }

  return (
    <main className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <p className={styles.label}>Ugovori</p>
        <h1 className={styles.h1}>
          Ugovor o <em>pozajmici</em>
        </h1>
        <p className={styles.subtitle}>
          Popunite polja i preuzmite ugovor kao Word dokument ili PDF.
        </p>
      </div>

      {/* Opći podaci */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Opći <em>podaci</em>
        </h2>
        <div className={styles.fieldGrid}>
          <label className={styles.fieldLabel}>Vrsta pozajmice</label>
          <select
            className={styles.fieldInput}
            value={form.vrsta}
            onChange={(e) => set("vrsta", e.target.value)}
          >
            <option value="kratkoročnoj">Kratkoročno</option>
            <option value="dugoročnoj">Dugoročno</option>
          </select>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Datum zaključenja</label>
            <input
              type="date"
              className={styles.fieldInput}
              value={form.datum}
              onChange={(e) => set("datum", e.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Mjesto zaključenja</label>
            <input
              className={styles.fieldInput}
              value={form.mjesto}
              onChange={(e) => set("mjesto", e.target.value)}
              placeholder="Sarajevo"
            />
          </div>
        </div>
      </div>

      {/* Ugovorne strane */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Ugovorne <em>strane</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Zajmodavac (ime / naziv)
            </label>
            <input
              className={styles.fieldInput}
              value={form.zajmodavac}
              onChange={(e) => set("zajmodavac", e.target.value)}
              placeholder="Ime Prezime / Naziv firme"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Zajmoprimac (ime / naziv)
            </label>
            <input
              className={styles.fieldInput}
              value={form.zajmoprimac}
              onChange={(e) => set("zajmoprimac", e.target.value)}
              placeholder="Ime Prezime / Naziv firme"
            />
          </div>
        </div>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Adresa zajmodavca</label>
            <input
              className={styles.fieldInput}
              value={form.zajmodavacAdresa}
              onChange={(e) => set("zajmodavacAdresa", e.target.value)}
              placeholder="Adresa stanovanja ili sjedišta firme"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Adresa zajmoprimca</label>
            <input
              className={styles.fieldInput}
              value={form.zajmoprimacAdresa}
              onChange={(e) => set("zajmoprimacAdresa", e.target.value)}
              placeholder="Adresa stanovanja ili sjedišta firme"
            />
          </div>
        </div>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>LK/ID zajmodavca</label>
            <input
              className={styles.fieldInput}
              value={form.zajmodavacID}
              onChange={(e) => set("zajmodavacID", e.target.value)}
              placeholder="Broj lične karte ili identifikacioni broj firme"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>LK/ID zajmoprimca</label>
            <input
              className={styles.fieldInput}
              value={form.zajmoprimacID}
              onChange={(e) => set("zajmoprimacID", e.target.value)}
              placeholder="Broj lične karte ili identifikacioni broj firme"
            />
          </div>
        </div>
      </div>

      {/* Član 1 – iznos */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Član 1 – <em>Iznos pozajmice</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>
              Iznos (slovima i brojkama)
            </label>
            <input
              className={styles.fieldInput}
              value={form.iznos}
              onChange={(e) => set("iznos", e.target.value)}
              placeholder="5.000,00 KM (pet hiljada konvertibilnih maraka)"
            />
          </div>
        </div>
      </div>

      {/* Član 2 – uvjeti i svrha */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Član 2 – <em>Uvjeti i svrha</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>Zajam/pozajmica se daje</label>
            <input
              className={styles.fieldInput}
              value={form.uvjetiDavanja}
              onChange={(e) => set("uvjetiDavanja", e.target.value)}
              placeholder="do 6 mjeseci/godina"
            />
          </div>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>Svrha pozajmice</label>
            <textarea
              className={styles.fieldTextarea}
              value={form.svrha}
              onChange={(e) => set("svrha", e.target.value)}
              placeholder="finansiranje tekućih poslovnih troškova"
            />
          </div>
        </div>
      </div>

      {/* Član 3 – žiro račun */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Član 3 – <em>Žiro račun</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Broj žiro računa</label>
            <input
              className={styles.fieldInput}
              inputMode="numeric"
              value={form.ziroRacun}
              onChange={(e) =>
                set("ziroRacun", formatZiroRacun(e.target.value))
              }
              placeholder="123-456-78901234-56"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Banka</label>
            <input
              className={styles.fieldInput}
              value={form.banka}
              onChange={(e) => set("banka", e.target.value)}
              placeholder="Unicredit Bank d.d."
            />
          </div>
        </div>
      </div>

      {/* Član 4 – kamata */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Član 4 – <em>Kamatna stopa</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Kamatna stopa</label>
            <input
              className={styles.fieldInput}
              value={form.kamatnaStopa}
              onChange={(e) => set("kamatnaStopa", e.target.value)}
              placeholder="0% (bez kamate)"
            />
          </div>
        </div>
      </div>

      {/* Član 5 – napomene */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Član 5 – <em>Napomene</em>
        </h2>

        <div className={styles.fieldGrid}>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>Napomena</label>

            <select
              className={styles.fieldInput}
              value={napomenaTip}
              onChange={(e) => {
                const tip = e.target.value as NapomenaTip;
                setNapomenaTip(tip);

                if (tip === "odricanje") set("napomene", NAPOMENA_ODRICANJE);
                if (tip === "spor")
                  set("napomene", `${NAPOMENA_SPOR_PREFIX} ${sud}`);
              }}
            >
              <option value="odricanje">
                i odriču se njihovog pobijanja ma iz kog razloga.
              </option>
              <option value="spor">
                i u slučaju spora po ovom ugovoru nadležan je
              </option>
            </select>
          </div>
        </div>

        {napomenaTip === "spor" && (
          <div className={styles.fieldGrid}>
            <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
              <label className={styles.fieldLabel}>Nadležni sud</label>
              <input
                className={styles.fieldInput}
                value={sud}
                onChange={(e) => {
                  const v = e.target.value;
                  setSud(v);
                  set("napomene", `${NAPOMENA_SPOR_PREFIX} ${v}`);
                }}
                placeholder="Općinski sud u Sarajevu"
              />
            </div>
          </div>
        )}
      </div>

      {/* Član 6 – primjerci */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Član 6 – <em>Broj primjeraka</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Ukupan broj primjeraka</label>
            <select
              className={styles.fieldInput}
              value={form.brojPrimjeraka}
              onChange={(e) => set("brojPrimjeraka", e.target.value)}
            >
              {PRIMJERCI_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Kopije po strani</label>
            <select
              className={styles.fieldInput}
              value={form.brojPrimjeraka}
              onChange={(e) => set("brojPrimjeraka", e.target.value)}
            >
              {PRIMJERCI_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.btnDocx}
          onClick={handleDocx}
          disabled={loadingDocx}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          {loadingDocx ? "Generisanje..." : "Sačuvaj kao DOCX"}
        </button>
        <button
          className={styles.btnPdf}
          onClick={handlePdf}
          disabled={loadingPdf}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 18 15 15" />
          </svg>
          {loadingPdf ? "Generisanje..." : "Sačuvaj kao PDF"}
        </button>
      </div>
    </main>
  );
}
