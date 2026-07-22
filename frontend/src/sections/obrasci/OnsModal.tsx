"use client";

// Obrazac ONŠ (naknade za šume): osnovica = ukupan prihod iz KPR-a za
// period, naknada za općekorisne funkcije šuma 0,07%, 100% budžet kantona.
// Sve auto-popunjeno i editabilno; spremanje na profil + PDF za štampu.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconDownload, IconLoader2, IconRefresh } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { getOrganization, type Organization } from "src/api/profile";
import { getKpr } from "src/api/bankStatements";
import { getDocument, saveDocument } from "src/api/documents";
import { formatBAM } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";
import { parseDateInput } from "src/lib/dateInput";
import { buildOnsPdf, type OnsData } from "./onsPdf";
import {
  KANTON_OPTIONS,
  ONS_VRSTA_PRIHODA,
  kantonBudzetRacun,
  kantonGenitiv,
  kantonZaGrad,
  opcinaKod,
  type KantonKey,
} from "./kantonalni";

const labelCls =
  "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";
const inputCls =
  "w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Spremljeni podaci obrasca (OnsData + meta za prikaz na stranici). */
export type OnsSaved = OnsData & {
  kanton: KantonKey | null;
  uplaceno: number;
  razlika: number;
};

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

export function OnsModal({
  orgId,
  year,
  savedFormId,
  onClose,
}: {
  orgId: number;
  year: number;
  /** id spremljenog ONŠ obrasca za godinu: modal nastavlja od njega
   *  (upis uplate ne kreće od nule) */
  savedFormId?: number | null;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ["ons-prefill", orgId, year, savedFormId ?? 0],
    queryFn: async () => {
      const [orgRes, kprRes, savedRes] = await Promise.all([
        getOrganization(orgId),
        getKpr(orgId, { year }),
        savedFormId ? getDocument<OnsSaved>(savedFormId) : null,
      ]);
      if (!orgRes.ok) throw new Error(orgRes.error);
      const t = kprRes.ok ? kprRes.data.totals : null;
      // k15 = ukupni NETO prihodi (gross - PDV). k11+k12+k13 su bruto (sa PDV-om
      // k14), pa bi za obveznika precijenili osnovicu ONŠ-a za iznos PDV-a.
      const prihod = t ? r2(t.k15 ?? 0) : 0;
      return {
        org: orgRes.data,
        prihod,
        saved: savedRes?.ok ? (savedRes.data.data ?? null) : null,
      };
    },
  });

  return q.data ? (
    <OnsModalBody
      orgId={orgId}
      year={year}
      org={q.data.org}
      prihodIzKpr={q.data.prihod}
      saved={q.data.saved}
      onClose={onClose}
    />
  ) : (
    <Modal open onClose={onClose} title={`Obrazac ONŠ za ${year}.`}>
      <p className="text-[13px] text-text-tertiary">
        {q.isError
          ? "Podaci se ne mogu učitati. Pokušajte ponovo."
          : "Povlačim prihod iz KPR-a..."}
      </p>
    </Modal>
  );
}

function OnsModalBody({
  orgId,
  year,
  org,
  prihodIzKpr,
  saved,
  onClose,
}: {
  orgId: number;
  year: number;
  org: Organization;
  prihodIzKpr: number;
  /** prethodno spremljen obračun: nastavlja se od njegovih vrijednosti */
  saved: OnsSaved | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [periodOd, setPeriodOd] = useState(saved?.periodOd ?? `01.01.${year}.`);
  const [periodDo, setPeriodDo] = useState(saved?.periodDo ?? `31.12.${year}.`);
  const [osnovicaS, setOsnovicaS] = useState(
    saved
      ? formatKm(saved.osnovica)
      : prihodIzKpr > 0
        ? formatKm(prihodIzKpr)
        : "",
  );
  const [stopaS, setStopaS] = useState(
    saved ? formatKm(saved.stopa) : "0,07",
  );
  const [uplateS, setUplateS] = useState<[string, string, string, string]>(
    saved
      ? (saved.uplate.map((u) => (u > 0 ? formatKm(u) : "")) as [
          string,
          string,
          string,
          string,
        ])
      : ["", "", "", ""],
  );
  const [ziroRacun, setZiroRacun] = useState(
    saved?.ziroRacun || (org.bankAccount ?? ""),
  );
  const [kanton, setKanton] = useState<KantonKey | null>(
    saved?.kanton ?? kantonZaGrad(org.city),
  );
  const [refetching, setRefetching] = useState(false);
  const [spremljeno, setSpremljeno] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const osnovica = parseKm(osnovicaS) ?? 0;
  const stopa = parseKm(stopaS) ?? 0;
  const naknada = r2((osnovica * stopa) / 100);
  const uplate = uplateS.map((s) => parseKm(s) ?? 0) as [
    number,
    number,
    number,
    number,
  ];
  const uplaceno = r2(uplate.reduce((a, b) => a + b, 0));
  const razlika = r2(naknada - uplaceno);

  // ponovno povlačenje prihoda iz KPR-a za uneseni period (kraći period
  // kod odjave obrta u toku godine)
  async function povuciKpr() {
    const from = parseDateInput(periodOd);
    const to = parseDateInput(periodDo);
    if (!from || !to || refetching) {
      if (!from || !to) setError("Provjerite datume perioda.");
      return;
    }
    setError(null);
    setRefetching(true);
    try {
      const res = await getKpr(orgId, { from, to });
      if (res.ok) {
        const t = res.data.totals;
        // k15 = neto prihodi (bez PDV-a); vidi napomenu u prefill upitu
        setOsnovicaS(formatKm(r2(t.k15 ?? 0)));
      }
    } finally {
      setRefetching(false);
    }
  }

  function buildData(): OnsData {
    const danas = new Date();
    const dd = String(danas.getDate()).padStart(2, "0");
    const mm = String(danas.getMonth() + 1).padStart(2, "0");
    return {
      nazivObrta: org.name,
      mjesto: [org.address, org.city].filter(Boolean).join(", "),
      sifraDjelatnosti: org.activityCode ?? "",
      jib: (org.taxNumber ?? "").replace(/\D/g, ""),
      ziroRacun: ziroRacun.trim(),
      periodOd,
      periodDo,
      stopa,
      osnovica,
      naknada,
      uplate,
      datum: `${dd}.${mm}.${danas.getFullYear()}.`,
    };
  }

  const saveMut = useMutation({
    mutationFn: async (withPdf: boolean) => {
      setError(null);
      const data: OnsSaved = {
        ...buildData(),
        kanton,
        uplaceno,
        razlika,
      };
      if (withPdf) {
        const bytes = await buildOnsPdf(data);
        triggerDownload(bytes, `ONS_${year}_${org.name}.pdf`);
      }
      const res = await saveDocument({
        type: "ONS",
        year,
        title: `ONŠ za ${year}. (${org.name})`,
        data,
        organizationId: orgId,
      });
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => {
      setSpremljeno(true);
      qc.invalidateQueries({ queryKey: ["obrasci-forms"] });
    },
    onError: (e: Error) =>
      setError(`Greška pri spremanju (${e.message}). Pokušajte ponovo.`),
  });

  const opcina = opcinaKod(org.city);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Obrazac ONŠ (naknade za šume) za ${year}.`}
      maxWidthClass="max-w-[720px]"
    >
      <div className="space-y-4">
        <p className="text-[12.5px] text-text-tertiary leading-5">
          Naknada za općekorisne funkcije šuma: 0,07% od ukupno ostvarenog
          prihoda, 100% budžetu kantona. Osnovica je povučena iz KPR-a
          (prihodi za period); sva polja se mogu ispraviti.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className={labelCls}>Period od</label>
            <PkDateInput
              value={periodOd}
              onChange={setPeriodOd}
              ariaLabel="Period od"
              className="w-full"
              inputClassName="bg-cream-50"
            />
          </div>
          <div>
            <label className={labelCls}>Period do</label>
            <PkDateInput
              value={periodDo}
              onChange={setPeriodDo}
              ariaLabel="Period do"
              className="w-full"
              inputClassName="bg-cream-50"
            />
          </div>
          <div className="col-span-2">
            <button
              type="button"
              disabled={refetching}
              onClick={povuciKpr}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
            >
              {refetching ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : (
                <IconRefresh size={14} />
              )}
              Povuci prihod iz KPR-a za period
            </button>
          </div>
          <div>
            <label className={labelCls}>Osnovica (ukupan prihod)</label>
            <PkAmountInput
              value={osnovicaS}
              onChange={setOsnovicaS}
              ariaLabel="Osnovica"
              className="bg-cream-50"
            />
          </div>
          <div>
            <label className={labelCls}>Stopa (%)</label>
            <PkAmountInput
              value={stopaS}
              onChange={setStopaS}
              ariaLabel="Stopa"
              className="bg-cream-50"
            />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Žiro račun (na obrascu)</label>
            <input
              value={ziroRacun}
              onChange={(e) => setZiroRacun(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="rounded-xl border border-cream-300 bg-cream-50 p-3">
          <div className={labelCls}>Uplate u toku perioda (opciono)</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(["1. kvartal", "2. kvartal", "3. kvartal", "4. kvartal"] as const).map(
              (label, i) => (
                <div key={label}>
                  <label className={labelCls}>{label}</label>
                  <PkAmountInput
                    value={uplateS[i]}
                    onChange={(v) =>
                      setUplateS(
                        (prev) =>
                          prev.map((x, xi) => (xi === i ? v : x)) as [
                            string,
                            string,
                            string,
                            string,
                          ],
                      )
                    }
                    placeholder="0,00"
                    ariaLabel={`Uplata ${label}`}
                    className="bg-cream-100"
                  />
                </div>
              ),
            )}
          </div>
        </div>

        {/* obračun */}
        <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 flex flex-wrap items-end gap-x-8 gap-y-2">
          <div>
            <div className={labelCls}>Naknada ({formatKm(stopa)}%)</div>
            <div className="text-[15px] font-semibold tabular-nums text-text-primary">
              {formatBAM(naknada)}
            </div>
          </div>
          <div>
            <div className={labelCls}>Uplaćeno</div>
            <div className="text-[15px] tabular-nums text-text-primary">
              {formatBAM(uplaceno)}
            </div>
          </div>
          <div>
            <div className={labelCls}>Za uplatu</div>
            <div
              className={`text-[15px] font-semibold tabular-nums ${razlika > 0 ? "text-accent-500" : "text-success"}`}
            >
              {formatBAM(razlika)}
            </div>
          </div>
        </div>

        {/* podaci za uplatu (budžet kantona) */}
        <div className="rounded-lg bg-info-bg text-info text-[12.5px] leading-5 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold">Podaci za uplatu:</span>
            <PkSelect
              ariaLabel="Kanton"
              value={kanton ?? ""}
              onChange={(v) => setKanton((v as KantonKey) || null)}
              options={[
                { value: "", label: "Izaberi kanton" },
                ...KANTON_OPTIONS,
              ]}
            />
          </div>
          {kanton ? (
            <span>
              Budžet {kantonGenitiv(kanton)}, račun{" "}
              <strong>{kantonBudzetRacun(kanton)}</strong>, vrsta prihoda{" "}
              <strong>{ONS_VRSTA_PRIHODA}</strong>
              {opcina ? (
                <>
                  , šifra općine <strong>{opcina}</strong>
                </>
              ) : null}
              , porezni period {periodOd} - {periodDo}.
            </span>
          ) : (
            <span>Izaberite kanton za račun budžeta.</span>
          )}
        </div>

        {error && <p className="text-[12.5px] text-accent-500">{error}</p>}
        <div className="flex flex-wrap justify-end items-center gap-2">
          {spremljeno && (
            <span className="mr-auto text-[12.5px] text-success font-medium">
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
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate(false)}
            className="px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
          >
            Spremi
          </button>
          <button
            type="button"
            disabled={saveMut.isPending}
            onClick={() => saveMut.mutate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saveMut.isPending ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            Spremi i preuzmi PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}
