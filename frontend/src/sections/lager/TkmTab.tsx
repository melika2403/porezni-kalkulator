"use client";

// TKM (trgovačka knjiga na malo): izvedena knjiga po pravilniku, kolone
// r.br / datum / opis promjene / zaduženje / razduženje (+ tekući saldo na
// ekranu). Zaduženje pune kalkulacije i višak po popisu, razduženje pazar i
// manjak po popisu. Ništa se ne unosi ovdje, knjiga se izvodi iz dokumenata.
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconCheck,
  IconDownload,
  IconLoader2,
  IconTrash,
} from "@tabler/icons-react";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import {
  useDeleteTkmPazar,
  useSetTkmPocetnoStanje,
  useTkm,
} from "src/hooks/useLager";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { formatKm, parseKm } from "src/lib/amountInput";
import { downloadTkmPdf } from "./tkmPdf";
import { DnevniPazarModal } from "./DnevniPazarModal";

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function TkmTab({ orgId }: { orgId: number | null }) {
  const currentYear = new Date().getFullYear();
  const [godina, setGodina] = useState(currentYear);
  const { data, isLoading } = useTkm(orgId, godina);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pazarOpen, setPazarOpen] = useState(false);

  // ručni unos početnog stanja (obrti koji ulaze sa već zaduženom radnjom)
  const setPocetnoM = useSetTkmPocetnoStanje(orgId);
  const [pocetnoS, setPocetnoS] = useState("");
  const [pocetnoNapomena, setPocetnoNapomena] = useState("");
  useEffect(() => {
    setPocetnoS(
      data?.rucnoPocetno != null ? formatKm(data.rucnoPocetno) : "",
    );
    setPocetnoNapomena(data?.rucnoNapomena ?? "");
  }, [data?.rucnoPocetno, data?.rucnoNapomena]);

  const deletePazarM = useDeleteTkmPazar(orgId);

  async function spremiPocetno() {
    const iznos = parseKm(pocetnoS) ?? 0;
    await setPocetnoM.mutateAsync({
      godina,
      iznos,
      napomena: pocetnoNapomena.trim(),
    });
  }

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  // redovi sa tekućim saldom; donos kao prvi red kad postoji
  const rows = useMemo(() => {
    if (!data) return [];
    const out: {
      datum: string | null;
      opis: string;
      zaduzenje: number;
      razduzenje: number;
      saldo: number;
      tkmPazarId?: number | null;
    }[] = [];
    let saldo = 0;
    if (data.donos !== 0) {
      saldo = r2(data.donos);
      out.push({
        datum: null,
        opis: "Početno stanje (prenos salda iz prethodne godine)",
        zaduzenje: data.donos,
        razduzenje: 0,
        saldo,
      });
    }
    for (const e of data.events) {
      saldo = r2(saldo + e.zaduzenje - e.razduzenje);
      out.push({ ...e, saldo });
    }
    return out;
  }, [data]);

  const sume = useMemo(
    () => ({
      zaduzenje: r2(rows.reduce((a, e) => a + e.zaduzenje, 0)),
      razduzenje: r2(rows.reduce((a, e) => a + e.razduzenje, 0)),
    }),
    [rows],
  );
  const saldo = r2(sume.zaduzenje - sume.razduzenje);

  async function preuzmiPdf() {
    if (!fullOrg || !data || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadTkmPdf({
        org: fullOrg,
        godina: data.godina,
        donos: data.donos,
        events: data.events,
        // istekla godina: na ispis ide i blok o zaključenju knjige
        zakljucena: data.godina < currentYear,
      });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Godina
          </div>
          <PkSelect
            ariaLabel="Godina"
            value={String(godina)}
            onChange={(v) => setGodina(Number(v) || currentYear)}
            options={[0, 1, 2].map((d) => ({
              value: String(currentYear - d),
              label: String(currentYear - d),
            }))}
          />
        </div>
        <p className="text-[12px] text-text-tertiary max-w-md pb-1">
          Knjiga se izvodi iz kalkulacija (zaduženje), pazara (razduženje) i
          proknjiženih popisa (višak/manjak). Ovdje se ništa ne unosi ručno.
        </p>
        <button
          type="button"
          onClick={() => setPazarOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
        >
          Unesi dnevni pazar
        </button>
        <button
          type="button"
          onClick={preuzmiPdf}
          disabled={pdfBusy || rows.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pdfBusy ? (
            <IconLoader2 size={15} className="animate-spin" />
          ) : (
            <IconDownload size={15} />
          )}
          Preuzmi PDF (TKM)
        </button>
      </div>

      {/* ručni unos početnog stanja, odvojeno od izvedene knjige */}
      <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Početno stanje za {godina}. (ručni unos)
          </div>
          <div className="w-[160px]">
            <PkAmountInput
              value={pocetnoS}
              onChange={setPocetnoS}
              ariaLabel="Ručno početno stanje"
              className="bg-cream-50"
            />
          </div>
        </div>
        <div className="flex-1 min-w-[200px] max-w-[360px]">
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Napomena (opciono)
          </div>
          <input
            value={pocetnoNapomena}
            onChange={(e) => setPocetnoNapomena(e.target.value)}
            placeholder="npr. stanje iz prethodnog programa"
            className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
          />
        </div>
        <button
          type="button"
          disabled={setPocetnoM.isPending}
          onClick={spremiPocetno}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
        >
          {setPocetnoM.isPending ? (
            <IconLoader2 size={15} className="animate-spin" />
          ) : (
            <IconCheck size={15} />
          )}
          Spremi početno stanje
        </button>
        <p className="w-full text-[11.5px] text-text-tertiary">
          Za obrte koji u PK Office ulaze sa već zaduženom radnjom: iznos se
          knjiži kao prvi red zaduženja 01.01. Unos 0,00 briše red.
        </p>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={`${thCls} w-[52px]`}>R.br</th>
              <th className={thCls}>Datum</th>
              <th className={thCls}>Opis promjene</th>
              <th className={`${thCls} text-right`}>Zaduženje</th>
              <th className={`${thCls} text-right`}>Razduženje</th>
              <th className={`${thCls} text-right`}>Saldo</th>
              <th className={`${thCls} text-right w-[60px]`} />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={tdCls} colSpan={7}>
                  Učitavanje...
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={7}
                >
                  Nema promjena u {godina}. godini. Zaduženja dolaze iz
                  kalkulacija, razduženja iz pazara i popisa.
                </td>
              </tr>
            )}
            {rows.map((e, i) => (
              <tr
                key={i}
                className="border-b border-cream-300 last:border-b-0"
              >
                <td className={`${tdCls} tabular-nums`}>{i + 1}.</td>
                <td className={tdCls}>{e.datum ? formatDate(e.datum) : "–"}</td>
                <td className={`${tdCls} whitespace-normal`}>{e.opis}</td>
                <td className={tdNum}>
                  {e.zaduzenje ? formatBAM(e.zaduzenje) : ""}
                </td>
                <td className={tdNum}>
                  {e.razduzenje ? formatBAM(e.razduzenje) : ""}
                </td>
                <td className={`${tdNum} font-medium`}>
                  {formatBAM(e.saldo)}
                </td>
                <td className={`${tdCls} text-right`}>
                  {e.tkmPazarId != null && (
                    <button
                      type="button"
                      onClick={() => deletePazarM.mutate(e.tkmPazarId as number)}
                      disabled={deletePazarM.isPending}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors disabled:opacity-50"
                      title="Obriši ovaj unos pazara iz TKM-a"
                    >
                      <IconTrash size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-cream-300 bg-cream-50">
                <td className={`${tdCls} font-medium`} colSpan={3}>
                  Ukupno
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {formatBAM(sume.zaduzenje)}
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {formatBAM(sume.razduzenje)}
                </td>
                <td className={`${tdNum} font-semibold text-brand-700`}>
                  {formatBAM(saldo)}
                </td>
                <td className={tdCls} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <DnevniPazarModal
        open={pazarOpen}
        orgId={orgId}
        onClose={() => setPazarOpen(false)}
      />
    </div>
  );
}
