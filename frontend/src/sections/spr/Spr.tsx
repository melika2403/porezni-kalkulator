"use client";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import styles from "./spr.module.css";
import { getOrganization } from "src/api/profile";
import { getKpr, searchBankTransactions } from "src/api/bankStatements";
import { getAmortizacija } from "src/api/amortizacija";
import { calcRow } from "src/sections/amortizacija/Amortizacija";
import FaqSection from "src/components/FaqSection/FaqSection";
import { fillSprTemplate, type SprData } from "src/sections/spr/fillSpr";
import DateInput from "src/components/DateInput/DateInput";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import CitySelect from "src/components/CitySelect/CitySelect";
import { useCityLookup } from "src/hooks/useCities";
import { formatAddress } from "src/utils/formatAddress";
import PersonFillSelect, {
  type FillData,
} from "src/components/PersonFillSelect/PersonFillSelect";
import OrgFillSelect, {
  type OrgFillData,
} from "src/components/PersonFillSelect/OrgFillSelect";
import SaveToProfileButton from "src/components/SaveToProfileButton/SaveToProfileButton";
import ShifraCombobox from "src/components/ShifraCombobox/ShifraCombobox";
import { trackEvent } from "src/api/activity";

/* ── Helpers ── */

const num = (v: string) => {
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const onEnterNext = (e: React.KeyboardEvent<HTMLFormElement>) => {
  if (e.key !== "Enter") return;
  const target = e.target as HTMLElement;
  if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
  e.preventDefault();
  const focusable = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])",
    ),
  );
  const idx = focusable.indexOf(target);
  if (idx >= 0 && idx < focusable.length - 1) focusable[idx + 1].focus();
};

const fmtInput = (raw: string): string => {
  const stripped = raw.replace(/\./g, "");
  const commaIdx = stripped.indexOf(",");
  const intPart =
    commaIdx >= 0
      ? stripped.slice(0, commaIdx).replace(/\D/g, "")
      : stripped.replace(/\D/g, "");
  const decPart = commaIdx >= 0 ? stripped.slice(commaIdx) : "";
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return formatted + decPart;
};

const fmt = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getTodayIsoString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isoToFormatted = (isoDate: string): string => {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const isoToCompact = (isoDate: string): string => {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  return `${day}${month}${year}`;
};

function monthsBetween(start: string, end: string) {
  if (!start || !end) return 1;
  const d1 = new Date(start);
  const d2 = new Date(end);
  return (
    (d2.getFullYear() - d1.getFullYear()) * 12 +
    (d2.getMonth() - d1.getMonth()) +
    1
  );
}

/* ── Component ── */

export default function SprForm() {
  const { findByName: findCity } = useCityLookup();
  const formRef = useRef<HTMLFormElement | null>(null);

  /* ── Dio 1 — Podaci o poreznom obvezniku ── */
  const [personal, setPersonal] = useState({
    jmbOsobni: "",
    fullName: "",
    address: "",
    city: "",
  });

  /* ── Dio 2 — Podaci o djelatnosti ── */
  const [business, setBusiness] = useState({
    jibJmb: "",
    periodFrom: "",
    periodTo: "",
    contactChanged: false,
    name: "",
    address: "",
    city: "",
    activityCode: "",
    activityName: "",
  });

  /* ── Dio 3 — Prihodi ── */
  const [income, setIncome] = useState({
    row11: "", // U gotovini
    row12: "", // U naturi
    row13: "", // U stvarima i uslugama
    row14: "", // Ostali prihodi
    row15: "", // Knjig. vrijednost rasknjiženih stalnih sredstava
  });

  /* ── Dio 4 — Rashodi ── */
  const [expenses, setExpenses] = useState({
    row17: "", // Nabavna vrijednost
    row18: "", // Bruto plaće
    row19: "", // Doprinosi na plaću
    row20: "", // Ostali rashodi
    row21: "", // Vrijednost uloženih ekon. dobara
    row22: "", // Amortizacija
    row23: "", // Knjig. vrijednost rasknjiženih stalnih sredstava
  });

  /* ── Dio 5 — Dohodak ── */
  const [adjustments, setAdjustments] = useState({
    row27: "", // Porezne korekcije
    sign: "" as "+" | "-" | "",
    row29: "", // Lični odbitak
  });

  const [dateSigned, setDateSigned] = useState(() => getTodayIsoString());

  const [sourceClientId, setSourceClientId] = useState<number | null>(null);
  const [sourceOrgId, setSourceOrgId] = useState<number | null>(null);

  /* ── Fill from profile/client ── */

  // "Prepiši" znači prepiši SVE: polje bez podatka se isprazni, ne smije
  // ostati vrijednost prethodnog izbora.
  const fillPersonal = useCallback((data: FillData) => {
    setPersonal((p) => ({
      ...p,
      jmbOsobni: data.jmbg ?? "",
      fullName: [data.firstName, data.lastName].filter(Boolean).join(" "),
      address: data.address ?? "",
      city: data.city ?? "",
    }));
    if (data.sourceClientId !== undefined)
      setSourceClientId(data.sourceClientId);
    if (data.sourceWorkerOrgId !== undefined)
      setSourceOrgId(data.sourceWorkerOrgId);
  }, []);

  const fillBusiness = useCallback((data: OrgFillData) => {
    setBusiness((p) => ({
      ...p,
      jibJmb: data.taxNumber ?? "",
      name: data.name ?? "",
      address: data.address ?? "",
      city: data.city ?? "",
      activityCode: data.activityCode ?? "",
      activityName: data.activityName ?? "",
    }));
  }, []);

  /* ── PK Office prefill (/spr?pkOrg=..&pkYear=..) ── */
  // Povuče obveznika i cifre iz knjiga te organizacije: prihodi/rashodi iz
  // KPR-a (samo potvrđene stavke izvoda), amortizacija iz PLDI obrasca iste
  // godine. Sve povučeno ostaje editabilno, korisnik provjerava prije predaje.
  const [pkFill, setPkFill] = useState<{
    orgName: string;
    year: number;
    notes: string[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const orgId = Number(sp.get("pkOrg"));
    const year = Number(sp.get("pkYear"));
    if (!Number.isInteger(orgId) || orgId <= 0) return;
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return;
    let cancelled = false;
    (async () => {
      const [orgRes, kprRes, amortRes, unmatchedRes] = await Promise.all([
        getOrganization(orgId),
        getKpr(orgId, { year }),
        getAmortizacija(String(year), orgId),
        searchBankTransactions(orgId, {
          status: "UNMATCHED",
          dateFrom: `${year}-01-01`,
          dateTo: `${year}-12-31`,
          limit: 1,
        }),
      ]);
      if (cancelled) return;

      if (!orgRes.ok) {
        setPkFill({
          orgName: "",
          year,
          notes: [],
          error:
            "Podaci iz PK Office se ne mogu povući. Provjerite da ste prijavljeni, pa otvorite obrazac ponovo iz PK Office (Obrasci).",
        });
        return;
      }
      const org = orgRes.data;
      const owner = org.owner;

      // Prepiši SVE podatke izabrane organizacije (prazno kad podatka nema):
      // "?? staro" bi zadržao vrijednosti prethodno izabrane organizacije.
      setPersonal((p) => ({
        ...p,
        jmbOsobni: owner?.jmbg ?? "",
        fullName:
          owner?.name ||
          [owner?.firstName, owner?.lastName].filter(Boolean).join(" ") ||
          "",
        address: owner?.address ?? "",
        city: owner?.city ?? "",
      }));
      setBusiness((p) => ({
        ...p,
        jibJmb: org.taxNumber ?? "",
        periodFrom: `${year}-01-01`,
        periodTo: `${year}-12-31`,
        name: org.name ?? "",
        address: org.address ?? "",
        city: org.city ?? "",
        activityCode: org.activityCode ?? "",
        activityName: org.activityName ?? "",
      }));
      setSourceOrgId(orgId);

      const notes: string[] = [];

      // Paušalni režim: SPR se ne puni iz KPR-a, povlačimo samo obveznika.
      if (org.taxRegime === "PAUSALNI") {
        notes.push(
          "Organizacija je u paušalnom režimu oporezivanja, pa cifre iz knjiga nisu povučene.",
        );
        setPkFill({ orgName: org.name, year, notes });
        return;
      }

      if (kprRes.ok) {
        const t = kprRes.data.totals;
        const f = (n: number) => (n > 0 ? fmt(n) : "");
        setIncome((s) => ({
          ...s,
          row11: f(t.k11),
          row12: f(t.k12),
          row13: f(t.k13),
        }));
        setExpenses((s) => ({
          ...s,
          row17: f(t.k16),
          row18: f(t.k17),
          row19: f(t.k18),
          row20: f(t.k19),
        }));
      } else {
        notes.push(
          "KPR se nije mogao učitati, pa prihodi i rashodi nisu povučeni.",
        );
      }

      if (amortRes.ok && amortRes.data?.rows?.length) {
        const od = amortRes.data.obveznik?.periodOd || `${year}-01-01`;
        const doo = amortRes.data.obveznik?.periodDo || `${year}-12-31`;
        const total = amortRes.data.rows.reduce(
          (a, row) => a + (calcRow(row, od, doo).iznos ?? 0),
          0,
        );
        if (total > 0) setExpenses((s) => ({ ...s, row22: fmt(total) }));
      } else {
        notes.push(
          `Amortizacija (PLDI) za ${year}. nije pronađena za ovu organizaciju: red 22 unesite ručno ili prvo popunite alat Stalna sredstva i amortizacija.`,
        );
      }

      if (unmatchedRes.ok && unmatchedRes.data.total > 0) {
        notes.push(
          `${unmatchedRes.data.total} stavki iz izvoda u ${year}. još nije potvrđeno, pa NISU uključene u cifre. Potvrdite stavke u PK Office pa ponovo otvorite obrazac.`,
        );
      }

      setPkFill({ orgName: org.name, year, notes });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Computed values ── */

  const computed = useMemo(() => {
    // Row 16 — ukupno prihodi
    const totalIncome =
      num(income.row11) +
      num(income.row12) +
      num(income.row13) +
      num(income.row14) +
      num(income.row15);

    // Row 24 — ukupno rashodi
    const totalExpenses =
      num(expenses.row17) +
      num(expenses.row18) +
      num(expenses.row19) +
      num(expenses.row20) +
      num(expenses.row21) +
      num(expenses.row22) +
      num(expenses.row23);

    // Row 28 — dohodak iz djelatnosti
    const adj = num(adjustments.row27);
    const adjSigned = adjustments.sign === "-" ? -adj : adj;
    const netIncome = Math.max(totalIncome - totalExpenses + adjSigned, 0);

    // Row 29 — lični odbitak
    const months = monthsBetween(business.periodFrom, business.periodTo);
    const row29 = months > 0 ? (netIncome * 0.1) / months : 0;

    return { totalIncome, totalExpenses, netIncome, row29, months };
  }, [income, expenses, adjustments, business]);

  /* ── PDF Export ── */

  const buildSprData = useCallback((): SprData => {
    const adj = num(adjustments.row27);
    const adjSigned = adjustments.sign === "-" ? -adj : adj;
    return {
      jmbOsobni: personal.jmbOsobni,
      fullName: personal.fullName,
      address: formatAddress(personal.address, personal.city, findCity(personal.city)?.postalCode),

      jibJmb: business.jibJmb,
      periodFrom: isoToCompact(business.periodFrom),
      periodTo: isoToCompact(business.periodTo),
      contactChanged: business.contactChanged,
      businessName: business.name,
      businessAddress: formatAddress(business.address, business.city, findCity(business.city)?.postalCode),
      activityType: [business.activityCode, business.activityName]
        .filter(Boolean)
        .join(" - "),

      row11Cash: num(income.row11),
      row12InKind: num(income.row12),
      row13GoodsServices: num(income.row13),
      row14OtherIncome: num(income.row14),
      row15BookValueAssets: num(income.row15),
      row16TotalIncome: computed.totalIncome,

      row17Materials: num(expenses.row17),
      row18GrossWages: num(expenses.row18),
      row19Contributions: num(expenses.row19),
      row20OtherExpenses: num(expenses.row20),
      row21GoodsServicesValue: num(expenses.row21),
      row22Depreciation: num(expenses.row22),
      row23BookValueAssets: num(expenses.row23),
      row24TotalExpenses: computed.totalExpenses,

      row25Income: computed.totalIncome,
      row26Expenses: computed.totalExpenses,
      row27Adjustments: adjSigned,
      row28NetIncome: computed.netIncome,
      row29PersonalDeduction: computed.row29,
      row29Months: computed.months,
      signAdjustment: adjustments.sign,

      dateSigned: isoToFormatted(dateSigned),
    };
  }, [personal, business, income, expenses, adjustments, dateSigned, computed]);

  const exportPdf = useCallback(async () => {
    const data = buildSprData();
    const pdfBytes = await fillSprTemplate(data);

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
    a.download = `SPR-1053_${isoToCompact(business.periodFrom) || "XXXXXXXX"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("SPR_GENERATE", "SPR-1053");
  }, [buildSprData, business.periodFrom]);

  const sprYear = business.periodFrom
    ? parseInt(business.periodFrom.slice(0, 4)) || null
    : null;

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
        <div className={styles.label}>Obrazac SPR-1053</div>
        <h1 className={styles.h1}>
          SPR-1053 obrazac, specifikacija dohotka od{" "}
          <em>samostalne djelatnosti</em>
        </h1>
        <p className={styles.subtitle}>
          Kako popuniti SPR-1053 obrazac? Obračun dohotka od obrta, slobodnih
          zanimanja i poljoprivrede za godišnju poreznu prijavu GPD-1051.
          Popunite SPR-1053 obrazac online i preuzmite popunjeni PDF, besplatno
          i bez registracije.
        </p>
      </div>

      {/* PK Office prefill baner */}
      {pkFill && (
        <div
          style={{
            margin: "0 0 1.5rem",
            padding: "14px 18px",
            borderRadius: 12,
            background: pkFill.error ? "#f3d8d8" : "var(--sage-pale, #e3ede4)",
            border: "1px solid rgba(0, 0, 0, 0.07)",
            fontSize: "13.5px",
            lineHeight: 1.55,
          }}
        >
          {pkFill.error ? (
            <strong>{pkFill.error}</strong>
          ) : (
            <>
              <strong>
                Podaci povučeni iz PK Office knjiga: {pkFill.orgName},{" "}
                {pkFill.year}. godina.
              </strong>{" "}
              Prihodi i rashodi su iz KPR-a (potvrđene stavke izvoda),
              amortizacija iz PLDI obrasca. Sva polja ostaju editabilna,
              provjerite cifre prije predaje.
              {pkFill.notes.length > 0 && (
                <ul style={{ margin: "8px 0 0 18px", color: "#8a4f10" }}>
                  {pkFill.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Dio 1, Podaci o poreznom obvezniku ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 1, Podaci o <em>poreznom obvezniku</em>
        </h2>
        <PersonFillSelect onFill={fillPersonal} />
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>1) JMB</label>
            <input
              className={styles.fieldInput}
              maxLength={13}
              minLength={13}
              inputMode="numeric"
              pattern="\d{13}"
              placeholder="Jedinstveni matični broj"
              value={personal.jmbOsobni}
              onInvalid={(e) => {
                const el = e.currentTarget;
                if (el.validity.valueMissing)
                  el.setCustomValidity("Unesite JMB.");
                else if (el.validity.patternMismatch || el.validity.tooShort)
                  el.setCustomValidity("JMB mora imati tačno 13 cifara.");
                else el.setCustomValidity("Neispravan unos.");
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setPersonal((s) => ({ ...s, jmbOsobni: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup} />
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>2) Prezime i ime</label>
            <input
              className={styles.fieldInput}
              placeholder="Prezime i ime"
              value={personal.fullName}
              onInvalid={(e) => {
                const el = e.currentTarget;
                el.setCustomValidity(
                  el.validity.valueMissing ? "Unesite ime i prezime." : "",
                );
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setPersonal((s) => ({ ...s, fullName: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>3) Adresa</label>
            <input
              className={styles.fieldInput}
              placeholder="Ulica i broj"
              value={personal.address}
              onInvalid={(e) => {
                const el = e.currentTarget;
                el.setCustomValidity(
                  el.validity.valueMissing ? "Unesite adresu." : "",
                );
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setPersonal((s) => ({ ...s, address: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Grad</label>
            <CitySelect
              value={personal.city}
              onChange={(v) => setPersonal((s) => ({ ...s, city: v }))}
              className={styles.fieldInput}
            />
          </div>
        </div>
      </section>

      {/* ── Dio 2, Podaci o djelatnosti ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 2, Podaci o <em>djelatnosti</em>
        </h2>
        <OrgFillSelect onFill={fillBusiness} />
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>4) JIB/JMB djelatnosti</label>
            <input
              className={styles.fieldInput}
              maxLength={13}
              minLength={13}
              inputMode="numeric"
              pattern="\d{13}"
              placeholder="JIB ili JMB djelatnosti"
              value={business.jibJmb}
              onInvalid={(e) => {
                const el = e.currentTarget;
                if (el.validity.valueMissing)
                  el.setCustomValidity("Unesite JIB/JMB.");
                else if (el.validity.patternMismatch || el.validity.tooShort)
                  el.setCustomValidity("JIB/JMB mora imati tačno 13 cifara.");
                else el.setCustomValidity("Neispravan unos.");
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setBusiness((s) => ({ ...s, jibJmb: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Brzi odabir godine</label>
            <StyledSelect
              ariaLabel="Brzi odabir godine"
              wrapStyle={{ width: "100%" }}
              value=""
              onChange={(v) => {
                const yr = String(v ?? "");
                if (!yr) return;
                setBusiness((s) => ({
                  ...s,
                  periodFrom: `${yr}-01-01`,
                  periodTo: `${yr}-12-31`,
                }));
              }}
              groups={[
                {
                  options: [
                    { value: "", label: "– Odaberi godinu –" },
                    ...Array.from(
                      { length: 8 },
                      (_, i) => new Date().getFullYear() - i,
                    ).map((yr) => ({ value: String(yr), label: `${yr}.` })),
                  ],
                },
              ]}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>5) Period od</label>
            <DateInput
              className={styles.fieldInput}
              value={business.periodFrom}
              onValueChange={(iso) =>
                setBusiness((s) => ({ ...s, periodFrom: iso }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>6) Period do</label>
            <DateInput
              className={styles.fieldInput}
              value={business.periodTo}
              onValueChange={(iso) =>
                setBusiness((s) => ({ ...s, periodTo: iso }))
              }
            />
          </div>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>8) Naziv djelatnosti</label>
            <input
              className={styles.fieldInput}
              placeholder="Naziv poslovne djelatnosti"
              value={business.name}
              onInvalid={(e) => {
                const el = e.currentTarget;
                el.setCustomValidity(
                  el.validity.valueMissing ? "Unesite naziv djelatnosti." : "",
                );
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setBusiness((s) => ({ ...s, name: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              9) Adresa poslovne djelatnosti
            </label>
            <input
              className={styles.fieldInput}
              placeholder="Ulica i broj"
              value={business.address}
              onInvalid={(e) => {
                const el = e.currentTarget;
                el.setCustomValidity(
                  el.validity.valueMissing ? "Unesite adresu djelatnosti." : "",
                );
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setBusiness((s) => ({ ...s, address: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Grad djelatnosti</label>
            <CitySelect
              value={business.city}
              onChange={(v) => setBusiness((s) => ({ ...s, city: v }))}
              className={styles.fieldInput}
            />
          </div>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>
              10) Vrsta djelatnosti, šifra i naziv
            </label>
            <ShifraCombobox
              code={business.activityCode}
              name={business.activityName}
              onChange={(code, name) =>
                setBusiness((s) => ({ ...s, activityCode: code, activityName: name }))
              }
              inputClassName={styles.fieldInput}
              codeLabel="Šifra"
              nameLabel="Naziv"
            />
          </div>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <div className={styles.checkRow}>
              <input
                type="checkbox"
                id="sprContactChanged"
                checked={business.contactChanged}
                onChange={(e) =>
                  setBusiness((s) => ({
                    ...s,
                    contactChanged: e.target.checked,
                  }))
                }
              />
              <label htmlFor="sprContactChanged" className={styles.checkLabel}>
                7) Kontakt podaci su se izmijenili od prošle godine
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dio 3, Prihodi ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 3, <em>Prihodi</em>
        </h2>
        <table className={styles.calcTable}>
          <thead>
            <tr>
              <th>R.br.</th>
              <th>Vrsta prihoda</th>
              <th>Iznos (KM)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>11</td>
              <td>U gotovini shodno poslovnim knjigama</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={income.row11}
                  onChange={(e) =>
                    setIncome((s) => ({
                      ...s,
                      row11: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>12</td>
              <td>Preko bankovnog računa shodno poslovnim knjigama</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={income.row12}
                  onChange={(e) =>
                    setIncome((s) => ({
                      ...s,
                      row12: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>13</td>
              <td>U stvarima i uslugama shodno poslovnim knjigama</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={income.row13}
                  onChange={(e) =>
                    setIncome((s) => ({
                      ...s,
                      row13: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>14</td>
              <td>Izuzimanja ekonomskih dobara (čl. 14. stav 4. Zakona)</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={income.row14}
                  onChange={(e) =>
                    setIncome((s) => ({
                      ...s,
                      row14: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>15</td>
              <td>Izuzimanja usluga (čl. 14. stav 4. Zakona)</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={income.row15}
                  onChange={(e) =>
                    setIncome((s) => ({
                      ...s,
                      row15: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr className={styles.totalRow}>
              <td>16</td>
              <td>Prihodi ukupno (zbir redova 11. do 15.)</td>
              <td>
                <span
                  className={`${styles.summaryValue} ${styles.profitValue}`}
                >
                  {fmt(computed.totalIncome)} KM
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Dio 4, Rashodi ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 4, <em>Rashodi</em>
        </h2>
        <table className={styles.calcTable}>
          <thead>
            <tr>
              <th>R.br.</th>
              <th>Vrsta rashoda</th>
              <th>Iznos (KM)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>17</td>
              <td>
                Nabavna vrijednost robe i/ili materijala shodno poslovnim
                knjigama sa uračunatim PDV-om, a za obveznike koji su
                registrirani PDV obveznici, bez PDV-a
              </td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={expenses.row17}
                  onChange={(e) =>
                    setExpenses((s) => ({
                      ...s,
                      row17: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>18</td>
              <td>Bruto plaće zaposlenika shodno poslovnim knjigama</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={expenses.row18}
                  onChange={(e) =>
                    setExpenses((s) => ({
                      ...s,
                      row18: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>19</td>
              <td>
                Plaćeni doprinosi prema osnovici za poslodavca i na teret
                poslodavca
              </td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={expenses.row19}
                  onChange={(e) =>
                    setExpenses((s) => ({
                      ...s,
                      row19: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>20</td>
              <td>Ostali rashodi shodno poslovnim knjigama</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={expenses.row20}
                  onChange={(e) =>
                    setExpenses((s) => ({
                      ...s,
                      row20: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>21</td>
              <td>Vrijednost uloženih ekonomskih dobara i usluga</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={expenses.row21}
                  onChange={(e) =>
                    setExpenses((s) => ({
                      ...s,
                      row21: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>22</td>
              <td>Amortizacija</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={expenses.row22}
                  onChange={(e) =>
                    setExpenses((s) => ({
                      ...s,
                      row22: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>23</td>
              <td>Knjigovodstvena vrijednost rasknjiženih stalnih sredstava</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={expenses.row23}
                  onChange={(e) =>
                    setExpenses((s) => ({
                      ...s,
                      row23: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr className={styles.totalRow}>
              <td>24</td>
              <td>Rashodi ukupno (zbir redova 17 do 23)</td>
              <td>
                <span className={`${styles.summaryValue} ${styles.lossValue}`}>
                  {fmt(computed.totalExpenses)} KM
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Dio 5, Utvrđivanje dohotka ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 5, Utvrđivanje <em>dohotka iz djelatnosti</em>
        </h2>
        <table className={styles.calcTable}>
          <thead>
            <tr>
              <th>R.br.</th>
              <th>Opis</th>
              <th>Iznos (KM)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>25</td>
              <td>Prihodi (red 16)</td>
              <td>
                <span className={styles.autoValue}>
                  {fmt(computed.totalIncome)}
                </span>
              </td>
            </tr>
            <tr>
              <td>26</td>
              <td>Rashodi (red 24)</td>
              <td>
                <span className={styles.autoValue}>
                  {fmt(computed.totalExpenses)}
                </span>
              </td>
            </tr>
            <tr>
              <td>27</td>
              <td>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  Rashodi koje nije moguće odbiti (čl. 15 Zakona)
                </div>
              </td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={adjustments.row27}
                  onChange={(e) =>
                    setAdjustments((s) => ({
                      ...s,
                      row27: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr className={styles.resultRow}>
              <td>28</td>
              <td>Dohodak iz djelatnosti (25 − 26 + 27)</td>
              <td>
                <span className={`${styles.autoValue} ${styles.profitValue}`}>
                  {fmt(computed.netIncome)} KM
                </span>
              </td>
            </tr>
            <tr>
              <td>29</td>
              <td>
                Mjesečni iznos akontacije poreza na dohodak ((red 28. x 0,1) /
                {computed.months} {computed.months === 1 ? "mjesec" : "mjeseci"})
              </td>
              <td>
                <span className={styles.autoValue}>
                  {fmt(computed.row29)} KM
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Izjava ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Izjava <em>poreznog obveznika</em>
        </h2>
        <p className={styles.izjavaText}>
          Upoznat/a sam sa sankcijama propisanim Zakonom o Poreznoj upravi FBiH
          i izjavljujem da su svi podaci navedeni u ovoj specifikaciji tačni,
          potpuni i jasni.
        </p>
        <div className={styles.dateField}>
          <span className={styles.dateLabel}>Datum: *</span>
          <DateInput
            className={styles.fieldInput}
            value={dateSigned}
            onValueChange={setDateSigned}
            required
          />
        </div>
      </section>

      {/* ── Export ── */}
      <div className={styles.actions}>
        <SaveToProfileButton
          type="SPR"
          year={sprYear}
          title={`SPR-1053 · ${personal.fullName} · ${sprYear ?? "?"}`}
          buildData={buildSprData}
          disabled={sprYear === null}
          defaultOrganizationId={sourceOrgId}
          defaultClientId={sourceClientId}
        />
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
      <p className={styles.dataNapomena}>
        Porezni kalkulator ne zadržava popunjene podatke ni u kojem obliku.
        Nakon spremanja PDF dokumenta uvijek provjerite tačnost podataka.
      </p>

      {/* ── Edukativni sadržaj (SEO) ─────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Šta je SPR-1053 <em>obrazac</em>?
        </h2>
        <p>
          <strong>SPR-1053</strong> (Specifikacija prihoda i rashoda) je obrazac
          Porezne uprave FBiH kojim se utvrđuje dohodak od samostalne djelatnosti.
          Predaje se kao obavezan prilog uz godišnju prijavu poreza na dohodak{" "}
          <strong>GPD-1051</strong>, a sadrži pregled svih prihoda, rashoda i
          konačnog oporezivog dohotka za prethodnu kalendarsku godinu.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          SPR-1053 obavezno podnose:
        </p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>obrtnici (samostalna privredna djelatnost),</li>
          <li>nositelji slobodnih zanimanja (odvjetnici, ljekari, arhitekti, knjigovođe i sl.),</li>
          <li>poljoprivrednici koji ostvaruju dohodak iznad zakonom propisanog praga,</li>
          <li>šumari i nositelji ostalih samostalnih djelatnosti definisanih Zakonom o porezu na dohodak FBiH.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Kako popuniti SPR-1053 obrazac u <em>3 koraka</em>
        </h2>
        <ol style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Unesite osnovne podatke o obvezniku</strong>, ime i prezime,
            JMB, adresa, naziv djelatnosti, JIB obrta i nadležna porezna ispostava.
            Ako ste registrovani korisnik, podaci se automatski popunjavaju iz vašeg
            profila.
          </li>
          <li>
            <strong>Unesite prihode i rashode</strong> iz poslovnih knjiga za
            prethodnu godinu. Sistem automatski obračunava razliku, oporezivi
            dohodak od samostalne djelatnosti.
          </li>
          <li>
            <strong>Preuzmite popunjen SPR-1053 PDF</strong> spreman za štampu
            i predaju u poreznoj ispostavi, ili za elektronsku predaju putem
            ePorezne. Obrazac se predaje zajedno sa GPD-1051 godišnjom prijavom
            poreza na dohodak.
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Rok za predaju SPR-1053 <em>obrasca</em>
        </h2>
        <p>
          SPR-1053 obrazac se predaje <strong>do 31. marta tekuće godine</strong>{" "}
          za prethodnu kalendarsku godinu, npr. obrazac za 2025. godinu predaje
          se najkasnije do <strong>31.03.2026.</strong> Predaja se vrši zajedno
          sa godišnjom prijavom poreza na dohodak (GPD-1051) u nadležnoj ispostavi
          Porezne uprave FBiH prema mjestu prebivališta poreznog obveznika.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          Kašnjenje sa predajom obrasca može rezultirati prekršajnim kaznama prema
          Zakonu o Poreznoj upravi FBiH. Preporučuje se predaja u februaru ili
          ranije u martu, prije godišnje gužve u poreznim ispostavama.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Povezani <em>alati</em>
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.9 }}>
          <li>
            <a href="/gpd" style={{ color: "var(--sage)", fontWeight: 600 }}>
              GPD-1051, godišnja prijava poreza na dohodak
            </a>,{" "}
            SPR-1053 se predaje kao prilog uz GPD-1051.
          </li>
          <li>
            <a href="/amortizacija" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Stalna sredstva i amortizacija
            </a>,{" "}
            vođenje evidencije osnovnih sredstava i godišnji obračun amortizacije
            kao rashoda.
          </li>
          <li>
            <a href="/preracun-neto-bruto" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Preračun neto/bruto plate
            </a>,{" "}
            ako vodite radnike, plate ulaze u rashode poslovanja.
          </li>
          <li>
            <a href="/javni-prihodi" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Uplatni računi javnih prihoda
            </a>,{" "}
            šifre vrsta prihoda i računi za uplatu poreza i doprinosa.
          </li>
        </ul>
        <h2 className={styles.sectionTitle} style={{ marginTop: "2rem" }}>
          Pročitaj <em>na blogu</em>
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.9 }}>
          <li>
            <a href="/vodici/obrt-vs-doo-2026" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Obrt vs d.o.o. 2026
            </a>,{" "}
            poređenje oporezivanja i kad se koja forma isplati.
          </li>
          <li>
            <a href="/vodici/priznati-rashodi-obrta-2026" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Priznati rashodi obrta
            </a>,{" "}
            koji troškovi smanjuju poreznu osnovicu u SPR-u.
          </li>
        </ul>
      </section>

      <FaqSection
        items={[
          {
            q: "Ko je obavezan podnijeti SPR-1053 obrazac?",
            a: "SPR-1053 podnose fizičke osobe koje obavljaju samostalnu djelatnost (obrtnici, slobodna zanimanja, poljoprivrednici i šumari) radi utvrđivanja dohotka od te djelatnosti. Obrazac se predaje nadležnoj ispostavi Porezne uprave FBiH.",
          },
          {
            q: "Koji je rok za predaju SPR obrasca?",
            a: "SPR-1053 se predaje do 31. marta tekuće godine za prethodnu kalendarsku godinu, zajedno sa godišnjom prijavom poreza (GPD-1051). Npr. obrazac za 2025. godinu se predaje do 31.03.2026. Preporučuje se predaja u što kraćem roku radi izbjegavanja gužvi.",
          },
          {
            q: "Razlika između SPR i GPD obrasca?",
            a: "SPR-1053 je specifikacija koja prikazuje kako je ostvaren dohodak od samostalne djelatnosti, prihodi minus rashodi. GPD-1051 je godišnja prijava poreza koja objedinjuje sve izvore dohotka (uključujući i SPR) i izračunava konačnu poreznu obavezu.",
          },
          {
            q: "Moram li voditi poslovne knjige da bih podnio SPR?",
            a: "Da, porezni obveznici samostalne djelatnosti dužni su voditi propisane poslovne knjige po sistemu prostog ili dvojnog knjigovodstva i čuvati pripadajuće račune i izvode kao dokaz prihoda i rashoda.",
          },
          {
            q: "Kako se obračunava akontacija poreza tokom godine?",
            a: "Akontacija poreza je predviđanje Vaše dobiti na kraju poslovne godine, na osnovu dobiti prošle godine. Ona bi se trebala uplaćivati svaki mjesec, te ukoliko zatražite neki dokument ili potvrdu od porezne uprave, mogu od Vas zatražiti da su Vam sve akontacije do tog mjeseca uplaćene. Akontacije Vam pomažu da izbjegnete velike porezne obaveze na kraju godine. Ukoliko na kraju godine imate više uplaćenih akontacija nego poreza za platiti, one se prenose na sljedeću godinu.",
          },
        ]}
      />
    </form>
  );
}
