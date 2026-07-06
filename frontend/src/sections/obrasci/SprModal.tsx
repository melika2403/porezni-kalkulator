"use client";

// SPR-1053 direktno u PK Office: cifre se povuku iz knjiga (KPR + PLDI
// amortizacija), korisnik pregleda i doštima, pa odmah preuzme PDF i snimi
// na profil (spremljeni SPR dalje puni GPD red 9). Raspored i nazivi redova
// prate marketing /spr generator (službeni obrazac), dizajn je PK Office.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "src/components/app-shell/Modal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { parseDateInput } from "src/lib/dateInput";
import { getOrganization, type Organization } from "src/api/profile";
import { getKpr, searchBankTransactions } from "src/api/bankStatements";
import { getAmortizacija } from "src/api/amortizacija";
import { calcRow } from "src/sections/amortizacija/Amortizacija";
import { fillSprTemplate, type SprData } from "src/sections/spr/fillSpr";
import { saveDocument } from "src/api/documents";
import { formatKm, parseKm } from "src/lib/amountInput";

const n0 = (v: string) => parseKm(v) ?? 0;
const disp = (n: number) => (n > 0 ? formatKm(n) : "");

// Display datum → kompakt ddMMyyyy za PDF; fallback kad unos nije validan.
function toCompact(display: string, fallback: string) {
  const iso = parseDateInput(display);
  if (!iso) return fallback;
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}${m}${y}` : fallback;
}

// Broj mjeseci perioda (za red 29), kao na marketing formi.
function monthsBetween(fromDisplay: string, toDisplay: string) {
  const a = parseDateInput(fromDisplay);
  const b = parseDateInput(toDisplay);
  if (!a || !b) return 12;
  const d1 = new Date(a);
  const d2 = new Date(b);
  const m =
    (d2.getFullYear() - d1.getFullYear()) * 12 +
    (d2.getMonth() - d1.getMonth()) +
    1;
  return Math.min(Math.max(m, 1), 12);
}

function triggerDownload(bytes: Uint8Array, filename: string) {
  const buf: ArrayBuffer =
    bytes.buffer instanceof ArrayBuffer
      ? bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      : Uint8Array.from(bytes).buffer;
  const url = URL.createObjectURL(new Blob([buf], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Prefill = {
  org: Organization;
  // null = paušalni režim ili KPR nedostupan (cifre se ne povlače)
  totals: {
    k11: number;
    k12: number;
    k13: number;
    k16: number;
    k17: number;
    k18: number;
    k19: number;
  } | null;
  amortTotal: number | null; // null = PLDI za godinu ne postoji
  unmatched: number;
};

type IncomeState = Record<"row11" | "row12" | "row13" | "row14" | "row15", string>;
type ExpenseState = Record<
  "row17" | "row18" | "row19" | "row20" | "row21" | "row22" | "row23",
  string
>;

// Nazivi redova identični marketing /spr generatoru (službeni obrazac).
const INCOME_ROWS: { key: keyof IncomeState; no: number; label: string }[] = [
  { key: "row11", no: 11, label: "U gotovini shodno poslovnim knjigama" },
  {
    key: "row12",
    no: 12,
    label: "Preko bankovnog računa shodno poslovnim knjigama",
  },
  {
    key: "row13",
    no: 13,
    label: "U stvarima i uslugama shodno poslovnim knjigama",
  },
  {
    key: "row14",
    no: 14,
    label: "Izuzimanja ekonomskih dobara (čl. 14. stav 4. Zakona)",
  },
  { key: "row15", no: 15, label: "Izuzimanja usluga (čl. 14. stav 4. Zakona)" },
];

const EXPENSE_ROWS: { key: keyof ExpenseState; no: number; label: string }[] = [
  {
    key: "row17",
    no: 17,
    label:
      "Nabavna vrijednost robe i/ili materijala shodno poslovnim knjigama sa uračunatim PDV-om, a za obveznike koji su registrirani PDV obveznici, bez PDV-a",
  },
  {
    key: "row18",
    no: 18,
    label: "Bruto plaće zaposlenika shodno poslovnim knjigama",
  },
  {
    key: "row19",
    no: 19,
    label: "Plaćeni doprinosi prema osnovici za poslodavca i na teret poslodavca",
  },
  { key: "row20", no: 20, label: "Ostali rashodi shodno poslovnim knjigama" },
  {
    key: "row21",
    no: 21,
    label: "Vrijednost uloženih ekonomskih dobara i usluga",
  },
  { key: "row22", no: 22, label: "Amortizacija" },
  {
    key: "row23",
    no: 23,
    label: "Knjigovodstvena vrijednost rasknjiženih stalnih sredstava",
  },
];

const sectionCls =
  "text-[11.5px] font-semibold uppercase tracking-wider text-brand-700 pb-1.5 mb-2.5";
const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-100 px-3 py-1.5 text-[13px] text-right text-text-primary focus:outline-none focus:border-brand-600";

/* ── Tabela u stilu marketing obrasca, PK tokeni ── */

function CalcTable({
  head,
  children,
}: {
  head: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-cream-300 overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-cream-200/60 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
            {head.map((h, i) => (
              <th
                key={h}
                className={`px-3 py-2 font-semibold ${i === 0 ? "w-[44px]" : ""} ${
                  i === head.length - 1 ? "w-[160px] text-right" : ""
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function CalcRow({
  no,
  label,
  children,
  highlight,
}: {
  no: number | string;
  label: React.ReactNode;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <tr
      className={`border-t border-cream-300/60 ${highlight ? "bg-brand-100/50" : ""}`}
    >
      <td className="px-3 py-2 align-middle text-text-tertiary tabular-nums">
        {no}
      </td>
      <td
        className={`px-3 py-2 align-middle text-[12.5px] leading-5 ${
          highlight ? "font-medium text-text-primary" : "text-text-secondary"
        }`}
      >
        {label}
      </td>
      <td className="px-3 py-1.5 align-middle text-right">{children}</td>
    </tr>
  );
}

export function SprModal({
  orgId,
  year,
  onClose,
  onSaved,
}: {
  orgId: number;
  year: number;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const q = useQuery({
    queryKey: ["spr-prefill", orgId, year],
    queryFn: async (): Promise<Prefill> => {
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
      if (!orgRes.ok) throw new Error(orgRes.error);
      const org = orgRes.data;
      const pausalni = org.taxRegime === "PAUSALNI";
      let amortTotal: number | null = null;
      if (amortRes.ok && amortRes.data?.rows?.length) {
        const od = amortRes.data.obveznik?.periodOd || `${year}-01-01`;
        const doo = amortRes.data.obveznik?.periodDo || `${year}-12-31`;
        amortTotal = amortRes.data.rows.reduce(
          (a, row) => a + (calcRow(row, od, doo).iznos ?? 0),
          0,
        );
      }
      return {
        org,
        totals: !pausalni && kprRes.ok ? kprRes.data.totals : null,
        amortTotal: pausalni ? null : amortTotal,
        unmatched:
          unmatchedRes.ok && typeof unmatchedRes.data.total === "number"
            ? unmatchedRes.data.total
            : 0,
      };
    },
  });

  return q.data ? (
    <SprModalBody
      orgId={orgId}
      year={year}
      prefill={q.data}
      onClose={onClose}
      onSaved={onSaved}
    />
  ) : (
    <Modal open onClose={onClose} title={`SPR-1053 za ${year}.`}>
      <p className="text-[13px] text-text-tertiary">
        {q.isError
          ? "Podaci se ne mogu učitati. Pokušajte ponovo."
          : "Povlačim podatke iz knjiga…"}
      </p>
    </Modal>
  );
}

function SprModalBody({
  orgId,
  year,
  prefill,
  onClose,
  onSaved,
}: {
  orgId: number;
  year: number;
  prefill: Prefill;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const { org, totals } = prefill;
  const owner = org.owner;
  const pausalni = org.taxRegime === "PAUSALNI";
  const ownerName =
    owner?.name ||
    [owner?.firstName, owner?.lastName].filter(Boolean).join(" ") ||
    "";

  const [income, setIncome] = useState<IncomeState>(() => ({
    row11: disp(totals?.k11 ?? 0),
    row12: disp(totals?.k12 ?? 0),
    row13: disp(totals?.k13 ?? 0),
    row14: "",
    row15: "",
  }));
  const [expenses, setExpenses] = useState<ExpenseState>(() => ({
    row17: disp(totals?.k16 ?? 0),
    row18: disp(totals?.k17 ?? 0),
    row19: disp(totals?.k18 ?? 0),
    row20: disp(totals?.k19 ?? 0),
    row21: "",
    row22: prefill.amortTotal != null ? disp(prefill.amortTotal) : "",
    row23: "",
  }));
  const [korekcija, setKorekcija] = useState("");
  const [sign, setSign] = useState<"+" | "-" | "">("");
  // Period (redovi 5-6): default cijela godina; kraći kod početka/prestanka
  // rada u toku godine. Promjena perioda nudi ponovno povlačenje KPR-a.
  const [periodOd, setPeriodOd] = useState(`01.01.${year}.`);
  const [periodDo, setPeriodDo] = useState(`31.12.${year}.`);
  const [refetching, setRefetching] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ponovo povuci prihode/rashode iz KPR-a za uneseni period (prepisuje
  // KPR-vođena polja; ručno dodana polja 14/15/21/22/23 ne dira).
  async function refetchKpr() {
    const from = parseDateInput(periodOd);
    const to = parseDateInput(periodDo);
    if (!from || !to || refetching) return;
    setRefetching(true);
    try {
      const res = await getKpr(orgId, { from, to });
      if (res.ok) {
        const t = res.data.totals;
        setIncome((s) => ({
          ...s,
          row11: disp(t.k11),
          row12: disp(t.k12),
          row13: disp(t.k13),
        }));
        setExpenses((s) => ({
          ...s,
          row17: disp(t.k16),
          row18: disp(t.k17),
          row19: disp(t.k18),
          row20: disp(t.k19),
        }));
      }
    } finally {
      setRefetching(false);
    }
  }

  const computed = useMemo(() => {
    const totalIncome =
      n0(income.row11) + n0(income.row12) + n0(income.row13) + n0(income.row14) + n0(income.row15);
    const totalExpenses =
      n0(expenses.row17) + n0(expenses.row18) + n0(expenses.row19) + n0(expenses.row20) +
      n0(expenses.row21) + n0(expenses.row22) + n0(expenses.row23);
    const adj = n0(korekcija);
    const adjSigned = sign === "-" ? -adj : adj;
    const netIncome = Math.max(totalIncome - totalExpenses + adjSigned, 0);
    const months = monthsBetween(periodOd, periodDo);
    const monthly = (netIncome * 0.1) / months;
    return { totalIncome, totalExpenses, adjSigned, netIncome, monthly, months };
  }, [income, expenses, korekcija, sign, periodOd, periodDo]);

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (pausalni)
      w.push(
        "Organizacija je u paušalnom režimu: cifre iz knjiga nisu povučene, unesite ih ručno.",
      );
    else if (
      totals &&
      totals.k11 + totals.k12 + totals.k13 + totals.k16 + totals.k17 + totals.k18 + totals.k19 === 0
    )
      w.push(
        `KPR za ${year}. nema potvrđenih stavki: provjerite da su izvodi za tu godinu uvezeni i stavke potvrđene.`,
      );
    if (!pausalni && prefill.amortTotal == null)
      w.push(
        `Amortizacija (PLDI) za ${year}. nije pronađena: red 22 unesite ručno ili prvo popunite Stalna sredstva i amortizaciju.`,
      );
    if (prefill.unmatched > 0)
      w.push(
        `${prefill.unmatched} stavki iz izvoda u ${year}. još nije potvrđeno pa NISU u ciframa.`,
      );
    if (!owner?.jmbg) w.push("Vlasnik nema upisan JMBG (dopunite na profilu).");
    if (!owner?.address)
      w.push("Vlasnik nema upisanu adresu (dopunite na profilu).");
    return w;
  }, [pausalni, totals, prefill, owner, year]);

  const buildData = (): SprData => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    return {
      jmbOsobni: owner?.jmbg ?? "",
      fullName: ownerName,
      address: [owner?.address, owner?.city].filter(Boolean).join(", "),
      jibJmb: org.taxNumber ?? "",
      periodFrom: toCompact(periodOd, `0101${year}`),
      periodTo: toCompact(periodDo, `3112${year}`),
      contactChanged: false,
      businessName: org.name,
      businessAddress: [org.address, org.city].filter(Boolean).join(", "),
      activityType: [org.activityCode, org.activityName]
        .filter(Boolean)
        .join(" - "),
      row11Cash: n0(income.row11),
      row12InKind: n0(income.row12),
      row13GoodsServices: n0(income.row13),
      row14OtherIncome: n0(income.row14),
      row15BookValueAssets: n0(income.row15),
      row16TotalIncome: computed.totalIncome,
      row17Materials: n0(expenses.row17),
      row18GrossWages: n0(expenses.row18),
      row19Contributions: n0(expenses.row19),
      row20OtherExpenses: n0(expenses.row20),
      row21GoodsServicesValue: n0(expenses.row21),
      row22Depreciation: n0(expenses.row22),
      row23BookValueAssets: n0(expenses.row23),
      row24TotalExpenses: computed.totalExpenses,
      row25Income: computed.totalIncome,
      row26Expenses: computed.totalExpenses,
      row27Adjustments: computed.adjSigned,
      row28NetIncome: computed.netIncome,
      row29PersonalDeduction: computed.monthly,
      row29Months: computed.months,
      signAdjustment: sign,
      dateSigned: `${dd}/${mm}/${today.getFullYear()}`,
    };
  };

  const saveMut = useMutation({
    mutationFn: async (withPdf: boolean) => {
      setError(null);
      const data = buildData();
      if (withPdf) {
        const bytes = await fillSprTemplate(data);
        triggerDownload(bytes, `SPR-1053_${year}_${org.name}.pdf`);
      }
      const res = await saveDocument({
        type: "SPR",
        year,
        title: `SPR-1053 za ${year}. (${org.name})`,
        data,
        organizationId: orgId,
      });
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["obrasci-forms"] });
      onSaved?.();
    },
    onError: (e: Error) =>
      setError(`Greška pri spremanju (${e.message}). Pokušajte ponovo.`),
  });

  const amountInput = (
    value: string,
    onChange: (v: string) => void,
    ariaLabel: string,
  ) => (
    <PkAmountInput
      value={value}
      onChange={onChange}
      ariaLabel={ariaLabel}
      className={inputCls}
    />
  );

  const infoField = (label: string, value: string) => (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-0.5">
        {label}
      </div>
      <div className="text-[13px] text-text-primary">{value || "–"}</div>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={`SPR-1053 za ${year}.`}
      maxWidthClass="max-w-[760px]"
      footer={
        <>
          {saved && (
            <span className="mr-auto self-center text-[12.5px] text-success font-medium">
              Spremljeno na profil
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Zatvori
          </button>
          <button
            type="button"
            onClick={() => saveMut.mutate(false)}
            disabled={saveMut.isPending}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            Spremi na profil
          </button>
          <button
            type="button"
            onClick={() => saveMut.mutate(true)}
            disabled={saveMut.isPending}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saveMut.isPending ? "Pripremam…" : "Spremi i preuzmi PDF"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {warnings.length > 0 && (
          <ul className="rounded-lg bg-warning-bg px-4 py-2.5 space-y-1">
            {warnings.map((w) => (
              <li key={w} className="text-[12.5px] text-warning">
                {w}
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="rounded-lg bg-danger-bg px-4 py-2.5 text-[12.5px] text-danger">
            {error}
          </p>
        )}

        {/* Dio 1 i 2: obveznik i djelatnost (povučeno, mijenja se na profilu) */}
        <div>
          <div className={sectionCls}>
            Dio 1 i 2, Podaci o obvezniku i djelatnosti
          </div>
          <div className="rounded-lg border border-cream-300 bg-cream-50 px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
            {infoField("1) JMB", owner?.jmbg ?? "")}
            {infoField("2) Prezime i ime", ownerName)}
            {infoField(
              "3) Adresa",
              [owner?.address, owner?.city].filter(Boolean).join(", "),
            )}
            {infoField("4) JIB djelatnosti", org.taxNumber ?? "")}
            {infoField("Naziv djelatnosti", org.name)}
            {infoField(
              "Šifra djelatnosti",
              [org.activityCode, org.activityName].filter(Boolean).join(" - "),
            )}
            {infoField(
              "9) Adresa djelatnosti",
              [org.address, org.city].filter(Boolean).join(", "),
            )}
            <div className="col-span-2 sm:col-span-3 flex flex-wrap items-end gap-3 pt-1 border-t border-cream-300/60">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-0.5">
                  5) Period od
                </div>
                <PkDateInput
                  value={periodOd}
                  onChange={setPeriodOd}
                  ariaLabel="Period od"
                  className="w-[130px]"
                />
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-0.5">
                  6) Period do
                </div>
                <PkDateInput
                  value={periodDo}
                  onChange={setPeriodDo}
                  ariaLabel="Period do"
                  className="w-[130px]"
                />
              </div>
              <button
                type="button"
                onClick={refetchKpr}
                disabled={refetching}
                className="px-3 py-2 rounded-lg border border-brand-600 text-brand-700 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
              >
                {refetching ? "Povlačim…" : "Povuci KPR za period"}
              </button>
              <span className="text-[11.5px] text-text-tertiary pb-1">
                Kraći period kod početka ili prestanka rada; dugme prepiše
                prihode i rashode iz KPR-a za taj period.
              </span>
            </div>
          </div>
        </div>

        {/* Dio 3: Prihodi */}
        <div>
          <div className={sectionCls}>Dio 3, Prihodi</div>
          <CalcTable head={["R.br.", "Vrsta prihoda", "Iznos (KM)"]}>
            {INCOME_ROWS.map((r) => (
              <CalcRow key={r.no} no={r.no} label={r.label}>
                {amountInput(income[r.key], (v) =>
                  setIncome((s) => ({ ...s, [r.key]: v })),
                  `Red ${r.no}`,
                )}
              </CalcRow>
            ))}
            <CalcRow no={16} label="Prihodi ukupno (zbir redova 11. do 15.)" highlight>
              <span className="text-[13.5px] font-semibold tabular-nums text-success pr-1">
                {formatKm(computed.totalIncome)}
              </span>
            </CalcRow>
          </CalcTable>
        </div>

        {/* Dio 4: Rashodi */}
        <div>
          <div className={sectionCls}>Dio 4, Rashodi</div>
          <CalcTable head={["R.br.", "Vrsta rashoda", "Iznos (KM)"]}>
            {EXPENSE_ROWS.map((r) => (
              <CalcRow key={r.no} no={r.no} label={r.label}>
                {amountInput(expenses[r.key], (v) =>
                  setExpenses((s) => ({ ...s, [r.key]: v })),
                  `Red ${r.no}`,
                )}
              </CalcRow>
            ))}
            <CalcRow no={24} label="Rashodi ukupno (zbir redova 17 do 23)" highlight>
              <span className="text-[13.5px] font-semibold tabular-nums text-text-primary pr-1">
                {formatKm(computed.totalExpenses)}
              </span>
            </CalcRow>
          </CalcTable>
        </div>

        {/* Dio 5: Utvrđivanje dohotka */}
        <div>
          <div className={sectionCls}>Dio 5, Utvrđivanje dohotka</div>
          <CalcTable head={["R.br.", "Opis", "Iznos (KM)"]}>
            <CalcRow no={25} label="Prihodi (red 16)">
              <span className="tabular-nums text-text-primary pr-1">
                {formatKm(computed.totalIncome)}
              </span>
            </CalcRow>
            <CalcRow no={26} label="Rashodi (red 24)">
              <span className="tabular-nums text-text-primary pr-1">
                {formatKm(computed.totalExpenses)}
              </span>
            </CalcRow>
            <CalcRow
              no={27}
              label={
                <span className="inline-flex items-center gap-2 flex-wrap">
                  Rashodi koje nije moguće odbiti (čl. 15 Zakona)
                  <PkSelect
                    ariaLabel="Predznak korekcije"
                    value={sign}
                    onChange={(v) => setSign(v as "+" | "-" | "")}
                    options={[
                      { value: "", label: "Bez korekcije" },
                      { value: "+", label: "+ uvećava" },
                      { value: "-", label: "- umanjuje" },
                    ]}
                    wrapStyle={{ width: 150 }}
                  />
                </span>
              }
            >
              {amountInput(korekcija, setKorekcija, "Porezne korekcije")}
            </CalcRow>
            <CalcRow no={28} label="Dohodak iz djelatnosti (25 − 26 + 27)" highlight>
              <span className="text-[14px] font-semibold tabular-nums text-brand-700 pr-1">
                {formatKm(computed.netIncome)}
              </span>
            </CalcRow>
            <CalcRow
              no={29}
              label={`Mjesečni iznos akontacije poreza na dohodak ((red 28. x 0,1) / ${computed.months} ${computed.months === 1 ? "mjesec" : "mjeseci"})`}
            >
              <span className="tabular-nums text-text-primary pr-1">
                {formatKm(computed.monthly)}
              </span>
            </CalcRow>
          </CalcTable>
          <p className="text-[12px] text-text-tertiary mt-2">
            Spremljeni SPR se koristi za GPD (red 9 = ovaj red 28). Podaci
            obveznika se mijenjaju na profilu organizacije.
          </p>
        </div>
      </div>
    </Modal>
  );
}
