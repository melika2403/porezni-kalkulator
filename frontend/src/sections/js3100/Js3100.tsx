"use client";
import { useState, useCallback, useRef } from "react";
import styles from "./js3100.module.css";
import {
  fillJs3100Template,
  type Js3100Data,
  type Js3100Vrsta,
  type Js3100Spol,
} from "src/sections/js3100/fillJs3100";
import DateInput from "src/components/DateInput/DateInput";
import CitySelect from "src/components/CitySelect/CitySelect";
import { useCityLookup } from "src/hooks/useCities";
import { formatAddress } from "src/utils/formatAddress";
import PersonFillSelect, {
  type FillData,
} from "src/components/PersonFillSelect/PersonFillSelect";
import OrgFillSelect, {
  type OrgFillData,
} from "src/components/PersonFillSelect/OrgFillSelect";

/* ── Helpers ── */
function getTodayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoToDisplay(iso: string) {
  if (!iso || !iso.includes("-")) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
}

function isoToDDMMYYYY(iso: string) {
  if (!iso || !iso.includes("-")) return { dd: "", mm: "", yyyy: "" };
  const [y, m, d] = iso.split("-");
  return { dd: d, mm: m, yyyy: y };
}

function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Tip ugovora opcije (Check Box100..109) ── */
const TIP_UGOVORA = [
  "Ugovor o radu na neodređeno",
  "Ugovor o radu na određeno",
  "Ugovor o djelu",
  "Autorski ugovor",
  "Ugovor o povremenom poslu",
  "Ugovor o stručnom osposobljavanju",
  "Volontiranje",
  "Ostalo 1",
  "Ostalo 2",
  "Ostalo 3",
];

/* ── Osnov osiguranja opcije (Check Box2..11) ── */
const OSNOV_OSIGURANJA = [
  "Zaposleni — puno radno vrijeme",
  "Zaposleni — nepuno radno vrijeme",
  "Direktor / član uprave",
  "Vlasnik obrta",
  "Stručno osposobljavanje",
  "Sezonski radnik",
  "Penzioner — povratak na rad",
  "Stranac — radna dozvola",
  "Ostalo 1",
  "Ostalo 2",
];

/* ── Component ── */
export default function Js3100Form() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const { findByName: findCity } = useCityLookup();

  /* ── Vrsta prijave ── */
  const [vrsta, setVrsta] = useState<Js3100Vrsta>("PRIJAVA");
  const [datumPrijaveIso, setDatumPrijaveIso] = useState(() => getTodayIso());

  /* ── Prvi dio — Obveznik ── */
  const [employer, setEmployer] = useState({
    jib: "",
    naziv: "",
    adresa: "",
    grad: "",
    telefon: "",
    email: "",
  });

  /* ── Drugi dio — Osiguranik ── */
  const [worker, setWorker] = useState({
    jmbg: "",
    prezime: "",
    ime: "",
    datumRodjenjaIso: "",
    spol: "" as Js3100Spol,
    adresa: "",
    grad: "",
    emailOsiguranika: "",
  });

  /* ── Sredina forme — TODO precizirati ── */
  const [tipUgovoraIdx, setTipUgovoraIdx] = useState<number | null>(null);
  const [osnovIdx, setOsnovIdx] = useState<number | null>(null);
  const [datumStupanjaIso, setDatumStupanjaIso] = useState("");
  const [datumPrestankaIso, setDatumPrestankaIso] = useState("");
  const [satiSedmicno, setSatiSedmicno] = useState("");
  const [minutaSedmicno, setMinutaSedmicno] = useState("");
  const [napomenaText1, setNapomenaText1] = useState("");
  const [napomenaText2, setNapomenaText2] = useState("");
  const [napomenaText3, setNapomenaText3] = useState("");

  /* ── Footer ── */
  const [popunioImeIPrezime, setPopunioImeIPrezime] = useState("");
  const [popunioTelefon, setPopunioTelefon] = useState("");
  const [datumPopunjavanjaIso, setDatumPopunjavanjaIso] = useState(() => getTodayIso());

  const [loading, setLoading] = useState(false);

  /* ── Fill from profile ── */
  const fillEmployer = useCallback((data: OrgFillData) => {
    setEmployer((p) => ({
      ...p,
      jib: data.taxNumber ?? p.jib,
      naziv: data.name ?? p.naziv,
      adresa: data.address ?? p.adresa,
      grad: data.city ?? p.grad,
    }));
  }, []);

  const fillWorker = useCallback((data: FillData) => {
    setWorker((p) => ({
      ...p,
      jmbg: data.jmbg ?? p.jmbg,
      ime: data.firstName ?? p.ime,
      prezime: data.lastName ?? p.prezime,
      adresa: data.address ?? p.adresa,
      grad: data.city ?? p.grad,
    }));
  }, []);

  /* ── Build PDF data ── */
  const buildData = useCallback((): Js3100Data => {
    const rod = isoToDDMMYYYY(worker.datumRodjenjaIso);
    const stup = isoToDDMMYYYY(datumStupanjaIso);
    const prest = isoToDDMMYYYY(datumPrestankaIso);
    const employerCityInfo = findCity(employer.grad);
    const workerCityInfo = findCity(worker.grad);

    return {
      vrsta,
      datumPrijave: isoToDisplay(datumPrijaveIso),

      jib: employer.jib,
      naziv: employer.naziv,
      adresa: employer.adresa,
      gradPoste: [employerCityInfo?.postalCode, employer.grad].filter(Boolean).join(" "),
      telefon: employer.telefon,
      email: employer.email,

      jmbg: worker.jmbg,
      prezimeIme: [worker.prezime, worker.ime].filter(Boolean).join(" "),
      datumRodjenjaDan: rod.dd,
      datumRodjenjaMjesec: rod.mm,
      datumRodjenjaGodina: rod.yyyy,
      spol: worker.spol,
      adresaPrebivalista: formatAddress(worker.adresa, worker.grad, workerCityInfo?.postalCode),
      postanskiBroj: workerCityInfo?.postalCode ?? "",
      mjestoPrebivalista: worker.grad,
      emailOsiguranika: worker.emailOsiguranika,

      tipUgovoraIdx,
      osnovOsiguranjaIdx: osnovIdx,
      napomenaText1,
      napomenaText2,
      napomenaText3,
      datumStupanjaDan: stup.dd,
      datumStupanjaMjesec: stup.mm,
      datumStupanjaGodina: stup.yyyy,
      satiSedmicno,
      minutaSedmicno,
      datumPrestankaDan: prest.dd,
      datumPrestankaMjesec: prest.mm,
      datumPrestankaGodina: prest.yyyy,

      popunioImeIPrezime,
      popunioTelefon,
      datumPopunjavanja: isoToDisplay(datumPopunjavanjaIso),
    };
  }, [
    vrsta,
    datumPrijaveIso,
    employer,
    worker,
    tipUgovoraIdx,
    osnovIdx,
    napomenaText1,
    napomenaText2,
    napomenaText3,
    datumStupanjaIso,
    datumPrestankaIso,
    satiSedmicno,
    minutaSedmicno,
    popunioImeIPrezime,
    popunioTelefon,
    datumPopunjavanjaIso,
    findCity,
  ]);

  const handleExport = async () => {
    setLoading(true);
    try {
      const bytes = await fillJs3100Template(buildData());
      const suffix = vrsta === "PRIJAVA" ? "Prijava" : vrsta === "ODJAVA" ? "Odjava" : "Promjena";
      const last = worker.prezime || worker.jmbg || "radnik";
      downloadPdf(bytes, `JS3100_${suffix}_${last}.pdf`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Obrazac JS3100</div>
        <h1 className={styles.h1}>
          Prijava / Odjava <em>radnika</em>
        </h1>
        <p className={styles.subtitle}>
          Jedinstveni sistem registracije, kontrole i naplate doprinosa — JS3100.
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          handleExport();
        }}
      >
        {/* ── Vrsta prijave ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Vrsta <em>prijave</em>
          </h2>
          <div className={styles.fieldGrid}>
            <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
              <label className={styles.fieldLabel}>Tip</label>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                {(["PRIJAVA", "PROMJENA", "ODJAVA"] as Js3100Vrsta[]).map((v) => (
                  <label key={v} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="vrsta"
                      value={v}
                      checked={vrsta === v}
                      onChange={() => setVrsta(v)}
                    />
                    {v === "PRIJAVA" ? "Prijava osiguranja" : v === "PROMJENA" ? "Promjena podataka" : "Odjava osiguranja"}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Datum prijave</label>
              <DateInput
                className={styles.fieldInput}
                value={datumPrijaveIso}
                onValueChange={setDatumPrijaveIso}
              />
            </div>
          </div>
        </section>

        {/* ── Prvi dio — Obveznik ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Prvi dio — Podaci o <em>obvezniku uplate doprinosa</em>
          </h2>
          <OrgFillSelect onFill={fillEmployer} />
          <div className={styles.fieldGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>1) JIB</label>
              <input
                className={styles.fieldInput}
                value={employer.jib}
                onChange={(e) => setEmployer((p) => ({ ...p, jib: e.target.value }))}
                maxLength={13}
                placeholder="13 cifara"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>7) Telefon</label>
              <input
                className={styles.fieldInput}
                value={employer.telefon}
                onChange={(e) => setEmployer((p) => ({ ...p, telefon: e.target.value }))}
                placeholder="+387..."
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
              <label className={styles.fieldLabel}>2) Naziv obveznika uplate doprinosa</label>
              <input
                className={styles.fieldInput}
                value={employer.naziv}
                onChange={(e) => setEmployer((p) => ({ ...p, naziv: e.target.value }))}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>3) Adresa obveznika</label>
              <input
                className={styles.fieldInput}
                value={employer.adresa}
                onChange={(e) => setEmployer((p) => ({ ...p, adresa: e.target.value }))}
                placeholder="Ulica i broj"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>4) Grad i poštanski broj</label>
              <CitySelect
                value={employer.grad}
                onChange={(v) => setEmployer((p) => ({ ...p, grad: v }))}
                className={styles.fieldInput}
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
              <label className={styles.fieldLabel}>8) Email</label>
              <input
                type="email"
                className={styles.fieldInput}
                value={employer.email}
                onChange={(e) => setEmployer((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* ── Drugi dio — Osiguranik ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Drugi dio — Podaci o <em>osiguraniku</em>
          </h2>
          <PersonFillSelect onFill={fillWorker} />
          <div className={styles.fieldGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>JMBG</label>
              <input
                className={styles.fieldInput}
                value={worker.jmbg}
                onChange={(e) => setWorker((p) => ({ ...p, jmbg: e.target.value.replace(/\D/g, "").slice(0, 13) }))}
                maxLength={13}
                placeholder="13 cifara"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Datum rođenja</label>
              <DateInput
                className={styles.fieldInput}
                value={worker.datumRodjenjaIso}
                onValueChange={(iso) => setWorker((p) => ({ ...p, datumRodjenjaIso: iso }))}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Prezime</label>
              <input
                className={styles.fieldInput}
                value={worker.prezime}
                onChange={(e) => setWorker((p) => ({ ...p, prezime: e.target.value }))}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Ime</label>
              <input
                className={styles.fieldInput}
                value={worker.ime}
                onChange={(e) => setWorker((p) => ({ ...p, ime: e.target.value }))}
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
              <label className={styles.fieldLabel}>Spol</label>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                {(["M", "Z"] as Js3100Spol[]).map((s) => (
                  <label key={s} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="spol"
                      value={s}
                      checked={worker.spol === s}
                      onChange={() => setWorker((p) => ({ ...p, spol: s }))}
                    />
                    {s === "M" ? "Muški" : "Ženski"}
                  </label>
                ))}
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Adresa prebivališta</label>
              <input
                className={styles.fieldInput}
                value={worker.adresa}
                onChange={(e) => setWorker((p) => ({ ...p, adresa: e.target.value }))}
                placeholder="Ulica i broj"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Mjesto / Grad</label>
              <CitySelect
                value={worker.grad}
                onChange={(v) => setWorker((p) => ({ ...p, grad: v }))}
                className={styles.fieldInput}
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
              <label className={styles.fieldLabel}>Email osiguranika</label>
              <input
                type="email"
                className={styles.fieldInput}
                value={worker.emailOsiguranika}
                onChange={(e) => setWorker((p) => ({ ...p, emailOsiguranika: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* ── Osiguranje i ugovor ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Osnov <em>osiguranja</em> i ugovor
          </h2>
          <div className={styles.fieldGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Tip ugovora</label>
              <select
                className={styles.fieldInput}
                value={tipUgovoraIdx ?? ""}
                onChange={(e) => setTipUgovoraIdx(e.target.value === "" ? null : parseInt(e.target.value))}
              >
                <option value="">— Odaberite —</option>
                {TIP_UGOVORA.map((t, i) => (
                  <option key={i} value={i}>{t}</option>
                ))}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Osnov osiguranja</label>
              <select
                className={styles.fieldInput}
                value={osnovIdx ?? ""}
                onChange={(e) => setOsnovIdx(e.target.value === "" ? null : parseInt(e.target.value))}
              >
                <option value="">— Odaberite —</option>
                {OSNOV_OSIGURANJA.map((t, i) => (
                  <option key={i} value={i}>{t}</option>
                ))}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Datum stupanja na rad</label>
              <DateInput
                className={styles.fieldInput}
                value={datumStupanjaIso}
                onValueChange={setDatumStupanjaIso}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Datum prestanka rada (za odjavu)</label>
              <DateInput
                className={styles.fieldInput}
                value={datumPrestankaIso}
                onValueChange={setDatumPrestankaIso}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Sedmično — sati</label>
              <input
                className={styles.fieldInput}
                inputMode="numeric"
                value={satiSedmicno}
                onChange={(e) => setSatiSedmicno(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="40"
                maxLength={2}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Sedmično — minuta</label>
              <input
                className={styles.fieldInput}
                inputMode="numeric"
                value={minutaSedmicno}
                onChange={(e) => setMinutaSedmicno(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="00"
                maxLength={2}
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
              <label className={styles.fieldLabel}>Napomena 1 (text1 polje)</label>
              <input
                className={styles.fieldInput}
                value={napomenaText1}
                onChange={(e) => setNapomenaText1(e.target.value)}
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
              <label className={styles.fieldLabel}>Napomena 2 (text2 polje)</label>
              <input
                className={styles.fieldInput}
                value={napomenaText2}
                onChange={(e) => setNapomenaText2(e.target.value)}
              />
            </div>
            <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
              <label className={styles.fieldLabel}>Napomena 3 (text3 polje)</label>
              <input
                className={styles.fieldInput}
                value={napomenaText3}
                onChange={(e) => setNapomenaText3(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Lice koje je <em>popunilo prijavu</em>
          </h2>
          <div className={styles.fieldGrid}>
            <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
              <label className={styles.fieldLabel}>Ime i prezime lica</label>
              <input
                className={styles.fieldInput}
                value={popunioImeIPrezime}
                onChange={(e) => setPopunioImeIPrezime(e.target.value)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Telefonski broj</label>
              <input
                className={styles.fieldInput}
                value={popunioTelefon}
                onChange={(e) => setPopunioTelefon(e.target.value)}
                placeholder="+387..."
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Datum popunjavanja</label>
              <DateInput
                className={styles.fieldInput}
                value={datumPopunjavanjaIso}
                onValueChange={setDatumPopunjavanjaIso}
              />
            </div>
          </div>
        </section>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
          <button
            type="submit"
            className={styles.fieldInput}
            disabled={loading}
            style={{
              background: "var(--sage)",
              color: "white",
              border: "none",
              padding: "0.85rem 2rem",
              borderRadius: "var(--radius)",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              maxWidth: 240,
            }}
          >
            {loading ? "Generisanje..." : "Generiši PDF"}
          </button>
        </div>
      </form>
    </div>
  );
}
