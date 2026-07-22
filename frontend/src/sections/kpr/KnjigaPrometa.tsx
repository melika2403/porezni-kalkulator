"use client";

// Knjiga prometa (Obrazac KP-1042): evidencija dnevnog prometa naplaćenog
// u gotovini, po prodajnom mjestu, upis najkasnije naredni dan. Upisuje se
// SAMO prihod (promet), rashodi ne postoje u ovoj knjizi. Evidencija je
// zajednička sa dnevnim pazarom TKM-a (jedan unos, obje knjige); trgovci
// koji vode TKM nisu dužni voditi KP-1042.
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconDownload,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { PkSelect } from "src/components/app-shell/PkSelect";
import {
  useDeleteTkmPazar,
  useTkmPazari,
} from "src/hooks/useLager";
import { DnevniPazarModal } from "src/sections/lager/DnevniPazarModal";
import { getOrganization, updateOrganizationSettings } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { downloadTablePdf } from "src/sections/lager/robaPdf";

const thCls =
  "px-3 py-2.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap";
const tdCls = "px-3 py-2.5 text-[12.5px] text-text-primary whitespace-nowrap";
const tdNum = `${tdCls} text-right tabular-nums`;

const km = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const MJESECI = [
  "Svi mjeseci", "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "August", "Septembar", "Oktobar", "Novembar", "Decembar",
];

export function KnjigaPrometa({ orgId }: { orgId: number | null }) {
  const currentYear = new Date().getFullYear();
  const [godina, setGodina] = useState(currentYear);
  const [mjesec, setMjesec] = useState(0); // 0 = svi
  const [unosOpen, setUnosOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const { data: sviRedovi, isLoading } = useTkmPazari(orgId, godina);
  const deleteM = useDeleteTkmPazar(orgId);

  const qc = useQueryClient();
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  // opcija po obrtu: KPR prihod od pazara iz KP-1042 umjesto pologa sa izvoda
  const pazarIzKp = Boolean(fullOrg?.kprPazarIzKp);
  const toggleM = useMutation({
    mutationFn: (v: boolean) =>
      unwrap(
        updateOrganizationSettings(orgId as number, { kprPazarIzKp: v }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-org", orgId] });
      // mijenja sadržaj KPR knjige
      qc.invalidateQueries({ queryKey: ["kpr", orgId] });
    },
  });

  // godišnji redni broj se dodjeljuje na PUNOJ listi (po datumu), pa se
  // tek onda filtrira mjesec, da r.br ostane kao u knjizi
  const rows = useMemo(() => {
    const all = (sviRedovi ?? []).map((r, i) => ({ ...r, rbr: i + 1 }));
    if (!mjesec) return all;
    const mm = String(mjesec).padStart(2, "0");
    return all.filter((r) => r.datum.slice(5, 7) === mm);
  }, [sviRedovi, mjesec]);

  const suma = useMemo(
    () => r2(rows.reduce((a, r) => a + r.iznos, 0)),
    [rows],
  );

  async function preuzmiPdf() {
    if (!fullOrg || pdfBusy || rows.length === 0) return;
    setPdfBusy(true);
    try {
      await downloadTablePdf({
        fileName: `KP-1042-${godina}${mjesec ? `-${String(mjesec).padStart(2, "0")}` : ""}.pdf`,
        org: fullOrg,
        title: "KNJIGA PROMETA - Obrazac KP-1042",
        subtitle: mjesec
          ? `za ${MJESECI[mjesec].toLowerCase()} ${godina}. godine`
          : `za ${godina}. godinu`,
        info: [
          `Prodajno mjesto: ${[fullOrg.address, fullOrg.city].filter(Boolean).join(", ") || fullOrg.name}`,
        ],
        sections: [
          {
            cols: [
              { label: "REDNI BROJ", w: 40 },
              { label: "DATUM UPISA", w: 60 },
              { label: "BROJ DOKUMENTA / OPIS", w: 250 },
              { label: "IZNOS PROMETA U GOTOVINI", w: 90, right: true },
            ],
            rows: rows.map((r) => [
              `${r.rbr}.`,
              formatDate(r.datum),
              r.opis || "Dnevni promet (pazar)",
              km(r.iznos),
            ]),
            totals: ["", "", `Ukupno (${rows.length} upisa)`, km(suma)],
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
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Mjesec
          </div>
          <PkSelect
            ariaLabel="Mjesec"
            value={String(mjesec)}
            onChange={(v) => setMjesec(Number(v) || 0)}
            options={MJESECI.map((m, i) => ({ value: String(i), label: m }))}
          />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={preuzmiPdf}
            disabled={pdfBusy || rows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cream-300 text-[12.5px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            {pdfBusy ? (
              <IconLoader2 size={15} className="animate-spin" />
            ) : (
              <IconDownload size={15} />
            )}
            KP-1042 (PDF)
          </button>
          <button
            type="button"
            onClick={() => setUnosOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <IconPlus size={15} />
            Unesi dnevni promet
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={`${thCls} w-[70px]`}>R.br</th>
              <th className={thCls}>Datum</th>
              <th className={thCls}>Broj dokumenta / opis</th>
              <th className={`${thCls} text-right`}>Iznos prometa</th>
              <th className={`${thCls} text-right w-[60px]`} />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={tdCls} colSpan={5}>
                  Učitavanje...
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={5}
                >
                  Nema upisa. Dnevni promet u gotovini se upisuje najkasnije
                  naredni dan; unos je zajednički sa dnevnim pazarom TKM-a.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-cream-300 last:border-b-0"
              >
                <td className={`${tdCls} tabular-nums`}>{r.rbr}.</td>
                <td className={tdCls}>{formatDate(r.datum)}</td>
                <td className={tdCls}>{r.opis || "Dnevni promet (pazar)"}</td>
                <td className={`${tdNum} font-medium`}>
                  {formatBAM(r.iznos)}
                </td>
                <td className={`${tdCls} text-right`}>
                  <button
                    type="button"
                    onClick={() => deleteM.mutate(r.id)}
                    disabled={deleteM.isPending}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors disabled:opacity-50"
                    title="Obriši upis (briše se i iz TKM-a)"
                  >
                    <IconTrash size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-cream-300 bg-cream-50">
                <td className={`${tdCls} font-medium`} colSpan={3}>
                  Ukupno ({rows.length} upisa)
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {formatBAM(suma)}
                </td>
                <td className={tdCls} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* izvor pazara u KPR: KP-1042 umjesto pologa sa izvoda */}
      <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 mt-4">
        <label className="flex items-start gap-2.5 text-[13px] text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={pazarIzKp}
            onChange={(e) => toggleM.mutate(e.target.checked)}
            disabled={toggleM.isPending || !fullOrg}
            className="accent-brand-600 mt-0.5"
          />
          <span>
            <strong>
              Prihod od pazara u KPR upisuj iz ove knjige (dnevni promet)
            </strong>
            <span className="block text-[12px] text-text-tertiary mt-1">
              Uključeno: svaki upis odavde ulazi u KPR kao prihod u gotovini
              (kolona 11{fullOrg?.isPdvObveznik ? ", sa izbijanjem PDV-a" : ""}
              ) na dan prometa, a <strong>polozi pazara sa izvoda (kategorija
              &quot;Pazar&quot;) više NE ulaze u KPR</strong>, ni ručno
              potvrđeni, da se isti novac ne knjiži dvaput; oni ostaju samo
              evidencija priliva. Ostale kategorije prihoda sa izvoda ulaze
              normalno. Obaveza: dnevni promet se tada mora redovno unositi
              ovdje.
            </span>
          </span>
        </label>
        {toggleM.isPending && (
          <p className="text-[12px] text-text-tertiary mt-1.5 inline-flex items-center gap-1.5">
            <IconLoader2 size={13} className="animate-spin" /> Spremam...
          </p>
        )}
      </div>

      <p className="text-[11.5px] text-text-tertiary mt-3 max-w-2xl">
        U KP-1042 se upisuje SAMO promet (prihod) naplaćen u gotovini, po
        prodajnom mjestu. Isti unosi razdužuju i TKM, pa trgovci koji vode
        TKM nisu dužni posebno voditi ovu knjigu. Unos ne ide u KIF/PDV,
        pazar za PDV se knjiži na PDV stranici.
      </p>

      <DnevniPazarModal
        open={unosOpen}
        orgId={orgId}
        onClose={() => setUnosOpen(false)}
      />
    </div>
  );
}
