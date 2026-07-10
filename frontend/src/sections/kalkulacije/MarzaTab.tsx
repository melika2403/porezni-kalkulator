"use client";

// Izvještaj o marži (razlici u cijeni): iz snimljenih stavki kalkulacija,
// po artiklu ili po dobavljaču za izabrani period. Pokazuje ukalkulisanu
// zaradu (prodajna bez PDV-a minus nabavna), sa PDF ispisom.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconDownload, IconLoader2 } from "@tabler/icons-react";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { useMarza } from "src/hooks/useKalkulacije";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM } from "src/lib/format";
import { parseDateInput } from "src/lib/dateInput";
import { datumHr, downloadTablePdf } from "src/sections/lager/robaPdf";

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;

const kol = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 3 });
const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const pct = (n: number) =>
  `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function MarzaTab({ orgId }: { orgId: number | null }) {
  const godina = new Date().getFullYear();
  const [odS, setOdS] = useState(`01.01.${godina}.`);
  const [doS, setDoS] = useState(`31.12.${godina}.`);
  const [groupBy, setGroupBy] = useState<"artikal" | "dobavljac">("artikal");
  const [pdfBusy, setPdfBusy] = useState(false);

  const from = parseDateInput(odS) ?? undefined;
  const to = parseDateInput(doS) ?? undefined;
  const { data: rows, isLoading } = useMarza(orgId, { from, to, groupBy });

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const sume = useMemo(() => {
    const all = rows ?? [];
    const nabavni = r2(all.reduce((a, x) => a + x.nabavniIznos, 0));
    const marza = r2(all.reduce((a, x) => a + x.marzaIznos, 0));
    return {
      nabavni,
      bezPdv: r2(all.reduce((a, x) => a + x.vrijednostBezPdv, 0)),
      marza,
      malopr: r2(all.reduce((a, x) => a + x.maloprodajniIznos, 0)),
      pct: nabavni > 0 ? Math.round((marza / nabavni) * 1e4) / 100 : 0,
    };
  }, [rows]);

  const poArtiklu = groupBy === "artikal";

  async function preuzmiPdf() {
    if (!fullOrg || !rows || pdfBusy) return;
    setPdfBusy(true);
    try {
      await downloadTablePdf({
        fileName: `Marza-${from ?? "od"}-${to ?? "do"}.pdf`,
        org: fullOrg,
        title: "IZVJEŠTAJ O MARŽI (RAZLICI U CIJENI)",
        subtitle: `za period ${from ? datumHr(from) : "..."} - ${to ? datumHr(to) : "..."}`,
        info: [
          `Grupisano po: ${poArtiklu ? "artiklu" : "dobavljaču"} (iz kalkulacija)`,
        ],
        sections: [
          {
            cols: [
              { label: "R.B.", w: 26 },
              ...(poArtiklu ? [{ label: "ŠIFRA", w: 44 }] : []),
              {
                label: poArtiklu ? "NAZIV ARTIKLA" : "DOBAVLJAČ",
                w: 180,
              },
              {
                label: poArtiklu ? "KOLIČINA" : "BROJ KALKULACIJA",
                w: 54,
                right: true,
              },
              { label: "NABAVNA VRIJEDNOST", w: 66, right: true },
              { label: "PRODAJNA BEZ PDV-a", w: 66, right: true },
              { label: "MARŽA", w: 56, right: true },
              { label: "MARŽA %", w: 46, right: true },
              { label: "MALOPRODAJNA VRIJEDNOST", w: 70, right: true },
            ],
            rows: rows.map((x, i) => [
              `${i + 1}.`,
              ...(poArtiklu ? [x.sifra ?? ""] : []),
              x.naziv,
              poArtiklu
                ? kol(x.kolicina ?? 0)
                : String(x.brojKalkulacija ?? 0),
              km(x.nabavniIznos),
              km(x.vrijednostBezPdv),
              km(x.marzaIznos),
              pct(x.marzaPct),
              km(x.maloprodajniIznos),
            ]),
            totals: [
              "",
              ...(poArtiklu ? [""] : []),
              `Ukupno (${rows.length})`,
              "",
              km(sume.nabavni),
              km(sume.bezPdv),
              km(sume.marza),
              pct(sume.pct),
              km(sume.malopr),
            ],
          },
        ],
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
            Od datuma
          </div>
          <PkDateInput
            value={odS}
            onChange={setOdS}
            ariaLabel="Period od"
            className="w-[160px]"
          />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Do datuma
          </div>
          <PkDateInput
            value={doS}
            onChange={setDoS}
            ariaLabel="Period do"
            className="w-[160px]"
          />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Grupisanje
          </div>
          <PkSelect
            ariaLabel="Grupisanje"
            value={groupBy}
            onChange={(v) =>
              setGroupBy(v === "dobavljac" ? "dobavljac" : "artikal")
            }
            options={[
              { value: "artikal", label: "Po artiklu" },
              { value: "dobavljac", label: "Po dobavljaču" },
            ]}
          />
        </div>
        <button
          type="button"
          onClick={preuzmiPdf}
          disabled={pdfBusy || (rows ?? []).length === 0}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pdfBusy ? (
            <IconLoader2 size={15} className="animate-spin" />
          ) : (
            <IconDownload size={15} />
          )}
          Preuzmi PDF
        </button>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={`${thCls} w-[52px]`}>R.br</th>
              {poArtiklu && <th className={thCls}>Šifra</th>}
              <th className={thCls}>
                {poArtiklu ? "Naziv artikla" : "Dobavljač"}
              </th>
              <th className={`${thCls} text-right`}>
                {poArtiklu ? "Količina" : "Kalkulacija"}
              </th>
              <th className={`${thCls} text-right`}>Nabavna vrijednost</th>
              <th className={`${thCls} text-right`}>Prodajna bez PDV-a</th>
              <th className={`${thCls} text-right`}>Marža</th>
              <th className={`${thCls} text-right`}>Marža %</th>
              <th className={`${thCls} text-right`}>Malopr. vrijednost</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={tdCls} colSpan={poArtiklu ? 9 : 8}>
                  Učitavanje...
                </td>
              </tr>
            )}
            {!isLoading && (rows ?? []).length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={poArtiklu ? 9 : 8}
                >
                  Nema kalkulacija u izabranom periodu.
                </td>
              </tr>
            )}
            {(rows ?? []).map((x, i) => (
              <tr
                key={`${x.id ?? "x"}-${i}`}
                className="border-b border-cream-300 last:border-b-0"
              >
                <td className={`${tdCls} tabular-nums`}>{i + 1}.</td>
                {poArtiklu && (
                  <td className={`${tdCls} tabular-nums`}>{x.sifra}</td>
                )}
                <td className={tdCls}>{x.naziv}</td>
                <td className={tdNum}>
                  {poArtiklu ? kol(x.kolicina ?? 0) : (x.brojKalkulacija ?? 0)}
                </td>
                <td className={tdNum}>{formatBAM(x.nabavniIznos)}</td>
                <td className={tdNum}>{formatBAM(x.vrijednostBezPdv)}</td>
                <td className={`${tdNum} font-medium`}>
                  {formatBAM(x.marzaIznos)}
                </td>
                <td className={tdNum}>{pct(x.marzaPct)}</td>
                <td className={tdNum}>{formatBAM(x.maloprodajniIznos)}</td>
              </tr>
            ))}
          </tbody>
          {(rows ?? []).length > 0 && (
            <tfoot>
              <tr className="border-t border-cream-300 bg-cream-50">
                <td
                  className={`${tdCls} font-medium`}
                  colSpan={poArtiklu ? 4 : 3}
                >
                  Ukupno ({(rows ?? []).length})
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {formatBAM(sume.nabavni)}
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {formatBAM(sume.bezPdv)}
                </td>
                <td className={`${tdNum} font-semibold text-brand-700`}>
                  {formatBAM(sume.marza)}
                </td>
                <td className={`${tdNum} font-semibold`}>{pct(sume.pct)}</td>
                <td className={`${tdNum} font-semibold`}>
                  {formatBAM(sume.malopr)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
