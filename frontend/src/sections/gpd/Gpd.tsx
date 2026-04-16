"use client";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import styles from "./gpd.module.css";
import { fillGpdTemplate, type GpdData } from "src/sections/gpd/fillGpd";

/* ── Row definitions ── */

const INCOME_ROWS = [
  {
    no: 8,
    label:
      "Dohodak od nesamostalne djelatnosti i/ili dohodak članova predstavničkih organa vlasti (Unijeti ukupan iznos iz kolone 11, godišnjeg-ih izvještaja o ukupnim isplaćenim plaćama i drugim ličnim primanjima (obrazac GIP-1022)  i priložiti primjerak izvještaja od svakog poslodavca ",
    lossEnabled: false,
  },
  {
    no: 9,
    label:
      "Dohodak od samostalne djelatnosti (Unijeti ukupan iznos iz reda 28 specifikacije za utvrđivanje dohotka od samostalne djelatnosti (obrazac SPR-1053))",
    lossEnabled: true,
  },
  {
    no: 10,
    label:
      "Dohodak od poljoprivrede i šumarstva (Unijeti ukupan iznos iz reda 28 specifikacije za utvrđivanje dohotka od samostalne djelatnosti - obrazac SPR-1053) ",
    lossEnabled: true,
  },
  {
    no: 11,
    label:
      "Dohodak od iznajmljivanja imovine (čl. 20. st. 1. tč. 1. i 3. i stav 5. Zakona) /Unijeti ukupan iznos iz reda 18 pregleda prihoda i rashoda od iznajmljivanja nepokretne imovine - obrazac PRIM 1054. U slučaju da se obveznik opredijelio za rashode u paušalnom iznosu uz godišnju prijavu priložiti ugovor o iznajmljivanju / ",
    lossEnabled: true,
  },
  {
    no: 12,
    label:
      "Dohodak od vremenski ograničenog ustupanja prava (član 21. stav 2.)  / Uz godišnju prijavu priložiti ugovor o vremenski ograničenom ustupanju imovinskih prava / ",
    lossEnabled: true,
  },
  {
    no: 13,
    label:
      "Dohodak od drugih samostalnih djelatnosti koje nisu navedene ovdje / veza sa obrascima AUG-1031 (kolona 13) i  ASD-1032 (kolona 10 )/ ",
    lossEnabled: true,
  },
  { no: 14, label: "Poslovni gubitak iz ranijih godina", lossEnabled: true },
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
  const formRef = useRef<HTMLFormElement | null>(null);
  const refundRequiredRef = useRef<HTMLInputElement | null>(null);

  const [personal, setPersonal] = useState<PersonalData>({
    jmb: "",
    fullName: "",
    address: "",
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

  /* ── PDF Export ── */

  const exportPdf = useCallback(async () => {
    const data: GpdData = {
      // Dio 1
      jmb: personal.jmb,
      fullName: personal.fullName,
      taxYear: personal.taxYear,
      address: personal.address,
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
  }, [personal, rows, deductions, taxCalc, refundOption, dateSigned, computed]);

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
        <div className={styles.label}>Obrazac GPD-1051</div>
        <h1 className={styles.h1}>
          Godišnja prijava <em>poreza na dohodak</em>
        </h1>
        <p className={styles.subtitle}>
          Popunite podatke i preuzmite popunjeni obrazac u PDF formatu.
        </p>
      </div>

      {/* ── Dio 1 ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 1 — Podaci o <em>poreznom obvezniku</em>
        </h2>
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
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>3) Adresa</label>
            <input
              className={styles.fieldInput}
              placeholder="Ulica, broj, grad, poštanski broj"
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
          Dio 2 — Prijava <em>prihoda</em> ostvarenih tokom poreznog perioda
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
                          updateRow(r.no, "loss", e.target.value)
                        }
                      />
                    ) : (
                      <span style={{ color: "var(--mid)", fontSize: "0.8rem" }}>
                        —
                      </span>
                    )}
                  </td>
                  <td>
                    <input
                      className={styles.rowInput}
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={rows[r.no]?.profit ?? ""}
                      onChange={(e) =>
                        updateRow(r.no, "profit", e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))}

              {/* Row 15 — Totals */}
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

              {/* Row 16 — Net loss */}
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

              {/* Row 17 — Net profit */}
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
          Dio 3 — Lični <em>odbici</em>
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
                    setDeductions((s) => ({ ...s, personal: e.target.value }))
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
                    setDeductions((s) => ({ ...s, health: e.target.value }))
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
                    setDeductions((s) => ({ ...s, mortgage: e.target.value }))
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
          Dio 4 — Obračun <em>porezne obaveze</em>
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
                    setTaxCalc((s) => ({ ...s, reduction: e.target.value }))
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
                      withholdingTax: e.target.value,
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
                      advancePayments: e.target.value,
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
                    setTaxCalc((s) => ({ ...s, foreignTax: e.target.value }))
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

        {/* Row 32 — Options */}
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
                  placeholder="npr. 1234567890123456"
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
                      bankAccount: e.target.value,
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
          Dio 5 — Izjava <em>poreznog obveznika</em>
        </h2>
        <p className={styles.izjavaText}>
          Upoznat/a sam sa sankcijama propisanim Zakonom o Poreznoj upravi FBiH
          i izjavljujem da su svi podaci navedeni u ovoj prijavi, uključujući i
          podatke u svim priloženim obrascima, tačni, potpuni i jasni.
        </p>
        <div className={styles.dateField}>
          <span className={styles.dateLabel}>Datum: *</span>
          <input
            className={styles.fieldInput}
            type="date"
            required
            style={{ maxWidth: 200 }}
            value={dateSigned}
            onInvalid={(e) => {
              const el = e.currentTarget;
              el.setCustomValidity(
                el.validity.valueMissing ? "Odaberite datum." : "",
              );
            }}
            onInput={(e) => e.currentTarget.setCustomValidity("")}
            onChange={(e) => setDateSigned(e.target.value)}
          />
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
