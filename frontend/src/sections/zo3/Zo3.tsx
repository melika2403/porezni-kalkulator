"use client";
import { useState, useCallback, useRef, useMemo } from "react";
import styles from "./zo3.module.css";
import { fillZo3Template, type Zo3Data } from "src/sections/zo3/fillZo3";

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
  const formRef = useRef<HTMLFormElement | null>(null);

  /* ── Header ── */
  const [kanton, setKanton] = useState("");
  const [poslovnica, setPoslovnica] = useState("");
  const [poslovnicaOpen, setPoslovnicaOpen] = useState(false);

  /* ── Obveznik uplate doprinosa ── */
  const [employer, setEmployer] = useState({
    naziv: "",
    jib: "",
    regBroj: "",
    sifraDjelatnosti: "",
    radnoVrijeme: "",
  });

  /* ── Podaci o osiguraniku ── */
  const [insured, setInsured] = useState({
    jmbg: "",
    prezime: "",
    ime: "",
    djevojackoPrezime: "",
    ulicaBroj: "",
    brojPoste: "",
    zanimanje: "",
    datumStupanja: "",
    drzavljanstvo: "",
    radnoVrijeme: "",
    osnovOsiguranja: "",
    datumPrestanka: "",
    datumPromjene: "",
    vrstaPromjene: "",
  });

  /* ── Članovi porodice ── */
  const [familyMembers, setFamilyMembers] = useState(() =>
    Array.from({ length: 10 }, () => ({ ...EMPTY_MEMBER })),
  );

  /* ── Footer ── */
  const [napomena, setNapomena] = useState("");
  const [mjesto, setMjesto] = useState("");
  const [datum, setDatum] = useState(() => getTodayIsoString());

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

  const exportPdf = useCallback(async () => {
    const data: Zo3Data = {
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
      datumStupanja: isoToCompact(insured.datumStupanja),
      drzavljanstvo: insured.drzavljanstvo,
      radnoVrijemeRadno: insured.radnoVrijeme,
      osnovOsiguranja: insured.osnovOsiguranja,
      datumPrestanka: isoToCompact(insured.datumPrestanka),
      datumPromjene: isoToCompact(insured.datumPromjene),
      vrstaPromjene: insured.vrstaPromjene,

      familyMembers: familyMembers.filter(
        (m) => m.jmbg || m.fullName || m.srodstvo,
      ),

      napomena,
      mjesto,
      datum: isoToFormatted(datum),
    };

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
    a.download = `ZO3_${insured.prezime || "obrazac"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
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
    <form ref={formRef} className={styles.page} onSubmit={onSubmit}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.label}>Obrazac ZO 3</div>
        <h1 className={styles.h1}>
          Prijava o promjeni u tijeku <em>osiguranja</em>
        </h1>
        <p className={styles.subtitle}>
          Popunite podatke i preuzmite popunjeni obrazac u PDF formatu.
        </p>
      </div>

      {/* ── Zaglavlje — Kanton, Zavod, Poslovnica ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Zaglavlje <em>obrasca</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Kanton FBiH</label>
            <select
              className={styles.fieldSelect}
              value={kanton}
              onChange={(e) => {
                setKanton(e.target.value);
                setPoslovnica("");
              }}
            >
              <option value="">— Odaberite kanton —</option>
              {KANTONI.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
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
              value={employer.regBroj}
              onChange={(e) =>
                setEmployer((s) => ({ ...s, regBroj: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>3) Šifra djelatnosti</label>
            <input
              className={styles.fieldInput}
              placeholder="Šifra djelatnosti"
              value={employer.sifraDjelatnosti}
              onChange={(e) =>
                setEmployer((s) => ({
                  ...s,
                  sifraDjelatnosti: e.target.value,
                }))
              }
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
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
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
            <label className={styles.fieldLabel}>
              10) Broj pošte prebivališta
            </label>
            <input
              className={styles.fieldInput}
              placeholder="Poštanski broj"
              inputMode="numeric"
              value={insured.brojPoste}
              onChange={(e) =>
                setInsured((s) => ({ ...s, brojPoste: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>11) Zanimanje</label>
            <input
              className={styles.fieldInput}
              placeholder="Zanimanje"
              value={insured.zanimanje}
              onChange={(e) =>
                setInsured((s) => ({ ...s, zanimanje: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              12) Datum stupanja na rad
            </label>
            <input
              className={styles.fieldInput}
              type="date"
              value={insured.datumStupanja}
              onChange={(e) =>
                setInsured((s) => ({ ...s, datumStupanja: e.target.value }))
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
              placeholder="Osnov osiguranja"
              value={insured.osnovOsiguranja}
              onChange={(e) =>
                setInsured((s) => ({ ...s, osnovOsiguranja: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              16) Datum prestanka rada
            </label>
            <input
              className={styles.fieldInput}
              type="date"
              value={insured.datumPrestanka}
              onChange={(e) =>
                setInsured((s) => ({ ...s, datumPrestanka: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>17) Datum promjene</label>
            <input
              className={styles.fieldInput}
              type="date"
              value={insured.datumPromjene}
              onChange={(e) =>
                setInsured((s) => ({ ...s, datumPromjene: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>18) Vrsta promjene</label>
            <input
              className={styles.fieldInput}
              placeholder="Vrsta promjene"
              value={insured.vrstaPromjene}
              onChange={(e) =>
                setInsured((s) => ({ ...s, vrstaPromjene: e.target.value }))
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
                    placeholder="Npr. mama, tata, dijete..."
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
            <input
              className={styles.fieldInput}
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── Export ── */}
      <div className={styles.actions}>
        <button type="submit" className={styles.exportBtn}>
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
        </button>
      </div>
    </form>
  );
}
