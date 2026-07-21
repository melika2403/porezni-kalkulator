"use client";

// Lager lista: stanje po artiklu i MPC-u na datum presjeka. Status tabovi
// kao u desktop programima (ima na lageru / nema / manjak / sve), pretraga,
// sortiranje u oba smjera, brzi datumi presjeka, traka vrijednosti zalihe
// (maloprodajna/nabavna/RUC), opcione nabavne kolone. PDF i CSV prate
// AKTIVNE filtere: šta je na ekranu, to ide u fajl.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconDownload,
  IconFileUpload,
  IconListSearch,
  IconLoader2,
  IconPencil,
  IconTag,
} from "@tabler/icons-react";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { useLager } from "src/hooks/useLager";
import { useArtikli } from "src/hooks/useKalkulacije";
import { ArtikalModal } from "src/sections/kalkulacije/ArtikalModal";
import type { Artikal } from "src/api/kalkulacije";
import type { LagerRow } from "src/api/lager";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { parseDateInput, todayFormatted } from "src/lib/dateInput";
import { datumHr, downloadTablePdf } from "./robaPdf";
import { ArtikalKarticaModal } from "./ArtikalKarticaModal";
import { UvozPocetnogStanjaModal } from "./UvozPocetnogStanjaModal";

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
const cij = (n: number) =>
  n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type StatusTab = "ima" | "nema" | "manjak" | "sve";

const STATUS_TABS: { id: StatusTab; label: string }[] = [
  { id: "ima", label: "Ima na lageru" },
  { id: "nema", label: "Nema na lageru" },
  { id: "manjak", label: "Manjak" },
  { id: "sve", label: "Sve" },
];

type SortId =
  | "sifra"
  | "sifra-d"
  | "naziv"
  | "naziv-d"
  | "kolicina-d"
  | "kolicina-a"
  | "vrijednost-d"
  | "vrijednost-a";

const SORT_OPTIONS: { value: SortId; label: string }[] = [
  { value: "sifra", label: "Po šifri (rastuće)" },
  { value: "sifra-d", label: "Po šifri (opadajuće)" },
  { value: "naziv", label: "Po nazivu (A-Z)" },
  { value: "naziv-d", label: "Po nazivu (Z-A)" },
  { value: "kolicina-d", label: "Po količini (veća prvo)" },
  { value: "kolicina-a", label: "Po količini (manja prvo)" },
  { value: "vrijednost-d", label: "Po vrijednosti (veća prvo)" },
  { value: "vrijednost-a", label: "Po vrijednosti (manja prvo)" },
];

function usporedi(a: LagerRow, b: LagerRow, sort: SortId): number {
  switch (sort) {
    case "sifra":
      return a.sifra.localeCompare(b.sifra, "bs") || a.mpc - b.mpc;
    case "sifra-d":
      return b.sifra.localeCompare(a.sifra, "bs") || a.mpc - b.mpc;
    case "naziv":
      return a.naziv.localeCompare(b.naziv, "bs") || a.mpc - b.mpc;
    case "naziv-d":
      return b.naziv.localeCompare(a.naziv, "bs") || a.mpc - b.mpc;
    case "kolicina-d":
      return b.kolicina - a.kolicina;
    case "kolicina-a":
      return a.kolicina - b.kolicina;
    case "vrijednost-d":
      return b.vrijednost - a.vrijednost;
    case "vrijednost-a":
      return a.vrijednost - b.vrijednost;
  }
}

export function LagerTab({ orgId }: { orgId: number | null }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [datumS, setDatumS] = useState(todayFormatted());
  const [status, setStatus] = useState<StatusTab>("ima");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortId>("sifra");
  const [pokaziNabavne, setPokaziNabavne] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [uvozOpen, setUvozOpen] = useState(false);
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
  const orgObveznik = Boolean(fullOrg?.isPdvObveznik);

  // brzi presjeci: danas, kraj prošlog mjeseca, kraj prošle godine
  const brziDatumi = useMemo(() => {
    const sad = new Date();
    return [
      { label: "Danas", value: todayFormatted() },
      {
        label: "Kraj prošlog mjeseca",
        value: formatDate(new Date(sad.getFullYear(), sad.getMonth(), 0)),
      },
      {
        label: `31.12.${sad.getFullYear() - 1}.`,
        value: `31.12.${sad.getFullYear() - 1}.`,
      },
    ];
  }, []);

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
    return filtered.sort((a, b) => usporedi(a, b, sort));
  }, [data, status, search, sort]);

  // manjak na cijelom lageru (ne samo u filtriranom prikazu): negativno
  // stanje obično znači grešku u knjiženju, pa badge upozorava odmah
  const manjakCount = useMemo(
    () => (data?.rows ?? []).filter((r) => r.kolicina < 0).length,
    [data],
  );

  const sume = useMemo(() => {
    const vrijednost = r2(rows.reduce((a, r) => a + r.vrijednost, 0));
    const nabavna = r2(rows.reduce((a, r) => a + r.nabavnaVrijednost, 0));
    // vrijednost zalihe bez PDV-a (obveznik): oslobođeni artikli bez 17%
    const bezPdv = r2(
      rows.reduce(
        (a, r) =>
          a + (orgObveznik && !r.oslobodjenPdv ? r.vrijednost / 1.17 : r.vrijednost),
        0,
      ),
    );
    return {
      kolicina: rows.reduce((a, r) => a + r.kolicina, 0),
      vrijednost,
      nabavna,
      bezPdv,
      ruc: r2(bezPdv - nabavna),
      artikala: new Set(rows.map((r) => r.artikalId)).size,
    };
  }, [rows, orgObveznik]);

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
              { label: "NAZIV ARTIKLA", w: pokaziNabavne ? 150 : 210 },
              { label: "JED. MJERE", w: 44 },
              { label: "KOLIČINA", w: 56, right: true },
              { label: "MPC", w: 48, right: true },
              ...(pokaziNabavne
                ? [
                    { label: "NABAVNA CIJENA", w: 54, right: true },
                    { label: "NABAVNA VRIJEDNOST", w: 66, right: true },
                  ]
                : []),
              { label: "MALOPRODAJNA VRIJEDNOST", w: 80, right: true },
            ],
            rows: rows.map((r, i) => [
              `${i + 1}.`,
              r.sifra,
              r.naziv,
              r.jm,
              kol(r.kolicina),
              km(r.mpc),
              ...(pokaziNabavne
                ? [cij(r.nabavnaCijena), km(r.nabavnaVrijednost)]
                : []),
              km(r.vrijednost),
            ]),
            totals: [
              "",
              "",
              `Ukupno (${rows.length} stavki, ${sume.artikala} artikala)`,
              "",
              kol(sume.kolicina),
              "",
              ...(pokaziNabavne ? ["", km(sume.nabavna)] : []),
              km(sume.vrijednost),
            ],
          },
        ],
      });
    } finally {
      setPdfBusy(false);
    }
  }

  // CSV za Excel (BOM + ";"): uvijek nosi i nabavne kolone i zadnji ulaz
  function izvozCsv() {
    if (!data) return;
    const esc = (c: string) =>
      /[";\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c;
    const linije: string[][] = [
      [
        "R.br",
        "Šifra",
        "Naziv artikla",
        "J/M",
        "Količina",
        "MPC",
        "Vrijednost",
        "Nabavna cijena",
        "Nabavna vrijednost",
        "Zadnji ulaz",
      ],
      ...rows.map((r, i) => [
        `${i + 1}.`,
        r.sifra,
        r.naziv,
        r.jm,
        kol(r.kolicina),
        km(r.mpc),
        km(r.vrijednost),
        cij(r.nabavnaCijena),
        km(r.nabavnaVrijednost),
        r.zadnjiUlaz ? formatDate(r.zadnjiUlaz) : "",
      ]),
      [
        "",
        "",
        `Ukupno (${rows.length} stavki, ${sume.artikala} artikala)`,
        "",
        kol(sume.kolicina),
        "",
        km(sume.vrijednost),
        "",
        km(sume.nabavna),
        "",
      ],
    ];
    const csv =
      "\uFEFF" + linije.map((l) => l.map(esc).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Lager-lista-${data.datum}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const brojKolona = pokaziNabavne ? 11 : 9;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-2">
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
            onChange={(v) => setSort(v as SortId)}
            options={SORT_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
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
        <label
          className="flex items-center gap-2 text-[12.5px] text-text-primary cursor-pointer pb-2.5"
          title="Prosječna nabavna cijena iz kalkulacija: dodaje kolone nabavna cijena i nabavna vrijednost u tabelu i PDF (interna verzija liste)"
        >
          <input
            type="checkbox"
            checked={pokaziNabavne}
            onChange={(e) => setPokaziNabavne(e.target.checked)}
            className="accent-brand-600"
          />
          Prikaži nabavne cijene
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUvozOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
            title="Uvoz početnog stanja zaliha iz drugog programa (CSV): kreira popis početnog stanja za pregled i proknjižavanje"
          >
            <IconFileUpload size={15} />
            Uvoz početnog stanja
          </button>
          <button
            type="button"
            onClick={izvozCsv}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
            title="Izvoz prikazanih stavki u CSV za Excel (sa nabavnim cijenama i zadnjim ulazom)"
          >
            <IconDownload size={15} />
            Izvoz (CSV)
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
            Preuzmi PDF
          </button>
        </div>
      </div>

      {/* brzi presjeci */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {brziDatumi.map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={() => setDatumS(b.value)}
            className={[
              "px-3 py-1 text-[12px] font-medium rounded-full border transition-colors",
              datumS === b.value
                ? "border-brand-600 bg-brand-100 text-brand-700"
                : "border-cream-300 bg-cream-100 text-text-secondary hover:text-text-primary hover:bg-cream-200",
            ].join(" ")}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* status pod-tabovi */}
      <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100 mb-4 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setStatus(t.id)}
            className={[
              "px-3.5 py-1.5 text-[12.5px] font-medium rounded-full transition-colors whitespace-nowrap inline-flex items-center",
              status === t.id
                ? "bg-brand-600 text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-cream-200",
            ].join(" ")}
          >
            {t.label}
            {t.id === "manjak" && manjakCount > 0 && (
              <span
                className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent-500 text-white text-[10.5px] font-semibold"
                title="Negativno stanje obično znači grešku u knjiženju (fali kalkulacija ili popis)"
              >
                {manjakCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* vrijednost zalihe za prikazane stavke */}
      {rows.length > 0 && (
        <div className="rounded-xl border border-cream-300 bg-cream-100 px-4 py-3 mb-4 flex flex-wrap items-end gap-x-8 gap-y-2">
          <SumaItem
            label="Maloprodajna vrijednost"
            value={sume.vrijednost}
            bold
          />
          {orgObveznik && (
            <SumaItem label="Vrijednost bez PDV-a" value={sume.bezPdv} />
          )}
          <SumaItem label="Nabavna vrijednost" value={sume.nabavna} />
          <SumaItem label="Ukalkulisana marža (RUC)" value={sume.ruc} />
          <p className="ml-auto self-center text-[11.5px] leading-4 text-text-tertiary max-w-[300px]">
            Za prikazane stavke i datum presjeka. Nabavna je prosječna iz
            kalkulacija; roba knjižena samo popisom nema nabavnu.
          </p>
        </div>
      )}

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
              {pokaziNabavne && (
                <>
                  <th className={`${thCls} text-right`}>Nab. cijena</th>
                  <th className={`${thCls} text-right`}>Nab. vrijednost</th>
                </>
              )}
              <th className={thCls}>Zadnji ulaz</th>
              <th className={`${thCls} text-right`}>Akcije</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className={tdCls} colSpan={brojKolona}>
                  Učitavanje...
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-[13px] text-text-tertiary"
                  colSpan={brojKolona}
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
                {pokaziNabavne && (
                  <>
                    <td className={tdNum}>{cij(r.nabavnaCijena)}</td>
                    <td className={tdNum}>{km(r.nabavnaVrijednost)}</td>
                  </>
                )}
                <td className={tdCls}>
                  {r.zadnjiUlaz ? formatDate(r.zadnjiUlaz) : "–"}
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
                      disabled={r.kolicina <= 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(
                          `/app/lager?tab=nivelacije&artikal=${r.artikalId}&mpc=${encodeURIComponent(String(r.mpc))}`,
                        );
                      }}
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-brand-600 hover:bg-cream-200 transition-colors disabled:opacity-40"
                      title="Nivelacija (promjena cijene ove robe)"
                    >
                      <IconTag size={16} />
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
                  Ukupno ({rows.length} stavki, {sume.artikala} artikala)
                </td>
                <td className={`${tdNum} font-semibold`}>
                  {kol(sume.kolicina)}
                </td>
                <td className={tdNum} />
                <td className={`${tdNum} font-semibold`}>
                  {formatBAM(sume.vrijednost)}
                </td>
                {pokaziNabavne && (
                  <>
                    <td className={tdNum} />
                    <td className={`${tdNum} font-semibold`}>
                      {formatBAM(sume.nabavna)}
                    </td>
                  </>
                )}
                <td className={tdCls} />
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
      {uvozOpen && orgId != null && (
        <UvozPocetnogStanjaModal
          orgId={orgId}
          onClose={() => setUvozOpen(false)}
        />
      )}
    </div>
  );
}

function SumaItem({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
        {label}
      </div>
      <div
        className={[
          "text-[14px] tabular-nums",
          bold ? "text-brand-700 font-semibold" : "text-text-primary",
        ].join(" ")}
      >
        {formatBAM(value)}
      </div>
    </div>
  );
}
