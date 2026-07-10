"use client";

// Lager lista: stanje po artiklu i MPC-u na datum presjeka. Status tabovi
// kao u desktop programima (ima na lageru / nema / manjak / sve), pretraga,
// sortiranje. PDF ispis prati AKTIVNE filtere: šta je na ekranu, to ide na
// papir.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconDownload,
  IconListSearch,
  IconLoader2,
  IconPencil,
} from "@tabler/icons-react";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { useLager } from "src/hooks/useLager";
import { useArtikli } from "src/hooks/useKalkulacije";
import { ArtikalModal } from "src/sections/kalkulacije/ArtikalModal";
import type { Artikal } from "src/api/kalkulacije";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM } from "src/lib/format";
import { parseDateInput, todayFormatted } from "src/lib/dateInput";
import { datumHr, downloadTablePdf } from "./robaPdf";
import { ArtikalKarticaModal } from "./ArtikalKarticaModal";

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

type StatusTab = "ima" | "nema" | "manjak" | "sve";

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: "ima", label: "Ima na lageru" },
  { id: "nema", label: "Nema na lageru" },
  { id: "manjak", label: "Manjak" },
  { id: "sve", label: "Sve" },
];

export function LagerTab({ orgId }: { orgId: number | null }) {
  const qc = useQueryClient();
  const [datumS, setDatumS] = useState(todayFormatted());
  const [status, setStatus] = useState<StatusTab>("ima");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"sifra" | "naziv">("sifra");
  const [pdfBusy, setPdfBusy] = useState(false);
  // kartica artikla (klik na red ili dugme): stanje, ulazi
  const [karticaId, setKarticaId] = useState<number | null>(null);
  // direktno uređivanje artikla sa lagera
  const [editArtikal, setEditArtikal] = useState<Artikal | null>(null);
  const { data: artikli } = useArtikli(orgId);

  const datumIso = parseDateInput(datumS) ?? undefined;
  const { data, isLoading } = useLager(orgId, datumIso);

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    const q = search.trim().toLowerCase();
    const filtered = all.filter((r) => {
      if (status === "ima" && !(r.kolicina > 0)) return false;
      if (status === "nema" && r.kolicina !== 0) return false;
      if (status === "manjak" && !(r.kolicina < 0)) return false;
      if (
        q &&
        !r.naziv.toLowerCase().includes(q) &&
        !r.sifra.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
    return filtered.sort((a, b) =>
      sort === "naziv"
        ? a.naziv.localeCompare(b.naziv, "bs") || a.mpc - b.mpc
        : a.sifra.localeCompare(b.sifra, "bs") || a.mpc - b.mpc,
    );
  }, [data, status, search, sort]);

  const sume = useMemo(
    () => ({
      kolicina: rows.reduce((a, r) => a + r.kolicina, 0),
      vrijednost: rows.reduce((a, r) => a + r.vrijednost, 0),
    }),
    [rows],
  );

  async function preuzmiPdf() {
    if (!fullOrg || !data || pdfBusy) return;
    setPdfBusy(true);
    try {
      const statusLabel = STATUS_TABS.find((t) => t.id === status)?.label ?? "";
      const info = [`Prikaz: ${statusLabel}`];
      if (search.trim()) info.push(`Pretraga: "${search.trim()}"`);
      await downloadTablePdf({
        fileName: `Lager-lista-${data.datum}.pdf`,
        org: fullOrg,
        title: "LAGER LISTA",
        subtitle: `na dan ${datumHr(data.datum)} godine`,
        info,
        sections: [
          {
            cols: [
              { label: "R.B.", w: 26 },
              { label: "ŠIFRA", w: 44 },
              { label: "NAZIV ARTIKLA", w: 210 },
              { label: "JED. MJERE", w: 44 },
              { label: "KOLIČINA", w: 60, right: true },
              { label: "MPC", w: 50, right: true },
              { label: "MALOPRODAJNA VRIJEDNOST", w: 80, right: true },
            ],
            rows: rows.map((r, i) => [
              `${i + 1}.`,
              r.sifra,
              r.naziv,
              r.jm,
              kol(r.kolicina),
              km(r.mpc),
              km(r.vrijednost),
            ]),
            totals: [
              "",
              "",
              `Ukupno (${rows.length} stavki)`,
              "",
              kol(sume.kolicina),
              "",
              km(sume.vrijednost),
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
            Zaključno sa datumom
          </div>
          <PkDateInput
            value={datumS}
            onChange={setDatumS}
            ariaLabel="Datum presjeka"
            className="w-[160px]"
          />
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Sortiranje
          </div>
          <PkSelect
            ariaLabel="Sortiranje"
            value={sort}
            onChange={(v) => setSort(v === "naziv" ? "naziv" : "sifra")}
            options={[
              { value: "sifra", label: "Po šifri" },
              { value: "naziv", label: "Po nazivu" },
            ]}
          />
        </div>
        <div className="flex-1 min-w-[180px] max-w-[280px]">
          <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Pretraga
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Šifra ili naziv artikla"
            className="w-full rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
          />
        </div>
        <button
          type="button"
          onClick={preuzmiPdf}
          disabled={pdfBusy || rows.length === 0}
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

      {/* status pod-tabovi */}
      <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100 mb-4 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setStatus(t.id)}
            className={[
              "px-3.5 py-1.5 text-[12.5px] font-medium rounded-full transition-colors whitespace-nowrap",
              status === t.id
                ? "bg-brand-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-cream-200",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream-300">
              <th className={`${thCls} w-[52px]`}>R.br</th>
              <th className={thCls}>Šifra</th>
              <th className={thCls}>Naziv artikla</th>
              <th className={thCls}>J/M</th>
              <th className={`${thCls} text-right`}>Količina</th>
              <th className={`${thCls} text-right`}>MPC</th>
              <th className={`${thCls} text-right`}>Vrijednost</th>
              <th className={`${thCls} text-right`}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={tdCls} colSpan={8}>
                  Učitavanje...
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={8}
                >
                  Nema stavki za izabrane filtere. Lager pune kalkulacije, a
                  prazni proknjiženi popis.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr
                key={`${r.artikalId}-${r.mpc}`}
                onClick={() => setKarticaId(r.artikalId)}
                title="Otvori karticu artikla"
                className="border-b border-cream-300 last:border-b-0 hover:bg-cream-50 transition-colors cursor-pointer"
              >
                <td className={`${tdCls} tabular-nums`}>{i + 1}.</td>
                <td className={`${tdCls} tabular-nums`}>{r.sifra}</td>
                <td className={tdCls}>{r.naziv}</td>
                <td className={tdCls}>{r.jm}</td>
                <td
                  className={`${tdNum} ${r.kolicina < 0 ? "text-accent-500 font-medium" : ""}`}
                >
                  {kol(r.kolicina)}
                </td>
                <td className={tdNum}>{km(r.mpc)}</td>
                <td className={`${tdNum} font-medium`}>
                  {formatBAM(r.vrijednost)}
                </td>
                <td className={tdCls}>
                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setKarticaId(r.artikalId);
                      }}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                      title="Stanje i ulazi artikla"
                    >
                      <IconListSearch size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const a = (artikli ?? []).find(
                          (x) => x.id === r.artikalId,
                        );
                        if (a) setEditArtikal(a);
                      }}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                      title="Uredi artikal"
                    >
                      <IconPencil size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-cream-300 bg-cream-50">
                <td className={`${tdCls} font-medium`} colSpan={4}>
                  Ukupno ({rows.length} stavki)
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {kol(sume.kolicina)}
                </td>
                <td className={tdNum} />
                <td className={`${tdNum} font-semibold`}>
                  {formatBAM(sume.vrijednost)}
                </td>
                <td className={tdCls} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <ArtikalKarticaModal
        orgId={orgId}
        artikalId={karticaId}
        onClose={() => setKarticaId(null)}
      />
      <ArtikalModal
        open={editArtikal != null}
        orgId={orgId}
        artikal={editArtikal}
        onClose={() => setEditArtikal(null)}
        onSaved={() => {
          // naziv/šifra na lager listi dolaze iz šifarnika
          qc.invalidateQueries({ queryKey: ["lager", orgId] });
        }}
      />
    </div>
  );
}
