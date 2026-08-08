"use client";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import styles from "./gpd.module.css";
import FaqSection from "src/components/FaqSection/FaqSection";
import { fillGpdTemplate, type GpdData } from "src/sections/gpd/fillGpd";
import {
  fillGpdUplatnica,
  KANTONI,
  type KantonKey,
} from "src/sections/ams/fillUplatnica";
import DateInput from "src/components/DateInput/DateInput";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import CitySelect from "src/components/CitySelect/CitySelect";
import { useCityLookup } from "src/hooks/useCities";
import { formatAddress } from "src/utils/formatAddress";
import PersonFillSelect, {
  type FillData,
} from "src/components/PersonFillSelect/PersonFillSelect";
import SaveToProfileButton from "src/components/SaveToProfileButton/SaveToProfileButton";
import { trackEvent } from "src/api/activity";
import { getOrganization, getForms } from "src/api/profile";
import { getDocument } from "src/api/documents";
import { searchBankTransactions } from "src/api/bankStatements";
import type { SprData } from "src/sections/spr/fillSpr";

/* ── Row definitions ── */

const INCOME_ROWS = [
  {
    no: 8,
    label:
      "Dohodak od nesamostalne djelatnosti i/ili dohodak članova predstavničkih organa vlasti (Unijeti ukupan iznos iz kolone 11, godišnjeg-ih izvještaja o ukupnim isplaćenim plaćama i drugim ličnim primanjima (obrazac GIP-1022)  i priložiti primjerak izvještaja od svakog poslodavca ",
    lossEnabled: false,
    incomeEnabled: true,
  },
  {
    no: 9,
    label:
      "Dohodak od samostalne djelatnosti (Unijeti ukupan iznos iz reda 28 specifikacije za utvrđivanje dohotka od samostalne djelatnosti (obrazac SPR-1053))",
    lossEnabled: true,
    incomeEnabled: true,
  },
  {
    no: 10,
    label:
      "Dohodak od poljoprivrede i šumarstva (Unijeti ukupan iznos iz reda 28 specifikacije za utvrđivanje dohotka od samostalne djelatnosti - obrazac SPR-1053) ",
    lossEnabled: true,
    incomeEnabled: true,
  },
  {
    no: 11,
    label:
      "Dohodak od iznajmljivanja imovine (čl. 20. st. 1. tč. 1. i 3. i stav 5. Zakona) /Unijeti ukupan iznos iz reda 18 pregleda prihoda i rashoda od iznajmljivanja nepokretne imovine - obrazac PRIM 1054. U slučaju da se obveznik opredijelio za rashode u paušalnom iznosu uz godišnju prijavu priložiti ugovor o iznajmljivanju / ",
    lossEnabled: true,
    incomeEnabled: true,
  },
  {
    no: 12,
    label:
      "Dohodak od vremenski ograničenog ustupanja prava (član 21. stav 2.)  / Uz godišnju prijavu priložiti ugovor o vremenski ograničenom ustupanju imovinskih prava / ",
    lossEnabled: true,
    incomeEnabled: true,
  },
  {
    no: 13,
    label:
      "Dohodak od drugih samostalnih djelatnosti koje nisu navedene ovdje / veza sa obrascima AUG-1031 (kolona 13) i  ASD-1032 (kolona 10 )/ ",
    lossEnabled: true,
    incomeEnabled: true,
  },
  {
    no: 14,
    label: "Poslovni gubitak iz ranijih godina",
    lossEnabled: true,
    incomeEnabled: false,
  },
];

/* ── Types ── */

interface RowValue {
  loss: string;
  profit: string;
}

interface PersonalData {
  jmb: string;
  fullName: string;
  address: string;
  city: string;
  contactChanged: boolean;
  taxYear: string;
  phone: string;
  email: string;
}

interface Deductions {
  personal: string;
  health: string;
  mortgage: string;
}

interface TaxCalc {
  reduction: string;
  withholdingTax: string;
  advancePayments: string;
  foreignTax: string;
}

interface RefundOption {
  choice: "advance" | "refund" | "";
  bankAccount: string;
}

/* ── Helpers ── */

const num = (v: string) => {
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

// ISO datum → ddMM za zaglavlje "za period od-do" (prazno = cijela godina)
const isoToDdMm = (iso: string): string | undefined => {
  if (!iso) return undefined;
  const [, m, d] = iso.split("-");
  return d && m ? `${d}${m}` : undefined;
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

const KANTON_KEYS = Object.keys(KANTONI) as KantonKey[];

const formatBankAccount = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  const parts = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 14),
    digits.slice(14, 16),
  ].filter(Boolean);
  return parts.join("-");
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
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
};

/* ── Component ── */

export default function GpdForm() {
  const { findByName: findCity } = useCityLookup();
  const formRef = useRef<HTMLFormElement | null>(null);
  const refundRequiredRef = useRef<HTMLInputElement | null>(null);

  const [personal, setPersonal] = useState<PersonalData>({
    jmb: "",
    fullName: "",
    address: "",
    city: "",
    contactChanged: false,
    taxYear: "",
    phone: "",
    email: "",
  });

  const [rows, setRows] = useState<Record<number, RowValue>>(() => {
    const init: Record<number, RowValue> = {};
    INCOME_ROWS.forEach((r) => {
      init[r.no] = { loss: "", profit: "" };
    });
    return init;
  });

  const [deductions, setDeductions] = useState<Deductions>({
    personal: "",
    health: "",
    mortgage: "",
  });

  const [taxCalc, setTaxCalc] = useState<TaxCalc>({
    reduction: "",
    withholdingTax: "",
    advancePayments: "",
    foreignTax: "",
  });

  const [refundOption, setRefundOption] = useState<RefundOption>({
    choice: "",
    bankAccount: "",
  });

  const [dateSigned, setDateSigned] = useState(() => getTodayIsoString());

  // "za period od-do" iz zaglavlja: prazno = cijela godina (0101/3112);
  // kraći period kod početka/prestanka djelatnosti u toku godine
  const [periodOd, setPeriodOd] = useState("");
  const [periodDo, setPeriodDo] = useState("");

  const [kantonGpd, setKantonGpd] = useState<KantonKey | "">("");
  const [opcinaGpd, setOpcinaGpd] = useState("");
  const [ziroRacunGpd, setZiroRacunGpd] = useState("");
  const [loadingUplGpd, setLoadingUplGpd] = useState(false);

  /* ── Computed values ── */

  const computed = useMemo(() => {
    // Row 15 totals
    const sumLoss = INCOME_ROWS.filter((r) => r.no >= 9 && r.no <= 14).reduce(
      (a, r) => a + num(rows[r.no]?.loss ?? ""),
      0,
    );
    const sumProfit = INCOME_ROWS.filter((r) => r.no >= 8 && r.no <= 13).reduce(
      (a, r) => a + num(rows[r.no]?.profit ?? ""),
      0,
    );

    // Row 16 & 17
    const netLoss = sumLoss > sumProfit ? sumLoss - sumProfit : 0;
    const netProfit = sumProfit > sumLoss ? sumProfit - sumLoss : 0;

    // Row 21 - total deductions
    const totalDeductions =
      num(deductions.personal) +
      num(deductions.health) +
      num(deductions.mortgage);

    // Row 22-26
    const totalLossYear = netLoss;
    const totalIncomeYear = netProfit;
    const totalDeductionsCalc = totalDeductions;
    const taxBase = Math.max(
      totalIncomeYear - totalLossYear - totalDeductionsCalc,
      0,
    );
    const taxAmount = taxBase * 0.1;

    // Row 31
    const difference =
      taxAmount -
      num(taxCalc.reduction) -
      num(taxCalc.withholdingTax) -
      num(taxCalc.advancePayments) -
      num(taxCalc.foreignTax);

    return {
      sumLoss,
      sumProfit,
      netLoss,
      netProfit,
      totalDeductions,
      totalLossYear,
      totalIncomeYear,
      totalDeductionsCalc,
      taxBase,
      taxAmount,
      difference,
    };
  }, [rows, deductions, taxCalc]);

  const needsRefundOption = computed.difference < 0;

  useEffect(() => {
    if (!needsRefundOption) {
      refundRequiredRef.current?.setCustomValidity("");
    }
  }, [needsRefundOption]);

  /* ── Row update helper ── */

  const updateRow = useCallback(
    (no: number, field: "loss" | "profit", value: string) => {
      setRows((prev) => ({
        ...prev,
        [no]: { ...prev[no], [field]: value },
      }));
    },
    [],
  );

  /* ── Fill from profile/client ── */

  const [sourceClientId, setSourceClientId] = useState<number | null>(null);
  const [sourceOrgId, setSourceOrgId] = useState<number | null>(null);

  // "Prepiši" znači prepiši SVE: polje bez podatka se isprazni, ne smije
  // ostati vrijednost prethodnog izbora.
  const fillPersonal = useCallback((data: FillData) => {
    setPersonal((p) => ({
      ...p,
      jmb: data.jmbg ?? "",
      fullName: [data.firstName, data.lastName].filter(Boolean).join(" "),
      address: data.address ?? "",
      city: data.city ?? "",
      phone: data.phone ?? "",
      email: data.email ?? "",
    }));
    if (data.sourceClientId !== undefined)
      setSourceClientId(data.sourceClientId);
    if (data.sourceWorkerOrgId !== undefined)
      setSourceOrgId(data.sourceWorkerOrgId);
  }, []);

  /* ── PK Office prefill (/gpd?pkOrg=..&pkYear=..) ── */
  // Red 9 se puni iz reda 28 snimljenog SPR-1053 iste organizacije i godine,
  // lični odbitak iz porezne kartice vlasnika (koeficijent x 3.600 KM), a
  // uplaćene akontacije poreza se PREDLAŽU kao zbir uplata prema budžetu
  // kantona sa izvoda (korisnik potvrđuje ili ispravlja ručno).
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
      const [orgRes, formsRes, advRes] = await Promise.all([
        getOrganization(orgId),
        getForms("SPR"),
        searchBankTransactions(orgId, {
          category: "POREZ_DOHODAK_VLASNIKA",
          direction: "OUT",
          status: "CONFIRMED",
          dateFrom: `${year}-01-01`,
          dateTo: `${year}-12-31`,
          limit: 500,
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
      const notes: string[] = [];

      // Prepiši podatke vlasnika IZABRANE organizacije (prazno kad podatka
      // nema): "?? staro" bi zadržao vrijednosti prethodnog izbora.
      setPersonal((p) => ({
        ...p,
        jmb: owner?.jmbg ?? "",
        fullName:
          owner?.name ||
          [owner?.firstName, owner?.lastName].filter(Boolean).join(" ") ||
          "",
        address: owner?.address ?? "",
        city: owner?.city ?? "",
        taxYear: String(year).slice(-2),
      }));
      setSourceOrgId(orgId);

      // Red 9: dohodak iz reda 28 snimljenog SPR-a (org + godina, najnoviji)
      const sprForm = formsRes.ok
        ? formsRes.data
            .filter(
              (f) =>
                f.type === "SPR" &&
                f.year === year &&
                f.organization?.id === orgId,
            )
            .sort((a, b) => b.id - a.id)[0]
        : undefined;
      if (sprForm) {
        const docRes = await getDocument<SprData>(sprForm.id);
        if (cancelled) return;
        const row28 = docRes.ok ? docRes.data.data?.row28NetIncome : null;
        if (typeof row28 === "number" && row28 > 0) {
          setRows((prev) => ({
            ...prev,
            9: { ...prev[9], profit: fmt(row28) },
          }));
        } else {
          notes.push(
            `Snimljeni SPR-1053 za ${year}. ima dohodak 0, pa red 9 nije popunjen.`,
          );
        }
      } else {
        notes.push(
          `SPR-1053 za ${year}. nije pronađen za ovu organizaciju. Prvo pripremite i snimite SPR (red 9 se puni iz njegovog reda 28).`,
        );
      }

      // Lični odbitak: koeficijent iz porezne kartice x 300 KM x 12 mjeseci
      const coef = owner?.taxCoefficient;
      if (typeof coef === "number" && coef > 0) {
        setDeductions((d) => ({ ...d, personal: fmt(coef * 3600) }));
        notes.push(
          `Lični odbitak je izračunat iz koeficijenta porezne kartice vlasnika (${fmt(coef * 3600)} KM za punu godinu). Ako kartica ne pokriva cijelu godinu, ispravite iznos.`,
        );
      } else {
        notes.push(
          "Vlasnik nema upisan koeficijent porezne kartice, pa lični odbitak nije popunjen.",
        );
      }

      // Akontacije: zbir uplata prema budžetu kantona (prijedlog, ne KPR)
      if (advRes.ok && advRes.data.items.length > 0) {
        const sum = advRes.data.items.reduce(
          (a, tx) => a + (parseFloat(tx.amount) || 0),
          0,
        );
        if (sum > 0) {
          setTaxCalc((t) => ({ ...t, advancePayments: fmt(sum) }));
          notes.push(
            `Uplaćene akontacije poreza (${fmt(sum)} KM) su zbir ${advRes.data.items.length} uplata prema budžetu kantona sa izvoda u ${year}. Provjerite iznos prije predaje.`,
          );
        }
      } else {
        notes.push(
          `Na izvodima u ${year}. nisu pronađene uplate akontacija poreza: ako ste ih plaćali, unesite iznos ručno.`,
        );
      }

      setPkFill({ orgName: org.name, year, notes });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── PDF Export ── */

  const buildGpdData = useCallback((): GpdData => {
    return {
      // Dio 1
      jmb: personal.jmb,
      fullName: personal.fullName,
      taxYear: personal.taxYear,
      periodFrom: isoToDdMm(periodOd),
      periodTo: isoToDdMm(periodDo),
      address: formatAddress(personal.address, personal.city, findCity(personal.city)?.postalCode),
      contactChanged: personal.contactChanged,
      phone: personal.phone,
      email: personal.email,

      // Dio 2
      row8Profit: num(rows[8]?.profit ?? ""),
      row9Loss: num(rows[9]?.loss ?? ""),
      row9Profit: num(rows[9]?.profit ?? ""),
      row10Loss: num(rows[10]?.loss ?? ""),
      row10Profit: num(rows[10]?.profit ?? ""),
      row11Loss: num(rows[11]?.loss ?? ""),
      row11Profit: num(rows[11]?.profit ?? ""),
      row12Loss: num(rows[12]?.loss ?? ""),
      row12Profit: num(rows[12]?.profit ?? ""),
      row13Loss: num(rows[13]?.loss ?? ""),
      row13Profit: num(rows[13]?.profit ?? ""),
      row14Loss: num(rows[14]?.loss ?? ""),

      row15Loss: computed.sumLoss,
      row15Profit: computed.sumProfit,
      row16NetLoss: computed.netLoss,
      row17NetProfit: computed.netProfit,

      // Dio 3
      row18Personal: num(deductions.personal),
      row19Health: num(deductions.health),
      row20Mortgage: num(deductions.mortgage),
      row21TotalDeductions: computed.totalDeductions,

      // Dio 4
      row22Loss: computed.totalLossYear,
      row23Income: computed.totalIncomeYear,
      row24Deductions: computed.totalDeductionsCalc,
      row25TaxBase: computed.taxBase,
      row26Tax: computed.taxAmount,
      row27Reduction: num(taxCalc.reduction),
      row28Withholding: num(taxCalc.withholdingTax),
      row29Advance: num(taxCalc.advancePayments),
      row30Foreign: num(taxCalc.foreignTax),
      row31Difference: computed.difference,

      // Row 32
      refundChoice: refundOption.choice,
      bankAccount: refundOption.bankAccount,

      // Dio 5
      dateSigned: isoToFormatted(dateSigned),
    };
  }, [personal, rows, deductions, taxCalc, refundOption, dateSigned, computed, periodOd, periodDo]);

  const exportPdf = useCallback(async () => {
    const data = buildGpdData();
    const pdfBytes = await fillGpdTemplate(data);

    const pdfArrayBuffer: ArrayBuffer =
      pdfBytes.buffer instanceof ArrayBuffer
        ? pdfBytes.buffer.slice(
            pdfBytes.byteOffset,
            pdfBytes.byteOffset + pdfBytes.byteLength,
          )
        : Uint8Array.from(pdfBytes).buffer;

    // Trigger download
    const blob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GPD-1051_20${personal.taxYear || "XX"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("GPD_GENERATE", "GPD-1051");
  }, [buildGpdData, personal.taxYear]);

  const gpdYear = /^\d{2}$/.test(personal.taxYear)
    ? 2000 + parseInt(personal.taxYear)
    : /^\d{4}$/.test(personal.taxYear)
      ? parseInt(personal.taxYear)
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

  /* ── Export Uplatnica ── */

  const kantonGpdData = kantonGpd ? KANTONI[kantonGpd] : null;
  const opcinaGpdData =
    kantonGpdData?.opcine.find((o) => o.kod === opcinaGpd) ?? null;
  const canDownloadUplGpd =
    kantonGpd !== "" &&
    opcinaGpd !== "" &&
    computed.difference > 0 &&
    !!personal.taxYear;

  const handleExportUplatnica = async () => {
    if (!kantonGpd || !opcinaGpd || !opcinaGpdData) return;
    setLoadingUplGpd(true);
    try {
      const bytes = await fillGpdUplatnica({
        imeIPrezime: personal.fullName,
        adresa: formatAddress(personal.address, personal.city, findCity(personal.city)?.postalCode),
        jmbg: personal.jmb,
        godina: personal.taxYear,
        porez: computed.difference,
        kantonKey: kantonGpd,
        opcinaKod: opcinaGpd,
        opcinaIme: opcinaGpdData.ime,
        datum: dateSigned,
        ziroRacun: ziroRacunGpd || undefined,
      });
      const ab =
        bytes.buffer instanceof ArrayBuffer
          ? bytes.buffer.slice(
              bytes.byteOffset,
              bytes.byteOffset + bytes.byteLength,
            )
          : Uint8Array.from(bytes).buffer;
      const blob = new Blob([ab], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Uplatnica_Porez_GPD_${personal.taxYear || "XXXX"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoadingUplGpd(false);
    }
  };

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
        <div className={styles.label}>Obrazac GPD-1051</div>
        <h1 className={styles.h1}>
          GPD-1051 obrazac, godišnja prijava <em>poreza na dohodak</em>
        </h1>
        <p className={styles.subtitle}>
          Kako popuniti GPD-1051 obrazac? Godišnja prijava poreza na dohodak za
          fizičke osobe u FBiH. Unesite prihode od plaće, obrta, najma ili
          kapitala, automatski obračun i preuzimanje popunjenog PDF-a,
          besplatno i bez registracije.
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
                Podaci povučeni iz PK Office: {pkFill.orgName}, {pkFill.year}.
                godina.
              </strong>{" "}
              Dohodak od samostalne djelatnosti (red 9) dolazi iz snimljenog
              SPR-1053. Ostale izvore dohotka (plata kod poslodavca, najam...)
              unesite ručno. Sva polja ostaju editabilna.
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

      {/* ── Dio 1 ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 1, Podaci o <em>poreznom obvezniku</em>
          <Link
            href="/gpd/upute"
            className={styles.helpLink}
            title="Otvorite upute za popunjavanje GPD obrasca"
          >
            <span className={styles.helpLinkText}>Kako popuniti?</span>
            <span className={styles.helpBtn}>?</span>
          </Link>
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
              value={personal.jmb}
              onInvalid={(e) => {
                const el = e.currentTarget;
                if (el.validity.valueMissing) {
                  el.setCustomValidity("Unesite JMB.");
                } else if (
                  el.validity.patternMismatch ||
                  el.validity.tooShort ||
                  el.validity.tooLong
                ) {
                  el.setCustomValidity("JMB mora imati tačno 13 cifara.");
                } else {
                  el.setCustomValidity("Neispravan unos.");
                }
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setPersonal((s) => ({ ...s, jmb: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>5) Porezni period</label>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>20</span>
              <input
                className={styles.fieldInput}
                maxLength={2}
                minLength={2}
                inputMode="numeric"
                pattern="\d{2}"
                placeholder="25"
                style={{ width: 70 }}
                value={personal.taxYear}
                onInvalid={(e) => {
                  const el = e.currentTarget;
                  if (el.validity.valueMissing) {
                    el.setCustomValidity("Unesite porezni period.");
                  } else if (
                    el.validity.patternMismatch ||
                    el.validity.tooShort ||
                    el.validity.tooLong
                  ) {
                    el.setCustomValidity("Unesite 2 cifre (npr. 25).");
                  } else {
                    el.setCustomValidity("Neispravan unos.");
                  }
                }}
                onInput={(e) => e.currentTarget.setCustomValidity("")}
                onChange={(e) =>
                  setPersonal((s) => ({ ...s, taxYear: e.target.value }))
                }
              />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Za period od / do (prazno = cijela godina)
            </label>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <DateInput
                className={styles.fieldInput}
                value={periodOd}
                onValueChange={setPeriodOd}
              />
              <DateInput
                className={styles.fieldInput}
                value={periodDo}
                onValueChange={setPeriodDo}
              />
            </div>
          </div>
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
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>6) Telefon</label>
            <input
              className={styles.fieldInput}
              type="tel"
              placeholder="+387 61 111 111"
              value={personal.phone}
              onInvalid={(e) => {
                const el = e.currentTarget;
                el.setCustomValidity(
                  el.validity.valueMissing ? "Unesite broj telefona." : "",
                );
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setPersonal((s) => ({ ...s, phone: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>7) E-mail </label>
            <input
              className={styles.fieldInput}
              type="email"
              placeholder="email@primjer.ba"
              value={personal.email}
              onInvalid={(e) => {
                const el = e.currentTarget;
                if (el.validity.valueMissing) {
                  el.setCustomValidity("Unesite e-mail.");
                } else if (el.validity.typeMismatch) {
                  el.setCustomValidity("Unesite ispravan e-mail.");
                } else {
                  el.setCustomValidity("Neispravan unos.");
                }
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setPersonal((s) => ({ ...s, email: e.target.value }))
              }
            />
          </div>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <div className={styles.checkRow}>
              <input
                type="checkbox"
                id="contactChanged"
                checked={personal.contactChanged}
                onChange={(e) =>
                  setPersonal((s) => ({
                    ...s,
                    contactChanged: e.target.checked,
                  }))
                }
              />
              <label htmlFor="contactChanged" className={styles.checkLabel}>
                4) Kontakt podaci su se izmijenili od prošle godine
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dio 2 ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 2, Prijava <em>prihoda</em> ostvarenih tokom poreznog perioda
        </h2>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.incomeTable}>
            <thead>
              <tr>
                <th>R.br.</th>
                <th>Vrsta prihoda</th>
                <th>Iznos gubitka (KM)</th>
                <th>Iznos dobiti (KM)</th>
              </tr>
            </thead>
            <tbody>
              {INCOME_ROWS.map((r) => (
                <tr key={r.no}>
                  <td>{r.no}</td>
                  <td>{r.label}</td>
                  <td>
                    {r.lossEnabled ? (
                      <input
                        className={styles.rowInput}
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={rows[r.no]?.loss ?? ""}
                        onChange={(e) =>
                          updateRow(r.no, "loss", fmtInput(e.target.value))
                        }
                      />
                    ) : (
                      <span style={{ color: "var(--mid)", fontSize: "0.8rem" }}>
                        –
                      </span>
                    )}
                  </td>
                  <td>
                    {r.incomeEnabled ? (
                      <input
                        className={styles.rowInput}
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={rows[r.no]?.profit ?? ""}
                        onChange={(e) =>
                          updateRow(r.no, "profit", fmtInput(e.target.value))
                        }
                      />
                    ) : (
                      <span style={{ color: "var(--mid)", fontSize: "0.8rem" }}>
                        –
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {/* Row 15, Totals */}
              <tr className={styles.totalRow}>
                <td>15</td>
                <td>Ukupno</td>
                <td>
                  <span
                    className={`${styles.summaryValue} ${styles.lossValue}`}
                  >
                    {fmt(computed.sumLoss)}
                  </span>
                </td>
                <td>
                  <span
                    className={`${styles.summaryValue} ${styles.profitValue}`}
                  >
                    {fmt(computed.sumProfit)}
                  </span>
                </td>
              </tr>

              {/* Row 16, Net loss */}
              <tr className={styles.summaryRow}>
                <td>16</td>
                <td>Ukupni gubitak (kolona c &gt; d)</td>
                <td colSpan={2}>
                  <span
                    className={`${styles.summaryValue} ${styles.lossValue}`}
                  >
                    {fmt(computed.netLoss)} KM
                  </span>
                </td>
              </tr>

              {/* Row 17, Net profit */}
              <tr className={styles.summaryRow}>
                <td>17</td>
                <td>Ukupna dobit (kolona d &gt; c)</td>
                <td colSpan={2}>
                  <span
                    className={`${styles.summaryValue} ${styles.profitValue}`}
                  >
                    {fmt(computed.netProfit)} KM
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Dio 3 ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 3, Lični <em>odbici</em>
        </h2>
        <table className={styles.deductionTable}>
          <thead>
            <tr>
              <th>R.br.</th>
              <th>Opis odbitaka</th>
              <th>Iznos (KM)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>18</td>
              <td>Lični odbitak</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={deductions.personal}
                  onChange={(e) =>
                    setDeductions((s) => ({
                      ...s,
                      personal: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>19</td>
              <td>
                Uvećanje ličnih odbitaka za iznos troškova zdravstvenih usluga i
                nabavku lijekova (priložiti validnu dokumentaciju)
              </td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={deductions.health}
                  onChange={(e) =>
                    setDeductions((s) => ({
                      ...s,
                      health: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>20</td>
              <td>
                Uvećanje ličnih odbitaka za iznos kamate plaćene na stambeni
                kredit (priložiti validnu dokumentaciju)
              </td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={deductions.mortgage}
                  onChange={(e) =>
                    setDeductions((s) => ({
                      ...s,
                      mortgage: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr className={styles.totalRow}>
              <td>21</td>
              <td>Ukupni odbici</td>
              <td>
                <span className={styles.summaryValue}>
                  {fmt(computed.totalDeductions)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ── Dio 4 ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 4, Obračun <em>porezne obaveze</em>
        </h2>
        <table className={styles.calcTable}>
          <thead>
            <tr>
              <th>R.br.</th>
              <th>Vrsta troška</th>
              <th>Iznos (KM)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>22</td>
              <td>
                Ukupni gubitak za godinu ( ukoliko je u dijelu 2 red 16, kolona
                c unesen gubitak ){" "}
              </td>
              <td>
                <span className={styles.autoValue}>
                  {fmt(computed.totalLossYear)}
                </span>
              </td>
            </tr>
            <tr>
              <td>23</td>
              <td>
                Ukupan dohodak za godinu ( ukoliko je u dijelu 2 red 17, kolona
                d unesen dohodak ){" "}
              </td>
              <td>
                <span className={styles.autoValue}>
                  {fmt(computed.totalIncomeYear)}
                </span>
              </td>
            </tr>
            <tr>
              <td>24</td>
              <td>Ukupni odbici (u dijelu 3 red 21) </td>
              <td>
                <span className={styles.autoValue}>
                  {fmt(computed.totalDeductionsCalc)}
                </span>
              </td>
            </tr>
            <tr>
              <td>25</td>
              <td>Osnovica poreza na dohodak (23 − 22 − 24)</td>
              <td>
                <span className={`${styles.autoValue} ${styles.profitValue}`}>
                  {fmt(computed.taxBase)}
                </span>
              </td>
            </tr>
            <tr>
              <td>26</td>
              <td>Iznos porezne obaveze (25 × 0,1)</td>
              <td>
                <span className={`${styles.autoValue} ${styles.lossValue}`}>
                  {fmt(computed.taxAmount)}
                </span>
              </td>
            </tr>
            <tr>
              <td>27</td>
              <td>Umanjenje poreza po članu 35. stav 3. i članu 47. Zakona </td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={taxCalc.reduction}
                  onChange={(e) =>
                    setTaxCalc((s) => ({
                      ...s,
                      reduction: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>28</td>
              <td>Porez po odbitku</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={taxCalc.withholdingTax}
                  onChange={(e) =>
                    setTaxCalc((s) => ({
                      ...s,
                      withholdingTax: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>29</td>
              <td>Uplaćene akontacije poreza</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={taxCalc.advancePayments}
                  onChange={(e) =>
                    setTaxCalc((s) => ({
                      ...s,
                      advancePayments: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>30</td>
              <td>
                Plaćeni porez u inostranstvu, odnosno na drugoj teritoriji BiH
              </td>
              <td>
                <input
                  className={styles.rowInput}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={taxCalc.foreignTax}
                  onChange={(e) =>
                    setTaxCalc((s) => ({
                      ...s,
                      foreignTax: fmtInput(e.target.value),
                    }))
                  }
                />
              </td>
            </tr>
            <tr className={styles.resultRow}>
              <td>31</td>
              <td>
                Razlika poreza: za doplatu (+) / za povrat (−)
                <br />
                <small style={{ color: "var(--mid)" }}>
                  (26 − 27 − 28 − 29 − 30)
                </small>
              </td>
              <td>
                <span
                  className={`${styles.autoValue} ${
                    computed.difference >= 0
                      ? styles.resultPositive
                      : styles.resultNegative
                  }`}
                >
                  {computed.difference >= 0 ? "+" : "−"}
                  {fmt(Math.abs(computed.difference))} KM
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Row 32, Options */}
        <div style={{ marginTop: "1rem", paddingLeft: "0.5rem" }}>
          <div className={styles.fieldLabel} style={{ marginBottom: "0.5rem" }}>
            32) Označite odgovarajuću opciju *
          </div>
          <div className={styles.radioGroup}>
            <div className={styles.radioRow}>
              <input
                type="radio"
                name="refund"
                id="opt-advance"
                required={needsRefundOption}
                disabled={!needsRefundOption}
                ref={refundRequiredRef}
                checked={refundOption.choice === "advance"}
                onInvalid={(e) => {
                  const el = e.currentTarget;
                  el.setCustomValidity(
                    el.validity.valueMissing ? "Odaberite jednu opciju." : "",
                  );
                }}
                onChange={(e) => {
                  e.currentTarget.setCustomValidity("");
                  setRefundOption((s) => ({ ...s, choice: "advance" }));
                }}
              />
              <label htmlFor="opt-advance" className={styles.radioLabel}>
                a. Iskoristite preplatu kao akontaciju poreza za sljedeću godinu
              </label>
            </div>
            <div className={styles.radioRow}>
              <input
                type="radio"
                name="refund"
                disabled={!needsRefundOption}
                id="opt-refund"
                checked={refundOption.choice === "refund"}
                onChange={() => {
                  refundRequiredRef.current?.setCustomValidity("");
                  setRefundOption((s) => ({ ...s, choice: "refund" }));
                }}
              />
              <label htmlFor="opt-refund" className={styles.radioLabel}>
                b. Prijavljujem se za povrat ovog poreza
              </label>
            </div>
          </div>
          {needsRefundOption && refundOption.choice === "refund" && (
            <div className={styles.accountInput}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Broj tekućeg računa *
                </label>
                <input
                  className={styles.fieldInput}
                  style={{ maxWidth: 300 }}
                  placeholder="XXX-XXX-XXXXXXXX-XX"
                  inputMode="numeric"
                  required
                  value={refundOption.bankAccount}
                  onInvalid={(e) => {
                    const el = e.currentTarget;
                    el.setCustomValidity(
                      el.validity.valueMissing
                        ? "Unesite broj tekućeg računa."
                        : "",
                    );
                  }}
                  onInput={(e) => e.currentTarget.setCustomValidity("")}
                  onChange={(e) =>
                    setRefundOption((s) => ({
                      ...s,
                      bankAccount: formatBankAccount(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Dio 5 ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 5, Izjava <em>poreznog obveznika</em>
        </h2>
        <p className={styles.izjavaText}>
          Upoznat/a sam sa sankcijama propisanim Zakonom o Poreznoj upravi FBiH
          i izjavljujem da su svi podaci navedeni u ovoj prijavi, uključujući i
          podatke u svim priloženim obrascima, tačni, potpuni i jasni.
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
          type="GPD"
          year={gpdYear}
          title={`GPD-1051 · ${personal.fullName} · ${gpdYear ?? "?"}`}
          buildData={buildGpdData}
          disabled={gpdYear === null}
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
      <p
        className={styles.izjavaText}
        style={{ textAlign: "center", marginTop: "2rem" }}
      >
        Napomena: Preporučuje se štampanje obrazca u dva primjerka.
      </p>

      {/* ── Uplatnica ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Uplatnica, <em>porez na dohodak</em>
        </h2>
        {computed.difference <= 0 ? (
          <p className={styles.izjavaText}>
            Nema poreza za uplatu (razlika u redu 31 nije pozitivna).
          </p>
        ) : (
          <>
            <p className={styles.izjavaText}>
              Odaberite kanton i općinu te preuzmite popunjenu uplatnicu za
              uplatu poreza na dohodak kantonalnom budžetu.
            </p>
            <div className={styles.fieldGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Kanton</label>
                <StyledSelect
                  ariaLabel="Kanton"
                  placeholder="– Odaberite kanton –"
                  value={kantonGpd || null}
                  onChange={(v) => {
                    setKantonGpd(String(v) as KantonKey);
                    setOpcinaGpd("");
                  }}
                  groups={[
                    {
                      options: KANTON_KEYS.map((k) => ({
                        value: k,
                        label: KANTONI[k].ime,
                      })),
                    },
                  ]}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Općina</label>
                <StyledSelect
                  ariaLabel="Općina"
                  placeholder="– Odaberite općinu –"
                  searchable
                  searchPlaceholder="Pretraži općinu..."
                  disabled={!kantonGpd}
                  value={opcinaGpd || null}
                  onChange={(v) => setOpcinaGpd(String(v))}
                  groups={[
                    {
                      options: (kantonGpdData?.opcine ?? []).map((o) => ({
                        value: o.kod,
                        label: o.ime,
                      })),
                    },
                  ]}
                />
              </div>
              <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
                <label className={styles.fieldLabel}>
                  Žiro račun pošiljatelja
                </label>
                <input
                  className={styles.fieldInput}
                  inputMode="numeric"
                  placeholder="338-000-12345678-90"
                  value={ziroRacunGpd}
                  onChange={(e) =>
                    setZiroRacunGpd(formatBankAccount(e.target.value))
                  }
                />
                <p className={styles.hint}>
                  Ukoliko plaćate preko žiro računa, unesite vaš žiro račun. Ako
                  plaćate u gotovini, ostavite prazno.
                </p>
              </div>
            </div>

            <div className={styles.uplUplatnicaInfo}>
              <div className={styles.uplCard}>
                <span className={styles.uplCardNum}>1</span>
                <div>
                  <div className={styles.uplCardTitle}>
                    Porez na dohodak, kantonalni budžet
                  </div>
                  <div className={styles.uplCardSub}>
                    {kantonGpdData
                      ? `${kantonGpdData.budzet} · Budžet ${kantonGpdData.genitiv}`
                      : "Odaberite kanton"}
                  </div>
                </div>
                <span className={`${styles.uplCardIznos} ${styles.taxDue}`}>
                  {fmt(computed.difference)} KM
                </span>
              </div>
            </div>

            <div className={styles.actions} style={{ marginTop: "1.5rem" }}>
              <button
                type="button"
                className={styles.exportBtn}
                onClick={handleExportUplatnica}
                disabled={loadingUplGpd || !canDownloadUplGpd}
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
                {loadingUplGpd ? "Generisanje..." : "Preuzmi uplatnicu (PDF)"}
              </button>
            </div>
          </>
        )}
      </section>

      <p className={styles.dataNapomena}>
        Porezni kalkulator ne zadržava popunjene podatke ni u kojem obliku.
        Nakon spremanja PDF dokumenta uvijek provjerite tačnost podataka.
      </p>

      {/* ── Edukativni sadržaj (SEO) ─────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Šta je GPD-1051 <em>obrazac</em>?
        </h2>
        <p>
          <strong>GPD-1051</strong> je godišnja prijava poreza na dohodak fizičkih
          lica u Federaciji BiH. Objedinjuje sve izvore dohotka koje je porezni
          obveznik ostvario tokom kalendarske godine, od plate, samostalne
          djelatnosti, imovine, kapitala i ostalih izvora, i izračunava konačnu
          poreznu obavezu po stopi od 10%.
        </p>
        <p style={{ marginTop: "0.85rem" }}>GPD-1051 obavezno podnose:</p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>osobe koje su radile kod više poslodavaca tokom iste godine,</li>
          <li>obrtnici i nositelji samostalnih djelatnosti (uz SPR-1053 prilog),</li>
          <li>osobe sa prihodima iz inostranstva,</li>
          <li>osobe koje su ostvarile dohodak od imovine, kapitala ili ostalih izvora,</li>
          <li>svi koji traže povrat preplaćenog poreza.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Kako popuniti GPD-1051 obrazac u <em>4 koraka</em>
        </h2>
        <ol style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <strong>Unesite lične podatke</strong>, ime, prezime, JMB, adresa
            prebivališta i nadležna porezna ispostava. Registrovani korisnici
            imaju automatsku popunu iz profila.
          </li>
          <li>
            <strong>Unesite sve izvore dohotka</strong>, plate (iz radnog
            odnosa), dohodak iz samostalne djelatnosti (iz SPR-1053), dohodak
            od imovine, kapitala i ostali dohodci. Dodajte i akontacije poreza
            koje su već plaćene tokom godine.
          </li>
          <li>
            <strong>Iskoristite lične odbitke</strong>, osnovni odbitak (300 KM
            mjesečno × 12 = 3.600 KM godišnje), odbici za uzdržavane članove
            porodice, plaćeni doprinos za zdravstveno i kamate na stambene
            kredite.
          </li>
          <li>
            <strong>Preuzmite popunjen GPD-1051 PDF</strong> spreman za predaju
            uz priloge (SPR-1053, ZO3, potvrde poslodavaca i sl.).
          </li>
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Rok za predaju GPD-1051 <em>obrasca</em>
        </h2>
        <p>
          GPD-1051 obrazac se predaje <strong>do 31. marta tekuće godine</strong>{" "}
          za prethodnu kalendarsku godinu. Npr. obrazac za 2025. godinu predaje
          se najkasnije do <strong>31.03.2026.</strong> u nadležnoj ispostavi
          Porezne uprave FBiH prema mjestu prebivališta poreznog obveznika.
        </p>
        <p style={{ marginTop: "0.85rem" }}>
          Kasno podnošenje može rezultirati prekršajnom kaznom prema Zakonu o
          Poreznoj upravi FBiH. Preporučujemo predaju u februaru ili početkom
          marta radi izbjegavanja gužvi.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Lični <em>odbici</em> i povrat poreza
        </h2>
        <p>
          Lični odbici smanjuju oporezivi dohodak prije obračuna poreza po stopi
          od 10%. Osnovni lični odbitak iznosi <strong>300 KM mjesečno (3.600 KM
          godišnje)</strong> i pripada svakom poreznom obvezniku rezidentu FBiH.
        </p>
        <p style={{ marginTop: "0.85rem" }}>Dodatni odbici postoje za:</p>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>uzdržavane članove porodice (supružnik, djeca, roditelji),</li>
          <li>plaćeni doprinos za zdravstveno osiguranje,</li>
          <li>plaćene kamate na stambeni kredit,</li>
          <li>uplaćene premije dobrovoljnog penzionog osiguranja.</li>
        </ul>
        <p style={{ marginTop: "0.85rem" }}>
          Ako su akontacije poreza plaćene tokom godine veće od konačne porezne
          obaveze, imate pravo na <strong>povrat razlike</strong>. Zahtjev za
          povrat se podnosi zajedno sa GPD obrascem i Porezna uprava je dužna
          izvršiti povrat u zakonskom roku.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Povezani <em>alati</em>
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.9 }}>
          <li>
            <a href="/spr" style={{ color: "var(--sage)", fontWeight: 600 }}>
              SPR-1053, specifikacija dohotka samostalne djelatnosti
            </a>,{" "}
            obavezan prilog uz GPD-1051 za obrtnike i slobodna zanimanja.
          </li>
          <li>
            <a href="/zo3" style={{ color: "var(--sage)", fontWeight: 600 }}>
              ZO3 obrazac
            </a>,{" "}
            prijava člana porodice na zdravstveno osiguranje (za odbitak za
            uzdržavane).
          </li>
          <li>
            <a href="/ams" style={{ color: "var(--sage)", fontWeight: 600 }}>
              AMS-1035, akontacija po odbitku
            </a>,{" "}
            za prihode iz inostranstva tokom godine, ulaze u GPD.
          </li>
          <li>
            <a href="/preracun-neto-bruto" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Preračun neto/bruto plate
            </a>,{" "}
            provjera obračunatih poreza i doprinosa.
          </li>
        </ul>
        <h2 className={styles.sectionTitle} style={{ marginTop: "2rem" }}>
          Pročitaj <em>na blogu</em>
        </h2>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem", lineHeight: 1.9 }}>
          <li>
            <a href="/vodici/gpd-1051-korak-po-korak" style={{ color: "var(--sage)", fontWeight: 600 }}>
              GPD-1051 korak po korak
            </a>,{" "}
            detaljan vodič kroz godišnju prijavu poreza na dohodak.
          </li>
          <li>
            <a href="/vodici/obrt-vs-doo-2026" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Obrt vs d.o.o. 2026
            </a>,{" "}
            koja forma se više isplati i kako se oporezuje.
          </li>
          <li>
            <a href="/vodici/priznati-rashodi-obrta-2026" style={{ color: "var(--sage)", fontWeight: 600 }}>
              Priznati rashodi obrta
            </a>,{" "}
            šta smanjuje poreznu osnovicu.
          </li>
        </ul>
      </section>

      <FaqSection
        items={[
          {
            q: "Ko je obavezan podnijeti GPD-1051 obrazac?",
            a: "Godišnju prijavu poreza na dohodak obavezno podnosi svaka fizička osoba, rezident FBiH, koja je tokom godine ostvarila dohodak koji podliježe oporezivanju, uključujući dohotke od nesamostalne djelatnosti, samostalne djelatnosti, imovine i imovinskih prava, kapitala i ostale dohotke.",
          },
          {
            q: "Koji je rok za predaju GPD obrasca?",
            a: "GPD-1051 obrazac predaje se najkasnije do 31. marta tekuće godine za prethodnu kalendarsku godinu. Kasno podnošenje može rezultirati novčanom kaznom od strane Porezne uprave FBiH.",
          },
          {
            q: "Ko ne mora podnositi godišnju prijavu poreza?",
            a: "Osobe čiji su ukupni godišnji prihodi manji od iznosa godišnjeg ličnog odbitka (trenutno 3.600 KM), te osobe koje su ostvarile isključivo dohodak od nesamostalne djelatnosti kod jednog poslodavca koji je pravilno obračunavao i uplaćivao akontacije poreza, generalno nisu obavezne na podnošenje GPD obrasca.",
          },
          {
            q: "Šta su lični odbici i kako ih koristim?",
            a: "Lični odbitak je iznos koji se oduzima od ukupnog dohotka prije obračuna poreza. Osnovni lični odbitak iznosi 300 KM mjesečno (3.600 KM godišnje). Dodatni odbici postoje za uzdržavane članove porodice, doprinos za zdravstveno osiguranje i plaćene kamate na stambene kredite.",
          },
          {
            q: "Šta ako sam radio kod više poslodavaca tokom godine?",
            a: "Ukoliko ste tokom iste godine primali plaću od više poslodavaca, obavezni ste podnijeti godišnju prijavu poreza. Svaki poslodavac je obračunavao porez posebno, što može rezultirati razlikom u konačnoj poreznoj obavezi.",
          },
          {
            q: "Mogu li tražiti povrat poreza putem GPD obrasca?",
            a: "Da. Ukoliko su akontacije poreza plaćene tokom godine veće od stvarne godišnje porezne obaveze, imate pravo na povrat razlike. Zahtjev za povrat se podnosi zajedno sa GPD obrascem, a Porezna uprava je dužna izvršiti povrat u zakonskom roku.",
          },
        ]}
      />
    </form>
  );
}
