"use client";

// GPD-1051 direktno u PK Office: red 9 iz spremljenog SPR-a (red 28), lični
// odbitak iz porezne kartice vlasnika, akontacije predložene sa izvoda.
// Raspored i nazivi redova prate marketing /gpd generator (službeni obrazac),
// dizajn je PK Office. PDF i snimanje odmah iz modala.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "src/components/app-shell/Modal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { parseDateInput } from "src/lib/dateInput";
import { getForms, getOrganization, type Organization } from "src/api/profile";
import { getDocument, saveDocument } from "src/api/documents";
import { searchBankTransactions } from "src/api/bankStatements";
import { fillGpdTemplate, type GpdData } from "src/sections/gpd/fillGpd";
import type { SprData } from "src/sections/spr/fillSpr";
import { formatKm, parseKm } from "src/lib/amountInput";

const n0 = (v: string) => parseKm(v) ?? 0;
const disp = (n: number) => (n > 0 ? formatKm(n) : "");

// Display datum ("DD.MM.GGGG.") → ddMM za zaglavlje obrasca; fallback default.
function toDdMm(display: string, fallback: string) {
  const iso = parseDateInput(display);
  if (!iso) return fallback;
  const [, m, d] = iso.split("-");
  return d && m ? `${d}${m}` : fallback;
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
  sprRow28: number | null; // null = SPR za godinu nije spremljen
  advanceSum: number;
  advanceCount: number;
  // prenos iz GPD-a prethodne godine
  prevLoss: number; // red 16 (neto gubitak) → ovdje red 14
  prevAdvanceCarry: number; // preplaćeni porez prenesen u akontacije → red 29
};

type RowNo = 8 | 9 | 10 | 11 | 12 | 13 | 14;
type RowVal = { loss: string; profit: string };

// Nazivi redova identični marketing /gpd generatoru (službeni obrazac).
const ROWS: { no: RowNo; label: string; loss: boolean; profit: boolean }[] = [
  {
    no: 8,
    label:
      "Dohodak od nesamostalne djelatnosti i/ili dohodak članova predstavničkih organa vlasti (iz godišnjih izvještaja GIP-1022, priložiti primjerak od svakog poslodavca)",
    loss: false,
    profit: true,
  },
  {
    no: 9,
    label:
      "Dohodak od samostalne djelatnosti (ukupan iznos iz reda 28 specifikacije SPR-1053)",
    loss: true,
    profit: true,
  },
  {
    no: 10,
    label:
      "Dohodak od poljoprivrede i šumarstva (ukupan iznos iz reda 28 specifikacije SPR-1053)",
    loss: true,
    profit: true,
  },
  {
    no: 11,
    label:
      "Dohodak od iznajmljivanja imovine (iz reda 18 pregleda PRIM-1054; kod paušalnih rashoda priložiti ugovor o iznajmljivanju)",
    loss: true,
    profit: true,
  },
  {
    no: 12,
    label:
      "Dohodak od vremenski ograničenog ustupanja prava (priložiti ugovor o ustupanju imovinskih prava)",
    loss: true,
    profit: true,
  },
  {
    no: 13,
    label:
      "Dohodak od drugih samostalnih djelatnosti (veza sa obrascima AUG-1031 i ASD-1032)",
    loss: true,
    profit: true,
  },
  {
    no: 14,
    label: "Poslovni gubitak iz ranijih godina",
    loss: true,
    profit: false,
  },
];

const sectionCls =
  "text-[11.5px] font-semibold uppercase tracking-wider text-brand-700 pb-1.5 mb-2.5";
const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-100 px-3 py-1.5 text-[13px] text-right text-text-primary focus:outline-none focus:border-brand-600";

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
                key={`${h}-${i}`}
                className={`px-3 py-2 font-semibold ${i === 0 ? "w-[44px]" : ""} ${
                  i >= head.length - (head.length > 3 ? 2 : 1)
                    ? "w-[140px] text-right"
                    : ""
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

function LabelCell({
  no,
  label,
  highlight,
}: {
  no: number | string;
  label: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <>
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
    </>
  );
}

export function GpdModal({
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
    queryKey: ["gpd-prefill", orgId, year],
    queryFn: async (): Promise<Prefill> => {
      const [orgRes, sprRes, gpdRes, advRes] = await Promise.all([
        getOrganization(orgId),
        getForms("SPR"),
        getForms("GPD"),
        searchBankTransactions(orgId, {
          category: "POREZ_DOHODAK_VLASNIKA",
          direction: "OUT",
          status: "CONFIRMED",
          dateFrom: `${year}-01-01`,
          dateTo: `${year}-12-31`,
          limit: 500,
        }),
      ]);
      if (!orgRes.ok) throw new Error(orgRes.error);

      let sprRow28: number | null = null;
      if (sprRes.ok) {
        const sprForm = sprRes.data
          .filter(
            (f) =>
              f.type === "SPR" &&
              f.year === year &&
              f.organization?.id === orgId,
          )
          .sort((a, b) => b.id - a.id)[0];
        if (sprForm) {
          const doc = await getDocument<SprData>(sprForm.id);
          if (doc.ok && typeof doc.data.data?.row28NetIncome === "number") {
            sprRow28 = doc.data.data.row28NetIncome;
          }
        }
      }

      // GPD prethodne godine: gubitak za red 14 i akontacije prenesene
      // iz preplaćenog poreza (opcija "prenijeti u akontacije")
      let prevLoss = 0;
      let prevAdvanceCarry = 0;
      if (gpdRes.ok) {
        const prevGpd = gpdRes.data
          .filter(
            (f) =>
              f.type === "GPD" &&
              f.year === year - 1 &&
              (f.organization?.id === orgId || !f.organization),
          )
          .sort((a, b) => b.id - a.id)[0];
        if (prevGpd) {
          const doc = await getDocument<GpdData>(prevGpd.id);
          const d = doc.ok ? doc.data.data : null;
          if (d) {
            if ((d.row16NetLoss ?? 0) > 0) prevLoss = d.row16NetLoss;
            if ((d.row31Difference ?? 0) < 0 && d.refundChoice === "advance") {
              prevAdvanceCarry = Math.abs(d.row31Difference);
            }
          }
        }
      }

      const items = advRes.ok ? advRes.data.items : [];
      const advanceSum = items.reduce(
        (a, tx) => a + (parseFloat(tx.amount) || 0),
        0,
      );
      return {
        org: orgRes.data,
        sprRow28,
        advanceSum,
        advanceCount: items.length,
        prevLoss,
        prevAdvanceCarry,
      };
    },
  });

  return q.data ? (
    <GpdModalBody
      orgId={orgId}
      year={year}
      prefill={q.data}
      onClose={onClose}
      onSaved={onSaved}
    />
  ) : (
    <Modal open onClose={onClose} title={`GPD-1051 za ${year}.`}>
      <p className="text-[13px] text-text-tertiary">
        {q.isError
          ? "Podaci se ne mogu učitati. Pokušajte ponovo."
          : "Povlačim podatke…"}
      </p>
    </Modal>
  );
}

function GpdModalBody({
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
  const { org } = prefill;
  const owner = org.owner;
  const ownerName =
    owner?.name ||
    [owner?.firstName, owner?.lastName].filter(Boolean).join(" ") ||
    "";

  const [rows, setRows] = useState<Record<RowNo, RowVal>>(() => {
    const init = {} as Record<RowNo, RowVal>;
    for (const r of ROWS) init[r.no] = { loss: "", profit: "" };
    if (prefill.sprRow28 != null && prefill.sprRow28 > 0) {
      init[9] = { loss: "", profit: formatKm(prefill.sprRow28) };
    }
    // gubitak iz GPD-a prethodne godine ide u red 14
    if (prefill.prevLoss > 0) {
      init[14] = { loss: formatKm(prefill.prevLoss), profit: "" };
    }
    return init;
  });
  const [deductions, setDeductions] = useState(() => ({
    personal:
      typeof owner?.taxCoefficient === "number" && owner.taxCoefficient > 0
        ? formatKm(owner.taxCoefficient * 3600)
        : "",
    health: "",
    mortgage: "",
  }));
  const [taxCalc, setTaxCalc] = useState(() => ({
    reduction: "",
    withholding: "",
    advance: disp(prefill.advanceSum),
    foreign: "",
  }));
  const [refundChoice, setRefundChoice] = useState<"advance" | "refund" | "">("");
  const [bankAccount, setBankAccount] = useState("");
  // "za period od-do" iz zaglavlja obrasca: default cijela godina, kraći
  // period kod početka/prestanka djelatnosti u toku godine
  const [periodOd, setPeriodOd] = useState(`01.01.${year}.`);
  const [periodDo, setPeriodDo] = useState(`31.12.${year}.`);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computed = useMemo(() => {
    const sumLoss = ROWS.filter((r) => r.no >= 9).reduce(
      (a, r) => a + n0(rows[r.no].loss),
      0,
    );
    const sumProfit = ROWS.filter((r) => r.no <= 13).reduce(
      (a, r) => a + n0(rows[r.no].profit),
      0,
    );
    const netLoss = sumLoss > sumProfit ? sumLoss - sumProfit : 0;
    const netProfit = sumProfit > sumLoss ? sumProfit - sumLoss : 0;
    const totalDeductions =
      n0(deductions.personal) + n0(deductions.health) + n0(deductions.mortgage);
    const taxBase = Math.max(netProfit - netLoss - totalDeductions, 0);
    const taxAmount = taxBase * 0.1;
    const difference =
      taxAmount -
      n0(taxCalc.reduction) -
      n0(taxCalc.withholding) -
      n0(taxCalc.advance) -
      n0(taxCalc.foreign);
    return {
      sumLoss,
      sumProfit,
      netLoss,
      netProfit,
      totalDeductions,
      taxBase,
      taxAmount,
      difference,
    };
  }, [rows, deductions, taxCalc]);

  const warnings = useMemo(() => {
    const w: string[] = [];
    if (prefill.sprRow28 == null)
      w.push(
        `SPR-1053 za ${year}. nije spremljen za ovu organizaciju: prvo pripremite SPR (red 9 se puni iz njegovog reda 28).`,
      );
    if (prefill.advanceCount > 0)
      w.push(
        `Akontacije (${formatKm(prefill.advanceSum)} KM) su zbir ${prefill.advanceCount} uplata prema budžetu kantona sa izvoda: provjerite prije predaje.`,
      );
    else
      w.push(
        "Na izvodima nisu pronađene uplate akontacija: ako ste ih plaćali, unesite iznos ručno u red 29.",
      );
    if (n0(deductions.personal) > 0)
      w.push(
        "Lični odbitak je izračunat za punu godinu iz koeficijenta porezne kartice: ispravite ako kartica ne pokriva cijelu godinu.",
      );
    if (prefill.prevLoss > 0)
      w.push(
        `Red 14 je popunjen gubitkom iz GPD-a za ${year - 1}. (${formatKm(prefill.prevLoss)} KM).`,
      );
    if (prefill.prevAdvanceCarry > 0)
      w.push(
        `U GPD-u za ${year - 1}. je ${formatKm(prefill.prevAdvanceCarry)} KM preplaćenog poreza preneseno u akontacije: uračunajte u red 29 ako već nije u zbiru sa izvoda.`,
      );
    if (!owner?.jmbg) w.push("Vlasnik nema upisan JMBG (dopunite na profilu).");
    return w;
  }, [prefill, deductions.personal, owner, year]);

  const buildData = (): GpdData => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    return {
      jmb: owner?.jmbg ?? "",
      fullName: ownerName,
      taxYear: String(year).slice(-2),
      periodFrom: toDdMm(periodOd, "0101"),
      periodTo: toDdMm(periodDo, "3112"),
      address: [owner?.address, owner?.city].filter(Boolean).join(", "),
      contactChanged: false,
      phone: owner?.phone ?? "",
      email: owner?.email ?? "",
      row8Profit: n0(rows[8].profit),
      row9Loss: n0(rows[9].loss),
      row9Profit: n0(rows[9].profit),
      row10Loss: n0(rows[10].loss),
      row10Profit: n0(rows[10].profit),
      row11Loss: n0(rows[11].loss),
      row11Profit: n0(rows[11].profit),
      row12Loss: n0(rows[12].loss),
      row12Profit: n0(rows[12].profit),
      row13Loss: n0(rows[13].loss),
      row13Profit: n0(rows[13].profit),
      row14Loss: n0(rows[14].loss),
      row15Loss: computed.sumLoss,
      row15Profit: computed.sumProfit,
      row16NetLoss: computed.netLoss,
      row17NetProfit: computed.netProfit,
      row18Personal: n0(deductions.personal),
      row19Health: n0(deductions.health),
      row20Mortgage: n0(deductions.mortgage),
      row21TotalDeductions: computed.totalDeductions,
      row22Loss: computed.netLoss,
      row23Income: computed.netProfit,
      row24Deductions: computed.totalDeductions,
      row25TaxBase: computed.taxBase,
      row26Tax: computed.taxAmount,
      row27Reduction: n0(taxCalc.reduction),
      row28Withholding: n0(taxCalc.withholding),
      row29Advance: n0(taxCalc.advance),
      row30Foreign: n0(taxCalc.foreign),
      row31Difference: computed.difference,
      refundChoice,
      bankAccount,
      dateSigned: `${dd}/${mm}/${today.getFullYear()}`,
    };
  };

  const saveMut = useMutation({
    mutationFn: async (withPdf: boolean) => {
      setError(null);
      const data = buildData();
      if (withPdf) {
        const bytes = await fillGpdTemplate(data);
        triggerDownload(
          bytes,
          `GPD-1051_${year}_${data.fullName || org.name}.pdf`,
        );
      }
      const res = await saveDocument({
        type: "GPD",
        year,
        title: `GPD-1051 za ${year}. (${org.name})`,
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

  const autoVal = (n: number, cls = "text-text-primary") => (
    <span className={`tabular-nums pr-1 ${cls}`}>{formatKm(n)}</span>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={`GPD-1051 za ${year}.`}
      maxWidthClass="max-w-[820px]"
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

        {/* Dio 1: porezni obveznik */}
        <div>
          <div className={sectionCls}>Dio 1, Podaci o poreznom obvezniku</div>
          <div className="rounded-lg border border-cream-300 bg-cream-50 px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
            {infoField("1) JMB", owner?.jmbg ?? "")}
            {infoField("2) Prezime i ime", ownerName)}
            {infoField(
              "3) Adresa",
              [owner?.address, owner?.city].filter(Boolean).join(", "),
            )}
            {infoField("Porezna godina", `${year}.`)}
            {infoField("Telefon", owner?.phone ?? "")}
            {infoField("Email", owner?.email ?? "")}
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-0.5">
                Za period od
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
                Do
              </div>
              <PkDateInput
                value={periodDo}
                onChange={setPeriodDo}
                ariaLabel="Period do"
                className="w-[130px]"
              />
            </div>
            <div className="self-end text-[11.5px] text-text-tertiary pb-1">
              Kraći period samo kod početka ili prestanka rada u toku godine.
            </div>
          </div>
        </div>

        {/* Dio 2: izvori dohotka */}
        <div>
          <div className={sectionCls}>Dio 2, Izvori dohotka</div>
          <CalcTable
            head={["R.br.", "Izvor dohotka", "Gubitak (KM)", "Dohodak (KM)"]}
          >
            {ROWS.map((r) => (
              <tr key={r.no} className="border-t border-cream-300/60">
                <LabelCell no={r.no} label={r.label} />
                <td className="px-3 py-1.5 align-middle">
                  {r.loss
                    ? amountInput(
                        rows[r.no].loss,
                        (v) =>
                          setRows((s) => ({
                            ...s,
                            [r.no]: { ...s[r.no], loss: v },
                          })),
                        `Red ${r.no} gubitak`,
                      )
                    : null}
                </td>
                <td className="px-3 py-1.5 align-middle">
                  {r.profit
                    ? amountInput(
                        rows[r.no].profit,
                        (v) =>
                          setRows((s) => ({
                            ...s,
                            [r.no]: { ...s[r.no], profit: v },
                          })),
                        `Red ${r.no} dohodak`,
                      )
                    : null}
                </td>
              </tr>
            ))}
            <tr className="border-t border-cream-300/60 bg-brand-100/50">
              <LabelCell no={15} label="Ukupno" highlight />
              <td className="px-3 py-2 align-middle text-right">
                {autoVal(computed.sumLoss)}
              </td>
              <td className="px-3 py-2 align-middle text-right">
                {autoVal(computed.sumProfit, "text-success font-semibold")}
              </td>
            </tr>
          </CalcTable>
        </div>

        {/* Dio 3: odbici */}
        <div>
          <div className={sectionCls}>Dio 3, Odbici</div>
          <CalcTable head={["R.br.", "Opis", "Iznos (KM)"]}>
            <tr className="border-t border-cream-300/60">
              <LabelCell no={18} label="Lični odbitak" />
              <td className="px-3 py-1.5 align-middle">
                {amountInput(
                  deductions.personal,
                  (v) => setDeductions((s) => ({ ...s, personal: v })),
                  "Lični odbitak",
                )}
              </td>
            </tr>
            <tr className="border-t border-cream-300/60">
              <LabelCell
                no={19}
                label="Uvećanje ličnih odbitaka za iznos troškova zdravstvenih usluga i nabavku lijekova (priložiti validnu dokumentaciju)"
              />
              <td className="px-3 py-1.5 align-middle">
                {amountInput(
                  deductions.health,
                  (v) => setDeductions((s) => ({ ...s, health: v })),
                  "Troškovi zdravstva",
                )}
              </td>
            </tr>
            <tr className="border-t border-cream-300/60">
              <LabelCell
                no={20}
                label="Uvećanje ličnih odbitaka za iznos kamate plaćene na stambeni kredit (priložiti validnu dokumentaciju)"
              />
              <td className="px-3 py-1.5 align-middle">
                {amountInput(
                  deductions.mortgage,
                  (v) => setDeductions((s) => ({ ...s, mortgage: v })),
                  "Kamata na stambeni kredit",
                )}
              </td>
            </tr>
            <tr className="border-t border-cream-300/60 bg-brand-100/50">
              <LabelCell no={21} label="Ukupni odbici" highlight />
              <td className="px-3 py-2 align-middle text-right">
                {autoVal(computed.totalDeductions, "font-semibold")}
              </td>
            </tr>
          </CalcTable>
        </div>

        {/* Dio 4: obračun poreza */}
        <div>
          <div className={sectionCls}>Dio 4, Obračun poreza</div>
          <CalcTable head={["R.br.", "Opis", "Iznos (KM)"]}>
            <tr className="border-t border-cream-300/60">
              <LabelCell no={22} label="Ukupni gubitak za godinu" />
              <td className="px-3 py-2 align-middle text-right">
                {autoVal(computed.netLoss)}
              </td>
            </tr>
            <tr className="border-t border-cream-300/60">
              <LabelCell no={23} label="Ukupan dohodak za godinu" />
              <td className="px-3 py-2 align-middle text-right">
                {autoVal(computed.netProfit)}
              </td>
            </tr>
            <tr className="border-t border-cream-300/60">
              <LabelCell no={24} label="Ukupni odbici (u dijelu 3 red 21)" />
              <td className="px-3 py-2 align-middle text-right">
                {autoVal(computed.totalDeductions)}
              </td>
            </tr>
            <tr className="border-t border-cream-300/60 bg-brand-100/50">
              <LabelCell
                no={25}
                label="Osnovica poreza na dohodak (23 − 22 − 24)"
                highlight
              />
              <td className="px-3 py-2 align-middle text-right">
                {autoVal(computed.taxBase, "font-semibold")}
              </td>
            </tr>
            <tr className="border-t border-cream-300/60">
              <LabelCell no={26} label="Iznos porezne obaveze (25 × 0,1)" />
              <td className="px-3 py-2 align-middle text-right">
                {autoVal(computed.taxAmount)}
              </td>
            </tr>
            <tr className="border-t border-cream-300/60">
              <LabelCell
                no={27}
                label="Umanjenje poreza po članu 35. stav 3. i članu 47. Zakona"
              />
              <td className="px-3 py-1.5 align-middle">
                {amountInput(
                  taxCalc.reduction,
                  (v) => setTaxCalc((s) => ({ ...s, reduction: v })),
                  "Umanjenje poreza",
                )}
              </td>
            </tr>
            <tr className="border-t border-cream-300/60">
              <LabelCell no={28} label="Porez po odbitku" />
              <td className="px-3 py-1.5 align-middle">
                {amountInput(
                  taxCalc.withholding,
                  (v) => setTaxCalc((s) => ({ ...s, withholding: v })),
                  "Porez po odbitku",
                )}
              </td>
            </tr>
            <tr className="border-t border-cream-300/60">
              <LabelCell no={29} label="Uplaćene akontacije poreza" />
              <td className="px-3 py-1.5 align-middle">
                {amountInput(
                  taxCalc.advance,
                  (v) => setTaxCalc((s) => ({ ...s, advance: v })),
                  "Uplaćene akontacije",
                )}
              </td>
            </tr>
            <tr className="border-t border-cream-300/60">
              <LabelCell
                no={30}
                label="Plaćeni porez u inostranstvu, odnosno na drugoj teritoriji BiH"
              />
              <td className="px-3 py-1.5 align-middle">
                {amountInput(
                  taxCalc.foreign,
                  (v) => setTaxCalc((s) => ({ ...s, foreign: v })),
                  "Porez plaćen u inostranstvu",
                )}
              </td>
            </tr>
            <tr className="border-t border-cream-300/60 bg-brand-100/50">
              <LabelCell
                no={31}
                label="Razlika poreza: za doplatu (+) / za povrat (−)"
                highlight
              />
              <td className="px-3 py-2 align-middle text-right">
                <span
                  className={`tabular-nums font-semibold pr-1 ${
                    computed.difference >= 0 ? "text-danger" : "text-success"
                  }`}
                >
                  {computed.difference >= 0 ? "+" : "−"}
                  {formatKm(Math.abs(computed.difference))}
                </span>
              </td>
            </tr>
          </CalcTable>
        </div>

        {/* Red 32: povrat */}
        {computed.difference < 0 && (
          <div>
            <div className={sectionCls}>Red 32, Preplaćeni porez</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className="block text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Šta sa preplaćenim porezom
                </label>
                <PkSelect
                  ariaLabel="Opcija povrata"
                  value={refundChoice}
                  onChange={(v) =>
                    setRefundChoice(v as "advance" | "refund" | "")
                  }
                  options={[
                    { value: "", label: "Izaberi opciju" },
                    { value: "advance", label: "Prenijeti u buduće akontacije" },
                    { value: "refund", label: "Povrat na račun" },
                  ]}
                  wrapStyle={{ width: "100%" }}
                />
              </div>
              {refundChoice === "refund" && (
                <div>
                  <label className="block text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                    Broj računa za povrat
                  </label>
                  <input
                    className="w-full rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Žiro račun vlasnika"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-[12px] text-text-tertiary">
          Red 9 dolazi iz spremljenog SPR-a; ostale izvore dohotka unesite
          ručno. Podaci obveznika se mijenjaju na profilu.
        </p>
      </div>
    </Modal>
  );
}
