"use client";

import { useMemo, useState } from "react";
import styles from "./uod.module.css";
import {
  calcFromBruto,
  calcFromNeto,
  VRSTA_OPTIONS,
  nettoBrutoMultiplier,
  type VrstaNaknade,
} from "./uodCalc";
import { fillUodUplatnice } from "./fillUodUplatnice";
import { KANTONI, type KantonKey } from "src/sections/ams/fillUplatnica";
import DateInput from "src/components/DateInput/DateInput";
import { iznosUSlova } from "./iznosSlovima";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import SaveToProfileButton from "src/components/SaveToProfileButton/SaveToProfileButton";
import { fillUodDocx, type UodTemplateData } from "./fillUodDocx";
import { fillUodPdf } from "./fillUodPdf";
import { fillAug1031 } from "./fillAug1031";
import UgovorFillSelect from "src/components/PersonFillSelect/UgovorFillSelect";
import { useCityLookup } from "src/hooks/useCities";
import { formatAddress } from "src/utils/formatAddress";
import FaqSection from "src/components/FaqSection/FaqSection";
import GeneratePaywall from "src/components/GeneratePaywall/GeneratePaywall";
import PreviewRegisterGate from "src/components/PreviewRegisterGate/PreviewRegisterGate";
import { useNotice } from "src/components/Notice/Notice";

type Mode = "neto" | "bruto";

// Format number as "1.000,00 KM"
const fmtKm = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " KM";

// Parse user input "1.000,00" or "1000" → 1000
const parseAmount = (s: string): number => {
  if (!s) return 0;
  const cleaned = s.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

// XXX-XXX-XXXXXXXX-XX (16 digits with dashes)
const formatZiroRacun = (raw: string): string => {
  const d = raw.replace(/\D/g, "").slice(0, 16);
  const parts = [
    d.slice(0, 3),
    d.slice(3, 6),
    d.slice(6, 14),
    d.slice(14, 16),
  ].filter(Boolean);
  return parts.join("-");
};

// Digits only, max 13
const formatJib = (raw: string): string => raw.replace(/\D/g, "").slice(0, 13);

const IconDownload = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3" />
  </svg>
);

const IconReceipt = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 3h14v18l-2.5-2-2.5 2-2.5-2-2.5 2L5 21z" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </svg>
);

const IconCard = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18M7 15h3" />
  </svg>
);

// Format number to display in input: "1.000,00"
const formatAmountForInput = (s: string): string => {
  if (!s) return "";
  // Allow user to type freely while having decimal entry
  // Split on comma; format integer part with dots
  const parts = s.replace(/\./g, "").split(",");
  const intPart = parts[0].replace(/\D/g, "");
  const intFmt = intPart ? Number(intPart).toLocaleString("de-DE") : "";
  if (parts.length === 1) return intFmt;
  const decPart = parts[1].replace(/\D/g, "").slice(0, 2);
  return `${intFmt},${decPart}`;
};

// Faza 3B: korisnik vidi formu ako (a) ima BUSINESS plan, ili (b) je član bilo
// koje organizacije čiji je vlasnik BUSINESS. ADMIN super-admin uvijek prolazi.
// Sam DOCX/PDF se generišu lokalno; Save-to-profile zove backend koji dodatno
// gating-uje po owner-tier-u kad ima organizationId.
export default function UgovorODjelu() {
  const { tier, hasAccessToTier, isLoading } = useMaxAccessibleTier();
  if (isLoading) return null;
  if (!hasAccessToTier("BUSINESS")) {
    return <UgovorODjeluGate role={tier} />;
  }
  return <UgovorODjeluApp />;
}

function UgovorODjeluGate() {
  return (
    <PreviewRegisterGate
      pageLabel="Ugovori"
      pageTitle={
        <>
          Ugovor o djelu — kalkulator i <em>predložak</em>
        </>
      }
      pageSubtitle="Kalkulator NETO↔BRUTO sa porezima i doprinosima, predložak ugovora i 6 uplatnica spremnih za banku."
      featureName="ugovora o djelu"
      previewDesc="izračunati neto/bruto, vidjeti obračun poreza i doprinosa, popuniti podatke izvršioca i naručioca"
      proUnlocks="Preuzimanje predloška ugovora i 6 uplatnica"
      tier="BUSINESS"
    />
  );
}

function UgovorODjeluApp() {
  const { hasRole } = useRole();
  const canGenerate = hasRole("BUSINESS", "ADMIN");
  const { findByName: findCity } = useCityLookup();
  const { notify } = useNotice();
  const [mode, setMode] = useState<Mode>("neto");
  const [vrsta, setVrsta] = useState<VrstaNaknade>("standard");
  const [iznosStr, setIznosStr] = useState("1.000,00");

  const troskoviPct = VRSTA_OPTIONS[vrsta].troskoviPct;

  // Naručilac
  const [naruciIme, setNaruciIme] = useState("");
  const [naruciAdresa, setNaruciAdresa] = useState("");
  const [naruciId, setNaruciId] = useState("");

  // Izvršilac
  const [izvrIme, setIzvrIme] = useState("");
  const [izvrAdresa, setIzvrAdresa] = useState("");
  const [izvrJmbg, setIzvrJmbg] = useState("");

  // Ostalo
  const [predmet, setPredmet] = useState("");
  const [datum, setDatum] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [rok, setRok] = useState("");
  const [mjestoZakljucenja, setMjestoZakljucenja] = useState("");
  const [brojUgovora, setBrojUgovora] = useState("");
  const [izvrZiro, setIzvrZiro] = useState("");
  const [nadlezniSud, setNadlezniSud] = useState("");

  // Uplatnice
  const [naruciZiro, setNaruciZiro] = useState("");
  const [kantonKey, setKantonKey] = useState<KantonKey | "">("");
  const [opcinaKod, setOpcinaKod] = useState<string>("");
  const [generatingUplatnice, setGeneratingUplatnice] = useState(false);

  // Derive period (mjesec/godina) from datum
  const periodMjesec =
    datum?.slice(5, 7) ?? String(new Date().getMonth() + 1).padStart(2, "0");
  const periodGodina = datum?.slice(0, 4) ?? String(new Date().getFullYear());

  const opcine = kantonKey ? KANTONI[kantonKey].opcine : [];
  const opcinaIme = opcine.find((o) => o.kod === opcinaKod)?.ime ?? "";

  const handleKantonChange = (k: KantonKey | "") => {
    setKantonKey(k);
    setOpcinaKod("");
  };

  // Try to map a city name to (kantonKey, opcinaKod)
  const findKantonAndOpcina = (
    city: string,
  ): { kantonKey: KantonKey; opcinaKod: string } | null => {
    if (!city) return null;
    const target = city.trim().toLowerCase();
    for (const k of Object.keys(KANTONI) as KantonKey[]) {
      const found = KANTONI[k].opcine.find(
        (o) =>
          o.ime.toLowerCase() === target ||
          target.includes(o.ime.toLowerCase()),
      );
      if (found) return { kantonKey: k, opcinaKod: found.kod };
    }
    return null;
  };

  const formatDatumDDMMYYYY = (iso: string): string => {
    if (!iso) return "";
    const [y, m, d] = iso.slice(0, 10).split("-");
    if (!y || !m || !d) return "";
    return `${d}.${m}.${y}`;
  };

  const buildTemplateData = (): UodTemplateData => ({
    brojUgovora,
    datumFormatted: formatDatumDDMMYYYY(datum),
    mjestoZakljucenja,
    naruciIme,
    naruciAdresa,
    naruciId,
    izvrIme,
    izvrAdresa,
    izvrJmbg,
    izvrZiro,
    predmet,
    rok,
    netoFmt: fmtKm(calc.neto).replace(" KM", ""),
    iznosSlovima: iznosUSlova(calc.neto),
    nadlezniSud,
  });

  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingAug, setGeneratingAug] = useState(false);
  const [showAugInfo, setShowAugInfo] = useState(false);

  const handleDownloadDocx = async () => {
    if (!canGenerate) return;
    setGeneratingDocx(true);
    try {
      const blob = await fillUodDocx(buildTemplateData());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ugovor-o-djelu${brojUgovora ? "_" + brojUgovora.replace(/\//g, "-") : ""}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notify("Greška pri generisanju DOCX-a: " + (e as Error).message, "error");
    } finally {
      setGeneratingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!canGenerate) return;
    setGeneratingPdf(true);
    try {
      const bytes = await fillUodPdf(buildTemplateData());
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Ugovor-o-djelu${brojUgovora ? "_" + brojUgovora.replace(/\//g, "-") : ""}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notify("Greška pri generisanju PDF-a: " + (e as Error).message, "error");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadAug = async () => {
    if (!canGenerate) return;
    if (!naruciIme || !naruciId) {
      notify("Unesite naziv i JIB naručioca.", "error");
      return;
    }
    if (!izvrIme || !izvrJmbg) {
      notify("Unesite ime i JMBG izvršioca.", "error");
      return;
    }
    setGeneratingAug(true);
    try {
      const bytes = await fillAug1031({
        naruciIme,
        naruciAdresa,
        naruciId,
        izvrIme,
        izvrJmbg,
        datum,
        vrsta,
        brutoPrihod: calc.bruto,
        rashodi: calc.priznatiTroskovi,
        dohodak: calc.brutoUmanjenZaTroskove,
        zdravstveno: calc.zdravstveno,
        osnovicaPorez: calc.osnovicaZaPorez,
        porez: calc.porez,
        pio: calc.pio,
      });
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AUG-1031${brojUgovora ? "_" + brojUgovora.replace(/\//g, "-") : ""}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notify(
        "Greška pri generisanju AUG-1031: " + (e as Error).message,
        "error",
      );
    } finally {
      setGeneratingAug(false);
    }
  };

  const handleDownloadUplatnice = async () => {
    if (!canGenerate) return;
    if (!naruciIme) {
      notify("Unesite naziv naručioca.", "error");
      return;
    }
    if (!naruciId || naruciId.length !== 13) {
      notify("JIB / ID broj naručioca mora imati 13 cifara.", "error");
      return;
    }
    if (!kantonKey) {
      notify("Odaberite kanton naručioca.", "error");
      return;
    }
    if (!opcinaKod) {
      notify("Odaberite općinu naručioca.", "error");
      return;
    }
    setGeneratingUplatnice(true);
    try {
      const bytes = await fillUodUplatnice({
        naruciNaziv: naruciIme,
        naruciAdresa: naruciAdresa,
        naruciId,
        naruciZiroRacun: naruciZiro || undefined,
        kantonKey: kantonKey as KantonKey,
        opcinaKod,
        opcinaIme,
        zdravstvenoKanton: calc.zdravstvenoKanton,
        zdravstvenoFbih: calc.zdravstvenoFbih,
        porez: calc.porez,
        pio: calc.pio,
        zastita: calc.zastita,
        voda: calc.voda,
        datum,
        periodMjesec,
        periodGodina,
      });
      const blob = new Blob([new Uint8Array(bytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Uplatnice_UoD_${periodMjesec}_${periodGodina}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingUplatnice(false);
    }
  };

  const iznos = parseAmount(iznosStr);
  const calc = useMemo(() => {
    const c =
      mode === "neto"
        ? calcFromNeto(iznos, troskoviPct)
        : calcFromBruto(iznos, troskoviPct);
    // When user knows the NET amount, keep the exact input as displayed neto
    // (avoids rounding drift like 1000 → 999.99)
    if (mode === "neto" && iznos > 0) {
      const naknadaZaIsplatu = Math.round(iznos * 100) / 100;
      const zastita = Math.round(naknadaZaIsplatu * 0.005 * 100) / 100;
      const voda = Math.round(naknadaZaIsplatu * 0.005 * 100) / 100;
      const ukupniTroskovi =
        Math.round((c.bruto + c.pio + zastita + voda) * 100) / 100;
      return {
        ...c,
        neto: naknadaZaIsplatu,
        naknadaZaIsplatu,
        zastita,
        voda,
        ukupniTroskovi,
        porezDoprinosNaNetoPct:
          Math.round(
            ((ukupniTroskovi - naknadaZaIsplatu) / naknadaZaIsplatu) * 10000,
          ) / 100,
      };
    }
    return c;
  }, [mode, iznos, troskoviPct]);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.label}>Ugovori</p>
        <h1 className={styles.h1}>
          Ugovor o djelu (FBiH) — kalkulator poreza i <em>predložak</em>
        </h1>
        <p className={styles.subtitle}>
          Kako popuniti ugovor o djelu u FBiH? Online kalkulator poreza i
          doprinosa (NETO ↔ BRUTO), automatski obračun PIO, zdravstva i zaštite,
          predložak ugovora u Word i PDF formatu te 6 uplatnica spremnih za
          banku — besplatno i bez registracije.
        </p>
      </div>

      {/* Mode toggle + iznos */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Iznos <em>naknade</em>
        </h2>
        <div className={styles.fieldGrid} style={{ marginBottom: "1rem" }}>
          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.fieldLabel}>Vrsta naknade</span>
            <select
              className={styles.input}
              value={vrsta}
              onChange={(e) => setVrsta(e.target.value as VrstaNaknade)}
            >
              {(Object.keys(VRSTA_OPTIONS) as VrstaNaknade[]).map((k) => (
                <option key={k} value={k}>
                  {VRSTA_OPTIONS[k].label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.modeRow}>
          <div className={styles.modeChips}>
            <button
              type="button"
              className={`${styles.modeChip} ${mode === "neto" ? styles.modeChipActive : ""}`}
              onClick={() => setMode("neto")}
            >
              Poznat NETO
            </button>
            <button
              type="button"
              className={`${styles.modeChip} ${mode === "bruto" ? styles.modeChipActive : ""}`}
              onClick={() => setMode("bruto")}
            >
              Poznat BRUTO
            </button>
          </div>

          <div className={styles.amountWrap}>
            <input
              className={styles.amountInput}
              type="text"
              inputMode="decimal"
              value={iznosStr}
              onChange={(e) =>
                setIznosStr(formatAmountForInput(e.target.value))
              }
              placeholder="0,00"
            />
            <span className={styles.amountSuffix}>KM</span>
          </div>
        </div>
      </section>

      {/* Calc results */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Obračun <em>ugovora o djelu</em>
        </h2>
        <div className={styles.calcGrid}>
          <table className={styles.calcTable}>
            <tbody>
              <tr>
                <td>1</td>
                <td>Neto iznos naknade</td>
                <td className={styles.calcVal}>{fmtKm(calc.neto)}</td>
              </tr>
              <tr>
                <td>2</td>
                <td>
                  Bruto iznos UoD{" "}
                  <span className={styles.calcFormula}>
                    (rb. 1 ×{" "}
                    {nettoBrutoMultiplier(troskoviPct)
                      .toFixed(6)
                      .replace(".", ",")}
                    )
                  </span>
                </td>
                <td className={styles.calcVal}>{fmtKm(calc.bruto)}</td>
              </tr>
              <tr className={styles.calcDeduction}>
                <td>3</td>
                <td>Priznati troškovi {(troskoviPct * 100).toFixed(0)}%</td>
                <td className={styles.calcVal}>
                  {fmtKm(calc.priznatiTroskovi)}
                </td>
              </tr>
              <tr>
                <td>4</td>
                <td>Bruto naknada umanjena za troškove</td>
                <td className={styles.calcVal}>
                  {fmtKm(calc.brutoUmanjenZaTroskove)}
                </td>
              </tr>
              <tr className={styles.calcDeduction}>
                <td>5</td>
                <td>Doprinos za zdravstveno 4%</td>
                <td className={styles.calcVal}>{fmtKm(calc.zdravstveno)}</td>
              </tr>
              <tr>
                <td>6</td>
                <td>Osnovica za porez</td>
                <td className={styles.calcVal}>
                  {fmtKm(calc.osnovicaZaPorez)}
                </td>
              </tr>
              <tr>
                <td>7</td>
                <td>Porez na dohodak 10%</td>
                <td className={styles.calcVal}>{fmtKm(calc.porez)}</td>
              </tr>
              <tr>
                <td>8</td>
                <td>Naknada po odbitku zdravstva i poreza</td>
                <td className={styles.calcVal}>
                  {fmtKm(calc.naknadaPoOdbitku)}
                </td>
              </tr>
              <tr>
                <td>9</td>
                <td>Priznati troškovi (vraćeni)</td>
                <td className={styles.calcVal}>
                  {fmtKm(calc.priznatiTroskovi)}
                </td>
              </tr>
              <tr className={styles.calcHighlight}>
                <td>10</td>
                <td>Naknada za isplatu</td>
                <td className={styles.calcVal}>
                  {fmtKm(calc.naknadaZaIsplatu)}
                </td>
              </tr>
              <tr className={styles.calcDeduction}>
                <td>11</td>
                <td>PIO 6% (na teret naručioca)</td>
                <td className={styles.calcVal}>{fmtKm(calc.pio)}</td>
              </tr>
              <tr className={styles.calcDeduction}>
                <td>12</td>
                <td>Zaštita od prirodnih nepogoda 0,5%</td>
                <td className={styles.calcVal}>{fmtKm(calc.zastita)}</td>
              </tr>
              <tr className={styles.calcDeduction}>
                <td>13</td>
                <td>Opšta vodna naknada 0,5%</td>
                <td className={styles.calcVal}>{fmtKm(calc.voda)}</td>
              </tr>
              <tr className={styles.calcTotal}>
                <td>14</td>
                <td>Ukupni troškovi naručioca</td>
                <td className={styles.calcVal}>{fmtKm(calc.ukupniTroskovi)}</td>
              </tr>
              <tr>
                <td>15</td>
                <td>Isplata izvršiocu</td>
                <td className={styles.calcVal}>{fmtKm(calc.neto)}</td>
              </tr>
              <tr>
                <td>16</td>
                <td>Porezi i doprinosi (% na neto)</td>
                <td className={styles.calcVal}>
                  {calc.porezDoprinosNaNetoPct.toFixed(2).replace(".", ",")}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Stranke */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Ugovorne <em>strane</em>
        </h2>

        <div className={styles.partyGrid}>
          <div className={styles.party}>
            <h3 className={styles.partyTitle}>Naručilac (poslodavac)</h3>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Popuni naručioca</span>
              <UgovorFillSelect
                onFill={({ name, address, city, id, bankAccount }) => {
                  setNaruciIme(name);
                  setNaruciAdresa(
                    formatAddress(address, city, findCity(city)?.postalCode),
                  );
                  setNaruciId(id);
                  if (bankAccount) setNaruciZiro(bankAccount);
                  const ko = findKantonAndOpcina(city);
                  if (ko) {
                    setKantonKey(ko.kantonKey);
                    setOpcinaKod(ko.opcinaKod);
                  }
                }}
              />
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Naziv / ime i prezime</span>
              <input
                className={styles.input}
                value={naruciIme}
                onChange={(e) => setNaruciIme(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Adresa</span>
              <input
                className={styles.input}
                value={naruciAdresa}
                onChange={(e) => setNaruciAdresa(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>JIB / ID broj</span>
              <input
                className={styles.input}
                value={naruciId}
                onChange={(e) => setNaruciId(formatJib(e.target.value))}
                inputMode="numeric"
                maxLength={13}
              />
            </label>
          </div>

          <div className={styles.party}>
            <h3 className={styles.partyTitle}>Izvršilac (radnik)</h3>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Popuni izvršioca</span>
              <UgovorFillSelect
                onFill={({ name, address, city, id, bankAccount }) => {
                  setIzvrIme(name);
                  setIzvrAdresa(
                    formatAddress(address, city, findCity(city)?.postalCode),
                  );
                  setIzvrJmbg(id);
                  if (bankAccount) setIzvrZiro(bankAccount);
                }}
              />
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Ime i prezime</span>
              <input
                className={styles.input}
                value={izvrIme}
                onChange={(e) => setIzvrIme(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Adresa</span>
              <input
                className={styles.input}
                value={izvrAdresa}
                onChange={(e) => setIzvrAdresa(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>JMBG</span>
              <input
                className={styles.input}
                value={izvrJmbg}
                onChange={(e) => setIzvrJmbg(formatJib(e.target.value))}
                inputMode="numeric"
                maxLength={13}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>
                Žiro račun (transakcijski)
              </span>
              <input
                className={styles.input}
                value={izvrZiro}
                onChange={(e) => setIzvrZiro(formatZiroRacun(e.target.value))}
                inputMode="numeric"
                placeholder="XXX-XXX-XXXXXXXX-XX"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Predmet i rokovi */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Predmet ugovora i <em>rokovi</em>
        </h2>
        <div className={styles.fieldGrid}>
          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.fieldLabel}>
              Opis posla / predmet ugovora
            </span>
            <textarea
              className={styles.textarea}
              rows={3}
              value={predmet}
              onChange={(e) => setPredmet(e.target.value)}
              placeholder="Npr. izradi web stranicu prema specifikaciji, izvrši teoretsku obuku u autoškoli..."
            />
            <p className={styles.hint}>
              Tekst se direktno nadovezuje na &ldquo;Izvršilac posla
              prihvata...&rdquo; — započnite glagolom (&ldquo;izvrši&rdquo;,
              &ldquo;izradi&rdquo;, &ldquo;obavi&rdquo;).
            </p>
          </label>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Datum zaključenja</span>
            <DateInput
              className={styles.input}
              value={datum}
              onValueChange={setDatum}
            />
          </div>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Rok izvršenja</span>
            <input
              className={styles.input}
              value={rok}
              onChange={(e) => setRok(e.target.value)}
              placeholder="Npr. 30 dana od potpisivanja"
            />
          </label>
        </div>
      </section>

      {/* Detalji ugovora */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Detalji <em>ugovora</em>
        </h2>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Broj ugovora</span>
            <input
              className={styles.input}
              value={brojUgovora}
              onChange={(e) => setBrojUgovora(e.target.value)}
              placeholder="Npr. 12/2026"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Mjesto zaključenja</span>
            <input
              className={styles.input}
              value={mjestoZakljucenja}
              onChange={(e) => setMjestoZakljucenja(e.target.value)}
              placeholder="Npr. Sarajevo"
            />
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.fieldLabel}>Iznos slovima (auto)</span>
            <input
              className={styles.input}
              value={iznosUSlova(calc.neto)}
              readOnly
              tabIndex={-1}
            />
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.fieldLabel}>
              Nadležni sud (u slučaju spora)
            </span>
            <input
              className={styles.input}
              value={nadlezniSud}
              onChange={(e) => setNadlezniSud(e.target.value)}
              placeholder="Npr. Općinski sud u Sarajevu"
            />
          </label>
        </div>
      </section>

      {/* Ugovor download buttons */}
      {!canGenerate && (
        <GeneratePaywall tier="BUSINESS" what="Generisanje ugovora o djelu" />
      )}
      <div className={`${styles.actions} ${styles.actionsCenter}`}>
        <SaveToProfileButton
          type="UOD"
          year={parseInt(periodGodina) || new Date().getFullYear()}
          month={parseInt(periodMjesec) || null}
          title={`Ugovor o djelu · ${naruciIme || "Naručilac"} → ${izvrIme || "Izvršilac"}${brojUgovora ? ` · ${brojUgovora}` : ""}`}
          buildData={() => ({
            // Snapshot cijele forme kao JSON — može se kasnije re-renderovati
            mode,
            vrsta,
            iznosStr,
            naruciIme,
            naruciAdresa,
            naruciId,
            naruciZiro,
            izvrIme,
            izvrAdresa,
            izvrJmbg,
            izvrZiro,
            predmet,
            datum,
            rok,
            mjestoZakljucenja,
            brojUgovora,
            nadlezniSud,
            kantonKey,
            opcinaKod,
            calc,
          })}
          disabled={!naruciIme || !izvrIme}
        />
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleDownloadDocx}
          disabled={generatingDocx || !canGenerate}
          title={canGenerate ? undefined : "Dostupno uz Business pretplatu"}
        >
          {IconDownload}{" "}
          {generatingDocx ? "Generišem…" : "Preuzmi ugovor (DOCX)"}
        </button>
        <button
          type="button"
          className={styles.btnOutline}
          onClick={handleDownloadPdf}
          disabled={generatingPdf || !canGenerate}
          title={canGenerate ? undefined : "Dostupno uz Business pretplatu"}
        >
          {IconDownload} {generatingPdf ? "Generišem…" : "Preuzmi ugovor (PDF)"}
        </button>
        <div className={styles.augWrap}>
          <button
            type="button"
            className={styles.btnOutline}
            onClick={handleDownloadAug}
            disabled={generatingAug || !canGenerate}
            title={canGenerate ? undefined : "Dostupno uz Business pretplatu"}
          >
            {IconReceipt}{" "}
            {generatingAug ? "Generišem…" : "Preuzmi AUG-1031 (PDF)"}
          </button>
          <button
            type="button"
            className={styles.augInfoBtn}
            onClick={() => setShowAugInfo((v) => !v)}
            aria-label="Šta je AUG-1031?"
            aria-expanded={showAugInfo}
          >
            ?
          </button>
          {showAugInfo && (
            <div className={styles.augInfoPopover} role="dialog">
              <button
                type="button"
                className={styles.augInfoClose}
                onClick={() => setShowAugInfo(false)}
                aria-label="Zatvori"
              >
                ×
              </button>
              <strong>Šta je AUG-1031?</strong>
              <p>
                AUG-1031 je obrazac &ldquo;Akontacija poreza po odbitku za
                povremene samostalne djelatnosti&rdquo; koji naručilac
                (isplatilac) popunjava i{" "}
                <strong>obavezno uručuje izvršiocu</strong> uz isplatu naknade
                po ugovoru o djelu.
              </p>
              <p>
                Obrazac sadrži sve podatke o isplaćenom prihodu, priznatim
                rashodima, doprinosu za zdravstveno, porezu na dohodak i PIO
                doprinosu.
              </p>
              <p>
                Izvršilac ga koristi pri podnošenju{" "}
                <strong>godišnje prijave dohotka (GPD-1051)</strong> na kraju
                godine kao dokaz o uplaćenoj akontaciji poreza.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Uplatnice settings */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Podaci za <em>uplatnice</em>
        </h2>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Kanton</span>
            <select
              className={styles.input}
              value={kantonKey}
              onChange={(e) =>
                handleKantonChange(e.target.value as KantonKey | "")
              }
            >
              <option value="">— Odaberite kanton —</option>
              {(Object.keys(KANTONI) as KantonKey[]).map((k) => (
                <option key={k} value={k}>
                  {KANTONI[k].ime}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Općina (poslodavca)</span>
            <select
              className={styles.input}
              value={opcinaKod}
              onChange={(e) => setOpcinaKod(e.target.value)}
              disabled={!kantonKey}
            >
              <option value="">— Odaberite općinu —</option>
              {opcine.map((o) => (
                <option key={o.kod} value={o.kod}>
                  {o.ime}
                </option>
              ))}
            </select>
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.fieldLabel}>Žiro račun naručioca</span>
            <input
              className={styles.input}
              value={naruciZiro}
              onChange={(e) => setNaruciZiro(formatZiroRacun(e.target.value))}
              inputMode="numeric"
              placeholder="XXX-XXX-XXXXXXXX-XX"
            />
            <p className={styles.hint}>
              Ukoliko plaćate preko žiro računa, unesite vaš žiro račun. Ako
              plaćate u gotovini, ostavite prazno.
            </p>
          </label>
        </div>

        {/* Pregled uplatnica */}
        <div className={styles.uplCardsList}>
          {(() => {
            const k = kantonKey ? KANTONI[kantonKey] : null;
            const placeholderRacun = "Odaberite kanton";
            const placeholderPrimalac = k ? "" : "Odaberite kanton";
            return [
              {
                title: "Zdravstveno osiguranje — kanton",
                racun: k?.zoRacun ?? placeholderRacun,
                primalac: k ? `ZZO ${k.genitiv}` : placeholderPrimalac,
                vrsta: "712116",
                iznos: calc.zdravstvenoKanton,
              },
              {
                title: "Zdravstveno osiguranje — FBiH",
                racun: "102-050-00000640-18",
                primalac: "ZZO FBiH",
                vrsta: "712116",
                iznos: calc.zdravstvenoFbih,
              },
              {
                title: "Porez na dohodak — kantonalni budžet",
                racun: k?.budzet ?? placeholderRacun,
                primalac: k ? `Budžet ${k.genitiv}` : placeholderPrimalac,
                vrsta: "716116",
                iznos: calc.porez,
              },
              {
                title: "PIO/MIO doprinos",
                racun: "102-050-00001066-98",
                primalac: "Budžet Federacije BiH",
                vrsta: "712126",
                iznos: calc.pio,
              },
              {
                title: "Zaštita od prirodnih nepogoda",
                racun: k?.budzet ?? placeholderRacun,
                primalac: k ? `Budžet ${k.genitiv}` : placeholderPrimalac,
                vrsta: "722582",
                iznos: calc.zastita,
              },
              {
                title: "Opšta vodna naknada",
                racun: k?.budzet ?? placeholderRacun,
                primalac: k ? `Budžet ${k.genitiv}` : placeholderPrimalac,
                vrsta: "722582",
                iznos: calc.voda,
              },
            ];
          })().map((u, i) => (
            <div key={i} className={styles.uplCard}>
              <span className={styles.uplCardNum}>{i + 1}</span>
              <div className={styles.uplCardBody}>
                <div className={styles.uplCardTitle}>{u.title}</div>
                <div className={styles.uplCardSub}>
                  {u.racun}
                  {u.primalac && ` · ${u.primalac}`}
                  {opcinaKod && ` · Općina: ${opcinaKod}`}
                  {` · Vrsta prihoda: ${u.vrsta}`}
                </div>
              </div>
              <span className={styles.uplCardIznos}>{fmtKm(u.iznos)}</span>
            </div>
          ))}
        </div>
      </section>

      {!canGenerate && (
        <GeneratePaywall
          tier="BUSINESS"
          what="Generisanje uplatnica za ugovor o djelu"
        />
      )}
      <div className={`${styles.actions} ${styles.actionsCenter}`}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleDownloadUplatnice}
          disabled={generatingUplatnice || !canGenerate}
          title={canGenerate ? undefined : "Dostupno uz Business pretplatu"}
        >
          {IconCard}{" "}
          {generatingUplatnice ? "Generišem…" : "Preuzmi uplatnice (PDF)"}
        </button>
      </div>

      <p className={styles.disclaimer}>
        Stope i formula su informativne, prema važećem Zakonu o porezu na
        dohodak FBiH. Provjerite tačnost prije korištenja u finalnim
        dokumentima.
      </p>

      {/* ── Edukativni sadržaj (SEO) ─────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Šta je <em>ugovor o djelu</em>?
        </h2>
        <p>
          <strong>Ugovor o djelu</strong> je vrsta autorskog ugovora kojim se
          izvršilac obavezuje da naručiocu obavi određeni posao — izradi
          projekta, sastavljanje teksta, pružanje konsultantskih usluga,
          autorska djela, ekspertize, predavanja i sl. — a naručilac da mu za to
          plati ugovorenu naknadu. Regulisan je{" "}
          <em>Zakonom o obligacionim odnosima</em>, a porezni tretman propisan
          je Zakonom o porezu na dohodak FBiH.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          Razlikuje se od ugovora o radu po tome što{" "}
          <strong>ne zasniva radni odnos</strong> — nema pune zaštite radnika
          (godišnji odmor, otkazni rok, povreda na radu), ali ima poreznu
          fleksibilnost i pogodan je za jednokratne ili projektne angažmane.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Porez i doprinosi na ugovor o <em>djelu</em>
        </h2>
        <p>
          Iz bruto naknade priznaju se <strong>normirani rashodi</strong>:
        </p>
        <ul
          style={{
            marginTop: "0.5rem",
            paddingLeft: "1.25rem",
            lineHeight: 1.7,
          }}
        >
          <li>
            <strong>20%</strong> — standardni ugovor o djelu (usluge, projekti,
            konsultacije).
          </li>
          <li>
            <strong>30%</strong> — autorska djela (književna, muzička, filmska,
            likovna ostvarenja, naučna djela).
          </li>
          <li>
            <strong>0%</strong> — naknade članovima komisija, nadzornih odbora i
            sličnih tijela.
          </li>
        </ul>
        <p style={{ marginTop: "0.85rem" }}>Na umanjenu osnovicu plaća se:</p>
        <ul
          style={{
            marginTop: "0.5rem",
            paddingLeft: "1.25rem",
            lineHeight: 1.7,
          }}
        >
          <li>
            <strong>4% doprinos za zdravstveno osiguranje</strong> (iz primitaka
            od druge samostalne djelatnosti — šifra 712116),
          </li>
          <li>
            <strong>10% porez na dohodak</strong> od druge samostalne
            djelatnosti.
          </li>
        </ul>
        <p style={{ marginTop: "0.85rem" }}>
          Naručilac dodatno plaća <strong>6% PIO doprinos</strong> te 0,5% opšta
          vodna naknada i 0,5% naknada za zaštitu od prirodnih nesreća —
          obračunato na neto iznos.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Kako popuniti ugovor o djelu u <em>4 koraka</em>
        </h2>
        <ol
          style={{
            marginTop: "0.5rem",
            paddingLeft: "1.25rem",
            lineHeight: 1.7,
          }}
        >
          <li>
            <strong>Unesite iznos naknade</strong> — odaberite vrstu (standardna
            20%, autorsko djelo 30%, komisija 0%) i unesite NETO ili BRUTO
            iznos. Kalkulator automatski računa porez, doprinose, PIO, zaštitu i
            vodnu naknadu.
          </li>
          <li>
            <strong>Popunite ugovorne strane</strong> — podaci naručioca
            (firma/obrt) i izvršioca (radnik). Ako imate sačuvane podatke u
            profilu, dropdown "Popuni" radi auto-popunu jednim klikom.
          </li>
          <li>
            <strong>Detalji ugovora</strong> — predmet posla, datum zaključenja,
            rok izvršenja, mjesto i nadležni sud u slučaju spora.
          </li>
          <li>
            <strong>Preuzmite ugovor i uplatnice</strong> — Word (DOCX) ili PDF
            ugovor + 6 popunjenih uplatnica spremnih za banku ili elektronsko
            plaćanje.
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Razlika: ugovor o djelu <em>vs.</em> ugovor o radu
        </h2>
        <ul
          style={{
            marginTop: "0.5rem",
            paddingLeft: "1.25rem",
            lineHeight: 1.7,
          }}
        >
          <li>
            <strong>Ugovor o djelu</strong> — jednokratna ili projektna
            angažovanost, izvršilac sam organizuje rad, nema fiksnog radnog
            vremena ni godišnjeg odmora. Manji porezni teret, ali manja zaštita.
          </li>
          <li>
            <strong>Ugovor o radu</strong> — stalni radni odnos, fiksno radno
            vrijeme, godišnji odmor, otkazni rokovi, zaštita od povrede na radu.
            Veći porezni teret (puni doprinosi za PIO, zdravstveno,
            nezaposlenost).
          </li>
        </ul>
        <p style={{ marginTop: "0.85rem" }}>
          Inspekcija rada može preklasifikovati UoD u ugovor o radu ako se
          ustanovi da posao ima karakteristike radnog odnosa (fiksno radno
          vrijeme, subordinacija, dugotrajnost). Zato je važno da UoD bude
          ograničen vremenski i predmetno.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Rok za <em>uplatu</em> poreza i doprinosa
        </h2>
        <p>
          Porezi i doprinosi po ugovoru o djelu uplaćuju se{" "}
          <strong>istovremeno sa isplatom naknade</strong> izvršiocu —
          najkasnije isti dan kada se neto iznos isplaćuje na njegov račun.
          Naručilac je odgovoran za pravovremenu uplatu i podnošenje obrazaca
          nadležnoj poreznoj ispostavi (AUG-1031 obrazac).
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Povezani <em>alati</em>
        </h2>
        <ul
          style={{
            marginTop: "0.5rem",
            paddingLeft: "1.25rem",
            lineHeight: 1.9,
          }}
        >
          <li>
            <a
              href="/ugovor-o-radu"
              style={{ color: "var(--sage)", fontWeight: 600 }}
            >
              Ugovor o radu i otkaz
            </a>{" "}
            — za stalno radno angažovanje (alternativa UoD-u).
          </li>
          <li>
            <a
              href="/ugovor-o-pozajmici"
              style={{ color: "var(--sage)", fontWeight: 600 }}
            >
              Ugovor o pozajmici
            </a>{" "}
            — za pozajmicu novca između strana.
          </li>
          <li>
            <a href="/ams" style={{ color: "var(--sage)", fontWeight: 600 }}>
              AMS-1035 — prihodi iz inostranstva
            </a>{" "}
            — slična porezna logika za prihode iz inostranstva.
          </li>
          <li>
            <a
              href="/preracun-neto-bruto"
              style={{ color: "var(--sage)", fontWeight: 600 }}
            >
              Preračun neto/bruto plate
            </a>{" "}
            — provjera obračuna za radnike u radnom odnosu.
          </li>
        </ul>
      </section>

      <FaqSection
        items={[
          {
            q: "Šta je ugovor o djelu?",
            a: "Ugovor o djelu je vrsta autorskog ugovora kojim se izvršilac obavezuje da naručiocu obavi određeni posao (npr. izrada projekta, sastavljanje teksta, pružanje usluge), a naručilac da mu za to plati ugovorenu naknadu. Razlikuje se od ugovora o radu po tome što ne zasniva radni odnos.",
          },
          {
            q: "Koji porezi i doprinosi se plaćaju na ugovor o djelu u FBiH?",
            a: "Iz bruto naknade priznaju se 20% normirani rashodi (ili 30% za autorska djela, 0% za naknade članovima komisija). Na umanjenu osnovicu plaća se 4% doprinos za zdravstveno (radnik) i 10% porez na dohodak. Naručilac dodatno plaća 6% PIO doprinos te 0,5% zaštita od prirodnih nepogoda i 0,5% opšta vodna naknada na neto iznos.",
          },
          {
            q: "Ko podnosi i plaća poreze i doprinose?",
            a: "Naručilac (poslodavac) ima obavezu da obračuna i uplati sve poreze i doprinose pri isplati naknade izvršiocu. Naknada se isplaćuje neto, a sve dažbine idu na zaseban budžetski račun preko uplatnica.",
          },
          {
            q: "Kako se računa neto iz bruto iznosa?",
            a: "Neto = Bruto × 0,8912 za standardni UoD (20% troškova). Za autorska djela (30% troškova) faktor je oko 0,927, a za komisije i nadzorne odbore (0% troškova) je 0,864. Suprotno, za pretvorbu neto u bruto koristi se faktor 1,122083 odnosno 1,157407 za komisije.",
          },
          {
            q: "Mogu li sklopiti ugovor o djelu sa zaposlenom osobom?",
            a: "Da. Ugovor o djelu može se sklopiti i sa licem koje je već u radnom odnosu kod drugog poslodavca. Stope poreza i doprinosa su iste. Bitno je da posao po UoD-u nije iste prirode kao redovni posao kod osnovnog poslodavca.",
          },
          {
            q: "Koji je rok za uplatu poreza i doprinosa?",
            a: "Porezi i doprinosi se uplaćuju istovremeno sa isplatom naknade izvršiocu, najkasnije isti dan kad se neto iznos isplaćuje na njegov račun. Naručilac je odgovoran za pravovremeno podnošenje obrazaca i uplatu na nadležne račune.",
          },
        ]}
      />
    </main>
  );
}
