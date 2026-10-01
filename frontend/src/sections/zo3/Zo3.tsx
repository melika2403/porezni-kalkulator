"use client";
import { useState, useCallback, useRef, useMemo } from "react";
import styles from "./zo3.module.css";
import FaqSection from "src/components/FaqSection/FaqSection";
import { fillZo3Template, type Zo3Data } from "src/sections/zo3/fillZo3";
import DateInput from "src/components/DateInput/DateInput";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import CitySelect from "src/components/CitySelect/CitySelect";
import { useCityLookup } from "src/hooks/useCities";
import PersonFillSelect, {
  type FillData,
} from "src/components/PersonFillSelect/PersonFillSelect";
import OrgFillSelect, {
  type OrgFillData,
} from "src/components/PersonFillSelect/OrgFillSelect";
import SaveToProfileButton from "src/components/SaveToProfileButton/SaveToProfileButton";
import ShifraCombobox from "src/components/ShifraCombobox/ShifraCombobox";
import { trackEvent } from "src/api/activity";
import { DugmePreuzimanja, ReklamaBanerIspod, ReklamaStub } from "src/components/PartnerSlot/Slot";

/* ── Constants ── */

const KANTONI = [
  "Unsko-sanski kanton",
  "Posavski kanton",
  "Tuzlanski kanton",
  "Zeničko-dobojski kanton",
  "Bosansko-podrinjski kanton Goražde",
  "Srednjobosanski kanton",
  "Hercegovačko-neretvanski kanton",
  "Zapadnohercegovački kanton",
  "Kanton Sarajevo",
  "Kanton 10",
];

const POSLOVNICE: Record<string, string[]> = {
  "Unsko-sanski kanton": [
    "Bihać",
    "Bosanska Krupa",
    "Bosanski Petrovac",
    "Bužim",
    "Cazin",
    "Ključ",
    "Sanski Most",
    "Velika Kladuša",
  ],
  "Posavski kanton": ["Odžak", "Domaljevac-Šamac", "Orašje"],
  "Tuzlanski kanton": [
    "Tuzla",
    "Banovići",
    "Čelić",
    "Doboj Istok",
    "Gračanica",
    "Gradačac",
    "Kalesija",
    "Kladanj",
    "Lukavac",
    "Sapna",
    "Srebrenik",
    "Teočak",
    "Živinice",
  ],
  "Zeničko-dobojski kanton": [
    "Zenica",
    "Breza",
    "Doboj Jug",
    "Kakanj",
    "Maglaj",
    "Olovo",
    "Tešanj",
    "Usora",
    "Vareš",
    "Visoko",
    "Zavidovići",
    "Žepče",
  ],
  "Bosansko-podrinjski kanton Goražde": [
    "Goražde",
    "Foča-Ustikolina",
    "Pale-Prača",
  ],
  "Srednjobosanski kanton": [
    "Travnik",
    "Bugojno",
    "Busovača",
    "Dobretići",
    "Donji Vakuf",
    "Fojnica",
    "Gornji Vakuf-Uskoplje",
    "Jajce",
    "Kiseljak",
    "Kreševo",
    "Novi Travnik",
    "Vitez",
  ],
  "Hercegovačko-neretvanski kanton": [
    "Mostar",
    "Čapljina",
    "Čitluk",
    "Jablanica",
    "Konjic",
    "Neum",
    "Prozor-Rama",
    "Ravno",
    "Stolac",
  ],
  "Zapadnohercegovački kanton": [
    "Široki Brijeg",
    "Grude",
    "Ljubuški",
    "Posušje",
  ],
  "Kanton Sarajevo": [
    "Sarajevo - Centar",
    "Sarajevo - Hadžići",
    "Sarajevo - Ilidža",
    "Sarajevo - Ilijaš",
    "Sarajevo - Novi Grad",
    "Sarajevo - Novo Sarajevo",
    "Sarajevo - Stari Grad",
    "Sarajevo - Trnovo",
    "Sarajevo - Vogošća",
  ],
  "Kanton 10": [
    "Livno",
    "Bosansko Grahovo",
    "Drvar",
    "Glamoč",
    "Kupres",
    "Tomislavgrad",
  ],
};

/* ── Helpers ── */

const onEnterNext = (e: React.KeyboardEvent<HTMLFormElement>) => {
  if (e.key !== "Enter") return;
  const target = e.target as HTMLElement;
  // linkovi moraju ostati linkovi: bez "A" u ovoj listi preventDefault ispod
  // guta Enter na fokusiranom linku (reklama, "Povezani alati"), pa se ne otvara
  if (["TEXTAREA", "BUTTON", "A"].includes(target.tagName)) return;
  e.preventDefault();
  const focusable = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])",
    ),
  );
  const idx = focusable.indexOf(target);
  if (idx >= 0 && idx < focusable.length - 1) focusable[idx + 1].focus();
};

const getTodayIsoString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isoToCompact = (isoDate: string): string => {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  return `${day}${month}${year}`;
};

const isoToFormatted = (isoDate: string): string => {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const EMPTY_MEMBER = { jmbg: "", fullName: "", srodstvo: "" };

/* ── Component ── */

export default function Zo3Form() {
  const { findByName: findCity } = useCityLookup();
  const formRef = useRef<HTMLFormElement | null>(null);

  /* ── Header ── */
  const [kanton, setKanton] = useState("");
  const [poslovnica, setPoslovnica] = useState("");
  const [poslovnicaOpen, setPoslovnicaOpen] = useState(false);

  const [sourceClientId, setSourceClientId] = useState<number | null>(null);
  const [sourceOrgId, setSourceOrgId] = useState<number | null>(null);

  /* ── Obveznik uplate doprinosa ── */
  const [employer, setEmployer] = useState({
    naziv: "",
    jib: "",
    regBroj: "",
    sifraDjelatnosti: "",
    nazivDjelatnosti: "",
    radnoVrijeme: "",
  });

  /* ── Podaci o osiguraniku ── */
  const [insured, setInsured] = useState({
    jmbg: "",
    prezime: "",
    ime: "",
    djevojackoPrezime: "",
    ulicaBroj: "",
    grad: "",
    brojPoste: "",
    zanimanje: "",
    zamanjanjeKod: "",
    datumStupanja: "",
    drzavljanstvo: "",
    radnoVrijeme: "",
    osnovOsiguranja: "",
    osnovOsiguranjaKod: "",
    datumPrestanka: "",
    datumPromjene: "",
    vrstaPromjene: "",
    vrstaPromjeneKod: "",
  });

  /* ── Članovi porodice ── */
  const [familyMembers, setFamilyMembers] = useState(() =>
    Array.from({ length: 10 }, () => ({ ...EMPTY_MEMBER })),
  );

  /* ── Footer ── */
  const [napomena, setNapomena] = useState("");
  const [mjesto, setMjesto] = useState("");
  const [datum, setDatum] = useState(() => getTodayIsoString());

  /* ── Fill from profile/client ── */

  const fillInsured = useCallback((data: FillData) => {
    setInsured((p) => {
      const cityResolved = data.city ?? p.grad;
      const postalCode = cityResolved ? findCity(cityResolved)?.postalCode ?? "" : "";
      return {
        ...p,
        jmbg: data.jmbg ?? p.jmbg,
        ime: data.firstName ?? p.ime,
        prezime: data.lastName ?? p.prezime,
        ulicaBroj: data.address ?? p.ulicaBroj,
        grad: cityResolved,
        brojPoste: postalCode || p.brojPoste,
      };
    });
    if (data.sourceClientId !== undefined)
      setSourceClientId(data.sourceClientId);
    if (data.sourceWorkerOrgId !== undefined)
      setSourceOrgId(data.sourceWorkerOrgId);
  }, [findCity]);

  const fillEmployer = useCallback((data: OrgFillData) => {
    setEmployer((p) => ({
      ...p,
      naziv: data.name ?? p.naziv,
      jib: data.taxNumber ?? p.jib,
      sifraDjelatnosti: data.activityCode ?? p.sifraDjelatnosti,
      nazivDjelatnosti: data.activityName ?? p.nazivDjelatnosti,
    }));
  }, []);

  /* ── Autocomplete for poslovnica ── */
  const poslovniceOptions = useMemo(
    () => (kanton ? (POSLOVNICE[kanton] ?? []) : []),
    [kanton],
  );

  const filteredPoslovnice = useMemo(() => {
    if (!poslovnica) return poslovniceOptions;
    const q = poslovnica.toLowerCase();
    return poslovniceOptions.filter((p) => p.toLowerCase().includes(q));
  }, [poslovnica, poslovniceOptions]);

  const updateFamily = useCallback(
    (idx: number, key: keyof (typeof familyMembers)[0], value: string) => {
      setFamilyMembers((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [key]: value };
        return next;
      });
    },
    [],
  );

  /* ── PDF Export ── */

  const buildZo3Data = useCallback((): Zo3Data => {
    return {
      kanton,
      poslovnica,

      nazivObveznika: employer.naziv,
      jib: employer.jib,
      regBroj: employer.regBroj,
      sifraDjelatnosti: employer.sifraDjelatnosti,
      radnoVrijemeObveznika: employer.radnoVrijeme,

      jmbg: insured.jmbg,
      prezime: insured.prezime,
      ime: insured.ime,
      djevojackoPrezime: insured.djevojackoPrezime,
      ulicaBroj: insured.ulicaBroj,
      brojPoste: insured.brojPoste,
      zanimanje: insured.zanimanje,
      zamanjanjeKod: insured.zamanjanjeKod,
      datumStupanja: isoToCompact(insured.datumStupanja),
      drzavljanstvo: insured.drzavljanstvo,
      radnoVrijemeRadno: insured.radnoVrijeme,
      osnovOsiguranja: insured.osnovOsiguranja,
      osnovOsiguranjaKod: insured.osnovOsiguranjaKod,
      datumPrestanka: isoToCompact(insured.datumPrestanka),
      datumPromjene: isoToCompact(insured.datumPromjene),
      vrstaPromjene: insured.vrstaPromjene,
      vrstaPromjeneKod: insured.vrstaPromjeneKod,

      familyMembers: familyMembers.filter(
        (m) => m.jmbg || m.fullName || m.srodstvo,
      ),

      napomena,
      mjesto,
      datum: isoToFormatted(datum),
    };
  }, [
    kanton,
    poslovnica,
    employer,
    insured,
    familyMembers,
    napomena,
    mjesto,
    datum,
  ]);

  const exportPdf = useCallback(async () => {
    const data = buildZo3Data();
    const pdfBytes = await fillZo3Template(data);

    const pdfArrayBuffer: ArrayBuffer =
      pdfBytes.buffer instanceof ArrayBuffer
        ? pdfBytes.buffer.slice(
            pdfBytes.byteOffset,
            pdfBytes.byteOffset + pdfBytes.byteLength,
          )
        : Uint8Array.from(pdfBytes).buffer;

    const blob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ZO3_obrazac${insured.prezime ? `_${insured.prezime}` : ""}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("ZO3_GENERATE", "ZO3 obrazac");
  }, [buildZo3Data, insured.prezime]);

  const zo3Year = datum ? parseInt(datum.slice(0, 4)) || null : null;

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const form = formRef.current;
      if (form && !form.reportValidity()) return;
      await exportPdf();
    },
    [exportPdf],
  );

  /* ── Render ── */

  return (
    <form
      ref={formRef}
      className={styles.page}
      onSubmit={onSubmit}
      onKeyDown={onEnterNext}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.label}>Obrazac ZO 3</div>
        <h1 className={styles.h1}>
          ZO3 obrazac, prijava člana porodice na <em>zdravstveno osiguranje</em>
        </h1>
        <p className={styles.subtitle}>
          Kako ispuniti ZO3 obrazac? Prijavite supružnika, dijete ili roditelja na
          zdravstveno osiguranje u FBiH, popunite ZO3 obrazac online i preuzmite
          popunjeni PDF, besplatno i bez registracije.
        </p>
      </div>

      {/* ── Zaglavlje, Kanton, Zavod, Poslovnica ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Zaglavlje <em>obrasca</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Kanton FBiH</label>
            <StyledSelect
              ariaLabel="Kanton FBiH"
              wrapStyle={{ width: "100%" }}
              value={kanton}
              onChange={(v) => {
                setKanton(String(v ?? ""));
                setPoslovnica("");
              }}
              groups={[
                {
                  options: [
                    { value: "", label: "– Odaberite kanton –" },
                    ...KANTONI.map((k) => ({ value: k, label: k })),
                  ],
                },
              ]}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Poslovnica - Područni ured
            </label>
            <div className={styles.autocompleteWrap}>
              <input
                className={styles.fieldInput}
                placeholder={
                  kanton ? "Počnite kucati..." : "Prvo odaberite kanton"
                }
                disabled={!kanton}
                value={poslovnica}
                onChange={(e) => {
                  setPoslovnica(e.target.value);
                  setPoslovnicaOpen(true);
                }}
                onFocus={() => setPoslovnicaOpen(true)}
                onBlur={() => setTimeout(() => setPoslovnicaOpen(false), 150)}
              />
              {poslovnicaOpen && filteredPoslovnice.length > 0 && (
                <div className={styles.autocompleteList}>
                  {filteredPoslovnice.map((p) => (
                    <div
                      key={p}
                      className={styles.autocompleteItem}
                      onMouseDown={() => {
                        setPoslovnica(p);
                        setPoslovnicaOpen(false);
                      }}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Naziv i sjedište obveznika uplate doprinosa ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Naziv i sjedište <em>obveznika uplate doprinosa</em>
        </h2>
        <OrgFillSelect onFill={fillEmployer} />
        <div className={styles.fieldGrid}>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>
              Naziv i sjedište obveznika
            </label>
            <input
              className={styles.fieldInput}
              placeholder="Naziv firme / obrta i sjedište"
              value={employer.naziv}
              onChange={(e) =>
                setEmployer((s) => ({ ...s, naziv: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              1) Jedinstveni identifikacijski broj
            </label>
            <input
              className={styles.fieldInput}
              maxLength={13}
              inputMode="numeric"
              pattern="\d{13}"
              placeholder="JIB (13 cifara)"
              value={employer.jib}
              onInvalid={(e) => {
                const el = e.currentTarget;
                if (el.validity.patternMismatch || el.validity.tooShort)
                  el.setCustomValidity("JIB mora imati tačno 13 cifara.");
                else el.setCustomValidity("");
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setEmployer((s) => ({ ...s, jib: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              2) Registarski broj obv. uplate dop.
            </label>
            <input
              className={styles.fieldInput}
              placeholder="Registarski broj"
              inputMode="numeric"
              maxLength={10}
              value={employer.regBroj}
              onChange={(e) =>
                setEmployer((s) => ({
                  ...s,
                  regBroj: e.target.value.replace(/\D/g, "").slice(0, 10),
                }))
              }
            />
          </div>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>3) Šifra djelatnosti</label>
            <ShifraCombobox
              code={employer.sifraDjelatnosti}
              name={employer.nazivDjelatnosti}
              onChange={(code, name) =>
                setEmployer((s) => ({
                  ...s,
                  sifraDjelatnosti: code,
                  nazivDjelatnosti: name,
                }))
              }
              inputClassName={styles.fieldInput}
              codeLabel="Šifra"
              nameLabel="Naziv"
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              4) Radno vrijeme obveznika uplate dop. - sedmično
            </label>
            <input
              className={styles.fieldInput}
              placeholder="Npr. 40"
              inputMode="numeric"
              value={employer.radnoVrijeme}
              onChange={(e) =>
                setEmployer((s) => ({ ...s, radnoVrijeme: e.target.value }))
              }
            />
          </div>
        </div>
      </section>

      {/* ── Podaci o osiguraniku ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Podaci o <em>osiguraniku</em>
        </h2>
        <PersonFillSelect onFill={fillInsured} />
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>5) JMBG</label>
            <input
              className={styles.fieldInput}
              maxLength={13}
              minLength={13}
              inputMode="numeric"
              pattern="\d{13}"
              placeholder="Jedinstveni matični broj (13 cifara)"
              value={insured.jmbg}
              onInvalid={(e) => {
                const el = e.currentTarget;
                if (el.validity.patternMismatch || el.validity.tooShort)
                  el.setCustomValidity("JMBG mora imati tačno 13 cifara.");
                else el.setCustomValidity("");
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setInsured((s) => ({ ...s, jmbg: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup} />
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>6) Prezime</label>
            <input
              className={styles.fieldInput}
              placeholder="Prezime"
              value={insured.prezime}
              onChange={(e) =>
                setInsured((s) => ({ ...s, prezime: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>7) Ime</label>
            <input
              className={styles.fieldInput}
              placeholder="Ime"
              value={insured.ime}
              onChange={(e) =>
                setInsured((s) => ({ ...s, ime: e.target.value }))
              }
            />
          </div>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>
              8) Djevojačko prezime za udate
            </label>
            <input
              className={styles.fieldInput}
              placeholder="Djevojačko prezime (opciono)"
              value={insured.djevojackoPrezime}
              onChange={(e) =>
                setInsured((s) => ({
                  ...s,
                  djevojackoPrezime: e.target.value,
                }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              9) Ulica i broj prebivališta
            </label>
            <input
              className={styles.fieldInput}
              placeholder="Ulica i kućni broj"
              value={insured.ulicaBroj}
              onChange={(e) =>
                setInsured((s) => ({ ...s, ulicaBroj: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Grad prebivališta</label>
            <CitySelect
              value={insured.grad}
              onChange={(v) => {
                const postalCode = v ? findCity(v)?.postalCode ?? "" : "";
                setInsured((s) => ({
                  ...s,
                  grad: v,
                  brojPoste: postalCode || s.brojPoste,
                }));
              }}
              className={styles.fieldInput}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              10) Broj pošte prebivališta
            </label>
            <input
              className={styles.fieldInput}
              placeholder="Poštanski broj"
              inputMode="numeric"
              maxLength={5}
              value={insured.brojPoste}
              onChange={(e) =>
                setInsured((s) => ({
                  ...s,
                  brojPoste: e.target.value.replace(/\D/g, "").slice(0, 5),
                }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>11) Zanimanje</label>
            <input
              className={styles.fieldInput}
              placeholder="Naziv zanimanja"
              value={insured.zanimanje}
              onChange={(e) =>
                setInsured((s) => ({ ...s, zanimanje: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>11) Zanimanje, šifra</label>
            <input
              className={styles.fieldInput}
              placeholder="0000"
              inputMode="numeric"
              maxLength={4}
              value={insured.zamanjanjeKod}
              onChange={(e) =>
                setInsured((s) => ({
                  ...s,
                  zamanjanjeKod: e.target.value.replace(/\D/g, "").slice(0, 4),
                }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              12) Datum stupanja na rad
            </label>
            <DateInput
              className={styles.fieldInput}
              value={insured.datumStupanja}
              onValueChange={(iso) =>
                setInsured((s) => ({ ...s, datumStupanja: iso }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>13) Državljanstvo</label>
            <input
              className={styles.fieldInput}
              placeholder="Državljanstvo"
              value={insured.drzavljanstvo}
              onChange={(e) =>
                setInsured((s) => ({ ...s, drzavljanstvo: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              14) Radno vrijeme - sedmično
            </label>
            <input
              className={styles.fieldInput}
              placeholder="Npr. 40"
              inputMode="numeric"
              value={insured.radnoVrijeme}
              onChange={(e) =>
                setInsured((s) => ({ ...s, radnoVrijeme: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>15) Osnov osiguranja</label>
            <input
              className={styles.fieldInput}
              placeholder="Naziv osnova osiguranja"
              value={insured.osnovOsiguranja}
              onChange={(e) =>
                setInsured((s) => ({ ...s, osnovOsiguranja: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              15) Osnov osiguranja, šifra
            </label>
            <input
              className={styles.fieldInput}
              placeholder="00"
              inputMode="numeric"
              value={insured.osnovOsiguranjaKod}
              onChange={(e) =>
                setInsured((s) => ({
                  ...s,
                  osnovOsiguranjaKod: e.target.value,
                }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              16) Datum prestanka rada
            </label>
            <DateInput
              className={styles.fieldInput}
              value={insured.datumPrestanka}
              onValueChange={(iso) =>
                setInsured((s) => ({ ...s, datumPrestanka: iso }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>17) Datum promjene</label>
            <DateInput
              className={styles.fieldInput}
              value={insured.datumPromjene}
              onValueChange={(iso) =>
                setInsured((s) => ({ ...s, datumPromjene: iso }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>18) Vrsta promjene</label>
            <input
              className={styles.fieldInput}
              placeholder="Naziv vrste promjene"
              value={insured.vrstaPromjene}
              onChange={(e) =>
                setInsured((s) => ({ ...s, vrstaPromjene: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              18) Vrsta promjene, šifra
            </label>
            <input
              className={styles.fieldInput}
              placeholder="00"
              inputMode="numeric"
              value={insured.vrstaPromjeneKod}
              onChange={(e) =>
                setInsured((s) => ({
                  ...s,
                  vrstaPromjeneKod: e.target.value,
                }))
              }
            />
          </div>
        </div>
      </section>

      {/* ── Članovi porodice ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Podaci o članovima <em>porodice</em>
        </h2>
        <table className={styles.familyTable}>
          <thead>
            <tr>
              <th>R.br.</th>
              <th>JMBG</th>
              <th>Prezime i ime</th>
              <th>Srodstvo</th>
            </tr>
          </thead>
          <tbody>
            {familyMembers.map((m, i) => (
              <tr key={i}>
                <td>{19 + i}</td>
                <td>
                  <input
                    className={styles.familyInput}
                    maxLength={13}
                    inputMode="numeric"
                    placeholder="JMBG"
                    value={m.jmbg}
                    onChange={(e) => updateFamily(i, "jmbg", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    className={styles.familyInput}
                    placeholder="Prezime i ime"
                    value={m.fullName}
                    onChange={(e) =>
                      updateFamily(i, "fullName", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    className={styles.familyInput}
                    placeholder="Npr. supružnik, otac, kćerka..."
                    value={m.srodstvo}
                    onChange={(e) =>
                      updateFamily(i, "srodstvo", e.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── Napomena i potpis ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Napomena i <em>potpis</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>Napomena</label>
            <input
              className={styles.fieldInput}
              placeholder="Napomena (opciono)"
              value={napomena}
              onChange={(e) => setNapomena(e.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>U (mjesto)</label>
            <input
              className={styles.fieldInput}
              placeholder="Grad / mjesto"
              value={mjesto}
              onChange={(e) => setMjesto(e.target.value)}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Dana (datum)</label>
            <DateInput
              className={styles.fieldInput}
              value={datum}
              onValueChange={setDatum}
            />
          </div>
        </div>
      </section>

      {/* ── Export ── */}
      <div className={styles.actions}>
        <SaveToProfileButton
          type="ZO3"
          year={zo3Year}
          title={`ZO3 · ${insured.prezime || "obrazac"} · ${zo3Year ?? "?"}`}
          buildData={buildZo3Data}
          disabled={zo3Year === null}
          defaultOrganizationId={sourceOrgId}
          defaultClientId={sourceClientId}
        />
        <DugmePreuzimanja
          stranica="zo3"
          type="submit"
          className={styles.exportBtn}
          label="Preuzmi ZO3 PDF"
          ikona={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M12 3v12M7 10l5 5 5-5M5 20h14" />
            </svg>
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
          </svg>
          Preuzmi PDF
        </DugmePreuzimanja>
      </div>
      <p
        className={styles.izjavaText}
        style={{ textAlign: "center", marginTop: "2rem" }}
      >
        Napomena: Preporučuje se štampanje obrazca u dva primjerka.
      </p>
      <p className={styles.dataNapomena}>
        Porezni kalkulator ne zadržava popunjene podatke ni u kojem obliku.
        Nakon spremanja PDF dokumenta uvijek provjerite tačnost podataka.
      </p>

      {/* baner banke partnera ispod alata; na mobitelu glavno mjesto */}
      <ReklamaBanerIspod stranica="zo3" />

      {/* ── Edukativni sadržaj (SEO) ─────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Šta je ZO3 <em>obrazac</em>?
        </h2>
        <p>
          <strong>ZO3</strong> je obrazac <em>"Prijava o promjeni u tijeku
          osiguranja"</em> kojim osiguranik prijavljuje članove svoje porodice
          na zdravstveno osiguranje. Obrazac propisuju kantonalni zavodi
          zdravstvenog osiguranja u Federaciji BiH, a podnosi ga poslodavac na
          zahtjev radnika ili sam osiguranik (kod samostalnih djelatnosti).
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          Kao uzdržavani članovi porodice mogu se prijaviti:
        </p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>supružnik (bračni ili izvanbračni),</li>
          <li>maloljetna djeca, te punoljetna djeca na redovnom školovanju,</li>
          <li>djeca sa invaliditetom (bez obzira na uzrast),</li>
          <li>roditelji osiguranika koji ne ostvaruju zdravstveno po drugom osnovu.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Kako popuniti ZO3 obrazac u <em>3 koraka</em>
        </h2>
        <ol style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Unesite podatke o osiguraniku</strong>, ime i prezime,
            JMB, adresa, JIB poslodavca i naziv kantonalnog Zavoda zdravstvenog
            osiguranja. Registrovani korisnici imaju automatsku popunu.
          </li>
          <li>
            <strong>Unesite podatke o članu porodice</strong>, ime, prezime,
            JMB, srodstvo, datum stupanja na osiguranje. Za djecu na školovanju
            navedite školu/fakultet i razred/godinu studija.
          </li>
          <li>
            <strong>Preuzmite popunjeni ZO3 PDF</strong> u 2 primjerka i
            priložite dokaznu dokumentaciju (rodni list, izvod iz matične knjige
            vjenčanih, dokaz o redovnom školovanju, itd.).
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dokumentacija uz <em>ZO3 obrazac</em>
        </h2>
        <p>
          Uz popunjeni i potpisani ZO3 obrazac, kantonalni Zavod zdravstvenog
          osiguranja traži dokaze o srodstvu i statusu uzdržavanog člana:
        </p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Za supružnika:</strong> izvod iz matične knjige vjenčanih
            (ne stariji od 6 mjeseci) + uvjerenje da nije osiguran po drugom
            osnovu.
          </li>
          <li>
            <strong>Za dijete:</strong> rodni list, te (za djecu starija od 15
            godina) potvrda o redovnom školovanju.
          </li>
          <li>
            <strong>Za roditelja:</strong> rodni list osiguranika + uvjerenje
            roditelja o nezaposlenosti i ne-osiguranju po drugom osnovu.
          </li>
        </ul>
        <p style={{ marginTop: "0.85rem" }}>
          Tačan spisak dokumenata varira po kantonima, provjerite kod svog
          Zavoda (USK, KS, TK, ZDK, SBK, HNK, BPK, K10, ZHK, PK).
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Kada i gdje <em>predati</em> ZO3?
        </h2>
        <p>
          ZO3 obrazac se predaje <strong>u nadležnoj kantonalnoj ispostavi
          Zavoda zdravstvenog osiguranja</strong> prema mjestu prebivališta
          osiguranika. Predaje se u dva primjerka, jedan ostaje u Zavodu, drugi
          kao potvrda osiguraniku.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          <strong>Rokovi:</strong> prijava se vrši u roku od 8 dana od nastanka
          promjene (npr. sklapanja braka, rođenja djeteta, prestanka
          osiguranja po drugom osnovu). Nepravovremena prijava može dovesti do
          gubitka prava na zdravstvenu zaštitu za uzdržavanog člana u tom
          periodu.
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
            uzdržavani članovi porodice ostvaruju pravo na dodatni lični odbitak
            u GPD-1051.
          </li>
          <li>
            <a href="/preracun-neto-bruto" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Preračun neto/bruto plate
            </a>,{" "}
            provjera obračunatog doprinosa za zdravstveno osiguranje.
          </li>
          <li>
            <a href="/prijave-radnika" style={{ color: "var(--sage)", fontWeight: 600 }}>
              JS3100, prijava/odjava radnika
            </a>,{" "}
            prijava radnika na obavezno zdravstveno osiguranje.
          </li>
        </ul>
      </section>

      <FaqSection
        items={[
          {
            q: "Šta je ZO3 obrazac?",
            a: "ZO3 je obrazac 'Prijava o promjeni u tijeku osiguranja' koji se koristi za prijavu članova porodice na zdravstveno osiguranje osiguranika. Putem ovog obrasca možete dodati supružnika, djecu ili roditelje na svoje zdravstveno osiguranje.",
          },
          {
            q: "Ko može biti prijavljen kao član porodice na zdravstveno osiguranje?",
            a: "Na zdravstveno osiguranje kao uzdržavani članovi porodice mogu se prijaviti: supružnik, djeca (maloljetna ili na redovnom školovanju), te roditelji osiguranika, ukoliko to pravo ne ostvaruju po drugom osnovu (npr. kroz vlastito zaposlenje ili penziju).",
          },
          {
            q: "Kako se podnosi ZO3 obrazac?",
            a: "ZO3 obrazac podnosi poslodavac na zahtjev osiguranika, u dva primjerka, nadležnoj regionalnoj ispostavi Zavoda zdravstvenog osiguranja. Uz obrazac je potrebno priložiti odgovarajuću dokumentaciju zavisno od vrste člana porodice koji se prijavljuje.",
          },
          {
            q: "Koja dokumentacija je potrebna uz ZO3 obrazac?",
            a: "Uz popunjeni i ovjereni ZO3 obrazac potrebno je priložiti dokumentaciju koja dokazuje srodstvo i uzdržavanje, npr. izvod iz matične knjige vjenčanih za supružnika, rodni list za djecu, te dokaz da član porodice nema zdravstveno osiguranje po drugom osnovu.",
          },
          {
            q: "Gdje mogu preuzeti ZO3 obrazac?",
            a: "ZO3 obrazac dostupan je za preuzimanje na web stranicama kantonalnih zavoda zdravstvenog osiguranja. Na našoj stranici možete ga popuniti online i preuzeti u PDF formatu.",
          },
        ]}
      />
      {/* bočni stubovi banke partnera, izvan okvira obrasca (od 1440px) */}
      <ReklamaStub stranica="zo3" strana="lijevo" raspored="fiksno" />
      <ReklamaStub stranica="zo3" strana="desno" raspored="fiksno" />
    </form>
  );
}
