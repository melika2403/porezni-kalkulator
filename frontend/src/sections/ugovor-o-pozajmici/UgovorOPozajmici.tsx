"use client";
import { useState } from "react";
import FaqSection from "src/components/FaqSection/FaqSection";
import styles from "./ugovor.module.css";
import type { UgovorData } from "./generateDocx";
import DateInput from "src/components/DateInput/DateInput";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import UgovorFillSelect from "src/components/PersonFillSelect/UgovorFillSelect";
import { useCityLookup } from "src/hooks/useCities";
import { formatAddress } from "src/utils/formatAddress";
import { iznosUSlova } from "../ugovor-o-djelu/iznosSlovima";
import { trackEvent } from "src/api/activity";

const isoToDisplay = (iso: string) => {
  if (!iso || !iso.includes("-")) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
};

// Live formatter za polja sa iznosima — dodaje tačke kao thousands separator
// dok user kuca. Primjer: "5000" → "5.000"; "5000,50" → "5.000,50"
const formatMoneyLive = (input: string): string => {
  if (!input || !input.trim()) return "";
  const cleaned = input.replace(/\./g, "");
  const parts = cleaned.split(",");
  let intPart = parts[0].replace(/\D/g, "");
  if (!intPart && parts.length > 1) intPart = "0";
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (parts.length > 1) {
    const decPart = parts[1].replace(/\D/g, "").slice(0, 2);
    return `${intPart},${decPart}`;
  }
  return intPart;
};

// Parsira de-DE format ("1.234,56") u broj. Tačka je UVIJEK thousands separator
// (nikad decimalni), zarez je UVIJEK decimalni separator. Tako "1.234" = 1234
// (hiljadu dvjesta trideset četiri), ne 1,234 (jedan cijela 234).
const parseIznos = (s: string): number => {
  if (!s) return 0;
  const cleaned = s.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

// Sklopi finalni string za PDF/DOCX: "5.000,00 KM (slovima: pet hiljada KM)".
const composeIznosString = (raw: string): string => {
  const n = parseIznos(raw);
  if (n <= 0) return raw;
  const formatted = n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} KM (slovima: ${iznosUSlova(n)})`;
};

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
  const { findByName: findCity } = useCityLookup();
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
      const blob = await generateDocx({
        ...form,
        datum: isoToDisplay(form.datum),
        iznos: composeIznosString(form.iznos),
      });
      downloadBlob(blob, "Ugovor-o-pozajmici.docx");
      trackEvent("UGOVOR_POZAJMICA_GENERATE", "Ugovor o pozajmici");
    } finally {
      setLoadingDocx(false);
    }
  }

  async function handlePdf() {
    setLoadingPdf(true);
    try {
      const { generatePdf } = await import("./generatePdf");
      const blob = await generatePdf({
        ...form,
        datum: isoToDisplay(form.datum),
        iznos: composeIznosString(form.iznos),
      });
      downloadBlob(blob, "Ugovor-o-pozajmici.pdf");
      trackEvent("UGOVOR_POZAJMICA_GENERATE", "Ugovor o pozajmici");
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
          Ugovor o pozajmici novca, <em>predložak i online popuna</em>
        </h1>
        <p className={styles.subtitle}>
          Kako napisati ugovor o pozajmici? Kreirajte pravno validan ugovor o
          pozajmici novca između fizičkih ili pravnih lica u BiH, definirajte
          iznos, kamatnu stopu, rok otplate i uslove vraćanja, pa preuzmite
          gotov ugovor u PDF ili Word formatu, besplatno.
        </p>
      </div>

      {/* Opći podaci */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Opći <em>podaci</em>
        </h2>
        <div className={styles.fieldGrid}>
          <label className={styles.fieldLabel}>Vrsta pozajmice</label>
          <StyledSelect
            value={form.vrsta}
            onChange={(v) => set("vrsta", String(v ?? ""))}
            groups={[
              {
                options: [
                  { value: "kratkoročnoj", label: "Kratkoročno" },
                  { value: "dugoročnoj", label: "Dugoročno" },
                ],
              },
            ]}
            ariaLabel="Vrsta pozajmice"
            wrapStyle={{ width: "100%" }}
          />
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Datum zaključenja</label>
            <DateInput
              className={styles.fieldInput}
              value={form.datum}
              onValueChange={(iso) => set("datum", iso)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Ugovor se zaključuje u</label>
            <input
              className={styles.fieldInput}
              value={form.mjesto}
              onChange={(e) => set("mjesto", e.target.value)}
              placeholder="Sarajevu"
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
            <label className={styles.fieldLabel}>Popuni zajmodavca</label>
            <UgovorFillSelect
              onFill={({ name, address, city, id }) => {
                set("zajmodavac", name);
                set("zajmodavacAdresa", formatAddress(address, city, findCity(city)?.postalCode));
                set("zajmodavacID", id);
              }}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Popuni zajmoprimca</label>
            <UgovorFillSelect
              onFill={({ name, address, city, id, bankAccount }) => {
                set("zajmoprimac", name);
                set("zajmoprimacAdresa", formatAddress(address, city, findCity(city)?.postalCode));
                set("zajmoprimacID", id);
                if (bankAccount) set("ziroRacun", bankAccount);
              }}
            />
          </div>
        </div>
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
              Iznos pozajmice (samo cifra u KM)
            </label>
            <input
              className={styles.fieldInput}
              value={form.iznos}
              onChange={(e) => set("iznos", formatMoneyLive(e.target.value))}
              placeholder="Npr. 5.000,00"
              inputMode="decimal"
            />
            {parseIznos(form.iznos) > 0 && (
              <p
                style={{
                  margin: "0.4rem 0 0",
                  fontSize: 13,
                  color: "var(--mid, #666)",
                }}
              >
                Slovima:{" "}
                <strong>{iznosUSlova(parseIznos(form.iznos))}</strong>
                {" "}, ovaj prikaz se automatski upisuje u ugovor.
              </p>
            )}
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
            <label className={styles.fieldLabel}>Zajam/pozajmica se daje {form.vrsta.replace(/j$/, "")}</label>
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
            <label className={styles.fieldLabel}>Broj žiro računa na koji se uplaćuje pozajmica</label>
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
            <label className={styles.fieldLabel}>
              Ugovorene strane u svemu prihvataju odredbe ovog ugovora
            </label>

            <StyledSelect
              value={napomenaTip}
              onChange={(v) => {
                const tip = String(v ?? "") as NapomenaTip;
                setNapomenaTip(tip);

                if (tip === "odricanje") set("napomene", NAPOMENA_ODRICANJE);
                if (tip === "spor")
                  set("napomene", `${NAPOMENA_SPOR_PREFIX} ${sud}`);
              }}
              groups={[
                {
                  options: [
                    {
                      value: "odricanje",
                      label: "i odriču se njihovog pobijanja ma iz kog razloga.",
                    },
                    {
                      value: "spor",
                      label: "i u slučaju spora po ovom ugovoru nadležan je",
                    },
                  ],
                },
              ]}
              ariaLabel="Ugovorene strane u svemu prihvataju odredbe ovog ugovora"
              wrapStyle={{ width: "100%" }}
            />
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
            <StyledSelect
              value={form.brojPrimjeraka}
              onChange={(v) => set("brojPrimjeraka", String(v ?? ""))}
              groups={[
                {
                  options: PRIMJERCI_OPTIONS.map((opt) => ({
                    value: opt,
                    label: opt,
                  })),
                },
              ]}
              ariaLabel="Ukupan broj primjeraka"
              wrapStyle={{ width: "100%" }}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Kopije po strani</label>
            <StyledSelect
              value={form.kopijePoPrimjerku}
              onChange={(v) => set("kopijePoPrimjerku", String(v ?? ""))}
              groups={[
                {
                  options: PRIMJERCI_OPTIONS.map((opt) => ({
                    value: opt,
                    label: opt,
                  })),
                },
              ]}
              ariaLabel="Kopije po strani"
              wrapStyle={{ width: "100%" }}
            />
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
      <p className={styles.dataNapomena}>
        Porezni kalkulator ne zadržava popunjene podatke ni u kojem obliku. Nakon spremanja dokumenta uvijek provjerite tačnost podataka.
      </p>

      {/* ── Edukativni sadržaj (SEO) ─────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Šta je ugovor o <em>pozajmici novca</em>?
        </h2>
        <p>
          <strong>Ugovor o pozajmici</strong> (zajmu) je pisani dokument kojim
          zajmodavac prenosi određeni iznos novca u svojinu zajmoprimca, uz
          obavezu da ga ovaj vrati u dogovorenom roku, sa kamatom ili bez
          kamate. U Bosni i Hercegovini ugovor o pozajmici regulisan je{" "}
          <em>Zakonom o obligacionim odnosima</em> i može se zaključiti između
          fizičkih i pravnih osoba.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          Pisani ugovor štiti obje strane, zajmodavca u smislu dokazivanja
          prenosa novca i prava na povrat, a zajmoprimca u pogledu jasno
          definisanog roka, iznosa i uslova vraćanja.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Šta mora sadržavati <em>ugovor o pozajmici</em>?
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Identifikacioni podaci stranaka</strong>, ime/naziv,
            adresa, JMB ili JIB, broj lične karte/pasoša ili zastupnik (kod
            pravnih osoba).
          </li>
          <li>
            <strong>Iznos pozajmice i valuta</strong>, npr. 5.000 KM ili 2.500
            EUR (sa naznakom kursa ako je u stranoj valuti).
          </li>
          <li>
            <strong>Rok vraćanja</strong>, tačan datum, mjesečni anuiteti ili
            "na poziv zajmodavca".
          </li>
          <li>
            <strong>Kamatna stopa</strong>, ugovorna kamata ili eksplicitna
            izjava da je pozajmica beskamatna.
          </li>
          <li>
            <strong>Način vraćanja</strong>, gotovinski, transferom, jednokratno
            ili u ratama.
          </li>
          <li>
            <strong>Posljedice kašnjenja</strong>, zatezne kamate, klauzula o
            izvršenju.
          </li>
          <li>
            <strong>Datum i potpisi</strong> obje strane, eventualno svjedoci
            ili notarska ovjera.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Porezni tretman <em>pozajmice i kamate</em>
        </h2>
        <p>
          <strong>Sama pozajmica</strong> nije oporeziva jer se radi o povratu
          istog iznosa, ne predstavlja prihod ni za zajmoprimca, ni rashod za
          zajmodavca u trenutku isplate.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          <strong>Kamata na pozajmicu</strong> predstavlja prihod zajmodavca i
          podliježe oporezivanju:
        </p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            za <strong>fizičke osobe</strong>, porez na dohodak od kapitala po
            stopi od <strong>10%</strong>, prijavljuje se kroz GPD-1051,
          </li>
          <li>
            za <strong>pravne osobe</strong>, kamata ulazi u prihode od
            kapitala i oporezuje porezom na dobit.
          </li>
        </ul>
        <p style={{ marginTop: "0.85rem" }}>
          Kod pozajmica između <strong>povezanih lica</strong> (firma↔vlasnik,
          firma↔direktor) Porezna uprava može primijeniti <em>tržišnu kamatnu
          stopu</em> radi sprječavanja prikrivenih distribucija dobiti.
          Preporučuje se konsultacija sa knjigovođom kod takvih konstrukcija.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Notarska <em>ovjera</em>, kada je potrebna?
        </h2>
        <p>
          Za ugovor o pozajmici između fizičkih osoba notarska ovjera{" "}
          <strong>nije obavezna</strong>. Međutim, preporučuje se za:
        </p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>veće iznose (preko 10.000 KM),</li>
          <li>ugovore sa pravnim osobama,</li>
          <li>pozajmice na duži rok (preko 1 godine),</li>
          <li>slučajeve gdje se traži dodatna pravna sigurnost.</li>
        </ul>
        <p style={{ marginTop: "0.85rem" }}>
          Notarski ovjeren ugovor je <strong>izvršna isprava</strong>, u
          slučaju neispunjenja obaveze, zajmodavac može direktno pokrenuti
          izvršni postupak bez prethodne sudske presude, što značajno ubrzava
          naplatu.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Povezani <em>alati</em>
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.9 }}>
          <li>
            <a href="/gpd" style={{ color: "var(--sage)", fontWeight: 600 }}>
              GPD-1051, godišnja prijava poreza
            </a>,{" "}
            prihod od kamata se prijavljuje u GPD-1051.
          </li>
          <li>
            <a href="/ugovor-o-djelu" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Ugovor o djelu
            </a>,{" "}
            za jednokratne usluge između naručioca i izvođača.
          </li>
          <li>
            <a href="/ugovor-o-radu" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Ugovor o radu
            </a>,{" "}
            za stalno radno angažovanje radnika.
          </li>
        </ul>
      </section>

      <FaqSection items={[
        { q: "Da li ugovor o pozajmici mora biti ovjeren kod notara?", a: "Nije obavezna notarska ovjera za ugovor o pozajmici između fizičkih osoba u FBiH, ali se preporučuje za veće iznose radi veće pravne sigurnosti. Notarski ovjeren ugovor je direktno izvršna isprava što olakšava naplatu u slučaju spora." },
        { q: "Da li se plaća porez na pozajmicu novca?", a: "Sama pozajmica nije oporeziva jer se radi o povratu sredstava. Međutim, kamata na pozajmicu predstavlja prihod zajmodavca i podliježe oporezivanju porezom na dohodak kao prihod od kapitala po stopi od 10%." },
        { q: "Da li kamata mora biti ugovorena?", a: "Ne, kamata nije obavezna, stranke mogu dogovoriti beskamatnu pozajmicu. Ukoliko se radi o pozajmici između pravnih osoba ili između pravne i fizičke osobe, Porezna uprava može primijeniti tržišnu kamatnu stopu radi izbjegavanja prikrivenih distribucija dobiti." },
        { q: "Koji minimalni podaci moraju biti u ugovoru o pozajmici?", a: "Ugovor mora sadržavati: identifikacione podatke zajmodavca i zajmoprimca, iznos pozajmice, valutu, rok vraćanja, kamatnu stopu (ili izjavu da je beskamatna) i datum zaključenja ugovora. Preporučuje se i klauzula o načinu vraćanja i posljedicama kašnjenja." },
        { q: "Može li ugovor o pozajmici biti između firme i vlasnika?", a: "Da, ugovor može biti zaključen između privrednog društva i njegovog vlasnika ili direktora. U tom slučaju potrebno je voditi računa o transfernim cijenama i tržišnoj kamatnoj stopi kako bi se izbjegla porezna reklasifikacija kao prikrivena raspodjela dobiti." },
        { q: "Šta ako zajmoprimac ne vrati novac na vrijeme?", a: "Ugovorom se mogu predvidjeti zatezne kamate na neplaćeni iznos. U slučaju spora, zajmodavac može pokrenuti sudski postupak. Uz notarski ovjeren ugovor moguće je direktno pokrenuti izvršni postupak bez prethodne presude, što značajno ubrzava naplatu." },
      ]} />
    </main>
  );
}
