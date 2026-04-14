"use client";
import { useMemo, useState, useCallback, useRef } from "react";
import styles from "./spr.module.css";
import { fillSprTemplate, type SprData } from "./fillSpr";

/* ── Helpers ── */

const num = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const fmt = (n: number) => n.toFixed(2);

/* ── Component ── */

export default function SprForm() {
  const formRef = useRef<HTMLFormElement | null>(null);

  /* ── Dio 1 — Podaci o poreznom obvezniku ── */
  const [personal, setPersonal] = useState({
    jmbOsobni: "",
    fullName: "",
    address: "",
  });

  /* ── Dio 2 — Podaci o djelatnosti ── */
  const [business, setBusiness] = useState({
    jibJmb: "",
    periodFrom: "",
    periodTo: "",
    contactChanged: false,
    name: "",
    address: "",
    activityType: "",
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

  const [dateSigned, setDateSigned] = useState("");

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

    return { totalIncome, totalExpenses, netIncome };
  }, [income, expenses, adjustments]);

  /* ── PDF Export ── */

  const exportPdf = useCallback(async () => {
    const adj = num(adjustments.row27);
    const adjSigned = adjustments.sign === "-" ? -adj : adj;

    const data: SprData = {
      jmbOsobni: personal.jmbOsobni,
      fullName: personal.fullName,
      address: personal.address,

      jibJmb: business.jibJmb,
      periodFrom: business.periodFrom,
      periodTo: business.periodTo,
      contactChanged: business.contactChanged,
      businessName: business.name,
      businessAddress: business.address,
      activityType: business.activityType,

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
      row29PersonalDeduction: num(adjustments.row29),
      signAdjustment: adjustments.sign,

      dateSigned,
    };

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
    a.download = `SPR-1053_${business.periodFrom || "XXXXXXXX"}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [personal, business, income, expenses, adjustments, dateSigned, computed]);

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
        <div className={styles.label}>Obrazac SPR-1053</div>
        <h1 className={styles.h1}>
          Specifikacija za utvrđivanje dohotka <em>od samostalne djelatnosti</em>
        </h1>
        <p className={styles.subtitle}>
          Popunite podatke i preuzmite popunjeni obrazac u PDF formatu.
        </p>
      </div>

      {/* ── Dio 1 — Podaci o poreznom obvezniku ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 1 — Podaci o <em>poreznom obvezniku</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>1) JMB *</label>
            <input
              className={styles.fieldInput}
              required
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
                else if (
                  el.validity.patternMismatch ||
                  el.validity.tooShort
                )
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
            <label className={styles.fieldLabel}>2) Prezime i ime *</label>
            <input
              className={styles.fieldInput}
              required
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
            <label className={styles.fieldLabel}>3) Adresa *</label>
            <input
              className={styles.fieldInput}
              required
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
        </div>
      </section>

      {/* ── Dio 2 — Podaci o djelatnosti ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 2 — Podaci o <em>djelatnosti</em>
        </h2>
        <div className={styles.fieldGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>4) JIB/JMB djelatnosti *</label>
            <input
              className={styles.fieldInput}
              required
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
                else if (
                  el.validity.patternMismatch ||
                  el.validity.tooShort
                )
                  el.setCustomValidity("JIB/JMB mora imati tačno 13 cifara.");
                else el.setCustomValidity("Neispravan unos.");
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setBusiness((s) => ({ ...s, jibJmb: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup} />
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>5) Period od *</label>
            <input
              className={styles.fieldInput}
              required
              maxLength={8}
              minLength={8}
              inputMode="numeric"
              pattern="\d{8}"
              placeholder="ddMMyyyy (npr. 01012025)"
              value={business.periodFrom}
              onInvalid={(e) => {
                const el = e.currentTarget;
                if (el.validity.valueMissing)
                  el.setCustomValidity("Unesite početni datum perioda.");
                else
                  el.setCustomValidity("Format: ddMMyyyy (8 cifara).");
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setBusiness((s) => ({ ...s, periodFrom: e.target.value }))
              }
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>6) Period do *</label>
            <input
              className={styles.fieldInput}
              required
              maxLength={8}
              minLength={8}
              inputMode="numeric"
              pattern="\d{8}"
              placeholder="ddMMyyyy (npr. 31122025)"
              value={business.periodTo}
              onInvalid={(e) => {
                const el = e.currentTarget;
                if (el.validity.valueMissing)
                  el.setCustomValidity("Unesite krajnji datum perioda.");
                else
                  el.setCustomValidity("Format: ddMMyyyy (8 cifara).");
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setBusiness((s) => ({ ...s, periodTo: e.target.value }))
              }
            />
          </div>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>8) Naziv djelatnosti *</label>
            <input
              className={styles.fieldInput}
              required
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
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>
              9) Adresa poslovne djelatnosti *
            </label>
            <input
              className={styles.fieldInput}
              required
              placeholder="Adresa obavljanja djelatnosti"
              value={business.address}
              onInvalid={(e) => {
                const el = e.currentTarget;
                el.setCustomValidity(
                  el.validity.valueMissing
                    ? "Unesite adresu djelatnosti."
                    : "",
                );
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setBusiness((s) => ({ ...s, address: e.target.value }))
              }
            />
          </div>
          <div className={`${styles.fieldGroup} ${styles.fieldFull}`}>
            <label className={styles.fieldLabel}>
              10) Vrsta djelatnosti — šifra i naziv *
            </label>
            <input
              className={styles.fieldInput}
              required
              placeholder="Npr. 47.11 - Trgovina na malo"
              value={business.activityType}
              onInvalid={(e) => {
                const el = e.currentTarget;
                el.setCustomValidity(
                  el.validity.valueMissing
                    ? "Unesite šifru i naziv djelatnosti."
                    : "",
                );
              }}
              onInput={(e) => e.currentTarget.setCustomValidity("")}
              onChange={(e) =>
                setBusiness((s) => ({ ...s, activityType: e.target.value }))
              }
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

      {/* ── Dio 3 — Prihodi ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 3 — <em>Prihodi</em>
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
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={income.row11}
                  onChange={(e) =>
                    setIncome((s) => ({ ...s, row11: e.target.value }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>12</td>
              <td>U naturi</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={income.row12}
                  onChange={(e) =>
                    setIncome((s) => ({ ...s, row12: e.target.value }))
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
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={income.row13}
                  onChange={(e) =>
                    setIncome((s) => ({ ...s, row13: e.target.value }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>14</td>
              <td>Ostali prihodi</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={income.row14}
                  onChange={(e) =>
                    setIncome((s) => ({ ...s, row14: e.target.value }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>15</td>
              <td>Knjigovodstvena vrijednost rasknjiženih stalnih sredstava</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={income.row15}
                  onChange={(e) =>
                    setIncome((s) => ({ ...s, row15: e.target.value }))
                  }
                />
              </td>
            </tr>
            <tr className={styles.totalRow}>
              <td>16</td>
              <td>Prihodi ukupno (zbir redova 11 do 15)</td>
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

      {/* ── Dio 4 — Rashodi ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 4 — <em>Rashodi</em>
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
                Nabavna vrijednost prodane robe, utrošenog materijala i dr.
              </td>
              <td>
                <input
                  className={styles.rowInput}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={expenses.row17}
                  onChange={(e) =>
                    setExpenses((s) => ({ ...s, row17: e.target.value }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>18</td>
              <td>Bruto plaće</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={expenses.row18}
                  onChange={(e) =>
                    setExpenses((s) => ({ ...s, row18: e.target.value }))
                  }
                />
              </td>
            </tr>
            <tr>
              <td>19</td>
              <td>Doprinosi na plaću</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={expenses.row19}
                  onChange={(e) =>
                    setExpenses((s) => ({ ...s, row19: e.target.value }))
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
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={expenses.row20}
                  onChange={(e) =>
                    setExpenses((s) => ({ ...s, row20: e.target.value }))
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
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={expenses.row21}
                  onChange={(e) =>
                    setExpenses((s) => ({ ...s, row21: e.target.value }))
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
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={expenses.row22}
                  onChange={(e) =>
                    setExpenses((s) => ({ ...s, row22: e.target.value }))
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
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={expenses.row23}
                  onChange={(e) =>
                    setExpenses((s) => ({ ...s, row23: e.target.value }))
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

      {/* ── Dio 5 — Utvrđivanje dohotka ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Dio 5 — Utvrđivanje <em>dohotka iz djelatnosti</em>
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  Porezne korekcije
                  <select
                    className={styles.fieldInput}
                    style={{ width: 60, padding: "0.3rem" }}
                    value={adjustments.sign}
                    onChange={(e) =>
                      setAdjustments((s) => ({
                        ...s,
                        sign: e.target.value as "+" | "-" | "",
                      }))
                    }
                  >
                    <option value="">±</option>
                    <option value="+">+</option>
                    <option value="-">−</option>
                  </select>
                </div>
              </td>
              <td>
                <input
                  className={styles.rowInput}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={adjustments.row27}
                  onChange={(e) =>
                    setAdjustments((s) => ({ ...s, row27: e.target.value }))
                  }
                />
              </td>
            </tr>
            <tr className={styles.resultRow}>
              <td>28</td>
              <td>
                Dohodak iz djelatnosti (25 − 26 ± 27)
              </td>
              <td>
                <span
                  className={`${styles.autoValue} ${styles.profitValue}`}
                >
                  {fmt(computed.netIncome)} KM
                </span>
              </td>
            </tr>
            <tr>
              <td>29</td>
              <td>Lični odbitak</td>
              <td>
                <input
                  className={styles.rowInput}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={adjustments.row29}
                  onChange={(e) =>
                    setAdjustments((s) => ({ ...s, row29: e.target.value }))
                  }
                />
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
