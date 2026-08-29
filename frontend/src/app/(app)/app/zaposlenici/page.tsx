"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconClipboardText,
  IconDownload,
  IconFileText,
  IconFileX,
  IconId,
  IconInbox,
  IconPencil,
  IconPlus,
  IconReceipt,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { formatBAM, formatDate } from "src/lib/format";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { getOrganization, getWorkers, type Worker } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { getOsnovica, REZIM_LABELS } from "src/utils/obrtniciFbih";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { WorkerModal } from "src/sections/zaposlenici/WorkerModal";
import { UvozRadnikaModal } from "src/sections/zaposlenici/UvozRadnikaModal";
import { napraviIzvjestajCsv } from "src/sections/zaposlenici/radniciCsv";
import {
  WorkersTable,
  nedostajePodaci,
} from "src/sections/zaposlenici/WorkersTable";
import { DeleteWorkerModal } from "src/sections/zaposlenici/DeleteWorkerModal";
import { RadnikKartonModal } from "src/sections/zaposlenici/RadnikKartonModal";
import EvidencijaModal from "src/sections/organizacije/EvidencijaModal";
import { datumHr, downloadTablePdf } from "src/sections/lager/robaPdf";
// Kadrovski dokumenti (ugovor, otkaz, rješenja) se generišu na marketing
// strani: generatori već podržavaju ?org= i ?worker= predizbor, pa ih
// otvaramo predpopunjene u novoj kartici (app ostaje otvoren).
import { MARKETING_URL } from "src/lib/pkOfficeUrl";

const PRO_WORKERS_LIMIT = 5;
const USER_WORKERS_LIMIT = 1;

function salaryLabel(w: Worker): string {
  if (w.salaryType === "BRUTO" && w.salaryBruto != null) {
    return `${formatBAM(Number(w.salaryBruto))} bruto`;
  }
  if (w.salaryNeto != null) {
    return `${formatBAM(Number(w.salaryNeto))} neto`;
  }
  return "plata nije unesena";
}

// "1 prijavljen radnik", "3 prijavljena radnika", "5 prijavljenih radnika"
function prijavljenihLabel(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} prijavljen radnik`;
  if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) {
    return `${n} prijavljena radnika`;
  }
  return `${n} prijavljenih radnika`;
}

type StatusTab = "prijavljeni" | "odjavljeni" | "svi";

type SortId =
  | "prezime"
  | "prezime-d"
  | "prijava-d"
  | "prijava-a"
  | "plata-d"
  | "plata-a";

const SORT_OPTIONS: { value: SortId; label: string }[] = [
  { value: "prezime", label: "Po prezimenu (A-Z)" },
  { value: "prezime-d", label: "Po prezimenu (Z-A)" },
  { value: "prijava-d", label: "Datum prijave (najnoviji prvo)" },
  { value: "prijava-a", label: "Datum prijave (najstariji prvo)" },
  { value: "plata-d", label: "Po plati (veća prvo)" },
  { value: "plata-a", label: "Po plati (manja prvo)" },
];

function plataZaSort(w: Worker): number {
  if (w.salaryNeto != null) return Number(w.salaryNeto);
  if (w.salaryBruto != null) return Number(w.salaryBruto);
  return -1;
}

function usporedi(a: Worker, b: Worker, sort: SortId): number {
  switch (sort) {
    case "prezime":
      return a.lastName.localeCompare(b.lastName, "bs");
    case "prezime-d":
      return b.lastName.localeCompare(a.lastName, "bs");
    case "prijava-d":
      return (b.prijavaDate ?? "0000").localeCompare(a.prijavaDate ?? "0000");
    case "prijava-a":
      return (a.prijavaDate ?? "9999").localeCompare(b.prijavaDate ?? "9999");
    case "plata-d":
      return plataZaSort(b) - plataZaSort(a);
    case "plata-a":
      return plataZaSort(a) - plataZaSort(b);
  }
}

export default function ZaposleniciPage() {
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const { data: workers, isLoading } = useQuery({
    queryKey: ["pk-workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId as number)),
    enabled: orgId != null,
  });
  // puna organizacija zbog režima oporezivanja (osnovica vlasnika) i prava
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  // modal: null = zatvoreno; { worker: null } = novi radnik
  const [modal, setModal] = useState<{ worker: Worker | null } | null>(null);
  const [uvozOpen, setUvozOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null);
  const [kartonWorker, setKartonWorker] = useState<Worker | null>(null);
  const [evidencijaWorker, setEvidencijaWorker] = useState<Worker | null>(
    null,
  );

  const [statusTab, setStatusTab] = useState<StatusTab>("prijavljeni");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortId>("prezime");

  const canEdit =
    fullOrg == null ||
    fullOrg.memberRole === "OWNER" ||
    fullOrg.memberRole === "ADMIN";
  const tier = fullOrg?.effectiveTier ?? null;
  const count = workers?.length ?? 0;
  const limitReached =
    (tier === "PRO" && count >= PRO_WORKERS_LIMIT) ||
    (tier === "USER" && count >= USER_WORKERS_LIMIT);

  // vlasnik obrta nema platu: osnovica za doprinose, režim u tooltipu
  // (kratko, da tabela ne dobije horizontalni scroll)
  function vlasnikOsnovicaText(): string {
    const rezim = fullOrg?.taxRegime ?? null;
    if (!rezim) return "osnovica: režim nije postavljen";
    try {
      const osnovica = getOsnovica(
        new Date().getFullYear(),
        rezim,
        fullOrg?.taxCategory ?? undefined,
      );
      return `osnovica ${formatBAM(osnovica)}`;
    } catch {
      return "osnovica po režimu";
    }
  }

  function vlasnikLabel(): React.ReactNode {
    const rezim = fullOrg?.taxRegime ?? null;
    const text = vlasnikOsnovicaText();
    return rezim ? <span title={REZIM_LABELS[rezim]}>{text}</span> : text;
  }

  const brojevi = useMemo(() => {
    const all = workers ?? [];
    return {
      prijavljeni: all.filter((w) => w.employmentStatus === "PRIJAVLJEN")
        .length,
      odjavljeni: all.filter((w) => w.employmentStatus === "ODJAVLJEN")
        .length,
      svi: all.length,
    };
  }, [workers]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...(workers ?? [])]
      .filter((w) => {
        if (
          statusTab === "prijavljeni" &&
          w.employmentStatus !== "PRIJAVLJEN"
        ) {
          return false;
        }
        if (
          statusTab === "odjavljeni" &&
          w.employmentStatus !== "ODJAVLJEN"
        ) {
          return false;
        }
        if (!q) return true;
        const ime = `${w.firstName} ${w.lastName}`.toLowerCase();
        return (
          ime.includes(q) ||
          (w.jmbg ?? "").includes(q) ||
          (w.position ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // vlasnik uvijek prvi, ostalo po izabranom sortiranju
        if (a.role !== b.role) return a.role === "VLASNIK" ? -1 : 1;
        return usporedi(a, b, sort);
      });
  }, [workers, statusTab, search, sort]);

  const activeCount = (workers ?? []).filter(
    (w) => w.employmentStatus === "PRIJAVLJEN" && w.role === "RADNIK",
  ).length;

  function pdfPlata(w: Worker): string {
    return w.role === "VLASNIK" ? vlasnikOsnovicaText() : salaryLabel(w);
  }

  function statusText(w: Worker): string {
    if (w.employmentStatus === "PRIJAVLJEN") return "prijavljen";
    if (w.employmentStatus === "ODJAVLJEN") return "odjavljen";
    return "u izradi";
  }

  const [pdfBusy, setPdfBusy] = useState(false);

  const TAB_LABELS: Record<StatusTab, string> = {
    prijavljeni: "Prijavljeni",
    odjavljeni: "Odjavljeni",
    svi: "Svi",
  };

  async function preuzmiPdf() {
    if (!fullOrg || pdfBusy || rows.length === 0) return;
    setPdfBusy(true);
    try {
      const danas = new Date().toISOString().slice(0, 10);
      const info = [`Prikaz: ${TAB_LABELS[statusTab]}`];
      if (search.trim()) info.push(`Pretraga: "${search.trim()}"`);
      await downloadTablePdf({
        fileName: `Spisak-radnika-${danas}.pdf`,
        org: fullOrg,
        title: "SPISAK RADNIKA",
        subtitle: `na dan ${datumHr(danas)} godine`,
        info,
        sections: [
          {
            cols: [
              { label: "R.B.", w: 24 },
              { label: "IME I PREZIME", w: 110 },
              { label: "RADNO MJESTO", w: 90 },
              { label: "JMBG", w: 70 },
              { label: "PRIJAVA", w: 50 },
              { label: "ODJAVA", w: 50 },
              { label: "STATUS", w: 48 },
              { label: "PLATA", w: 78, right: true },
            ],
            rows: rows.map((w, i) => [
              `${i + 1}.`,
              `${w.firstName} ${w.lastName}`,
              w.role === "VLASNIK" ? "vlasnik" : (w.position ?? ""),
              w.jmbg ?? "",
              w.prijavaDate ? formatDate(w.prijavaDate) : "",
              w.odjavaDate ? formatDate(w.odjavaDate) : "",
              statusText(w),
              pdfPlata(w),
            ]),
            totals: [
              "",
              `Ukupno ${rows.length}`,
              "",
              "",
              "",
              "",
              "",
              "",
            ],
          },
        ],
      });
    } finally {
      setPdfBusy(false);
    }
  }

  function izvozCsv() {
    if (rows.length === 0) return;
    // Dijeljeni helper: isti CSV i na marketing strani (/aktivni-radnici).
    const csv = napraviIzvjestajCsv(rows, pdfPlata, statusText);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Spisak-radnika-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="relative flex flex-wrap items-end justify-between gap-3 mb-6">
        <HelpButton slug="zaposlenici" className="absolute top-0 right-0" />
        <div>
          <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
            <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
            Zaposlenici
          </div>
          <h1 className="font-serif-display text-[28px] leading-tight text-text-primary mb-[5px]">
            Zaposlenici.
          </h1>
          <p className="text-[13px] leading-6 text-text-tertiary max-w-[520px]">
            Radnici i vlasnik obrta: pregled, dodavanje i uređivanje.
            {activeCount > 0
              ? ` Trenutno ${prijavljenihLabel(activeCount)}.`
              : ""}
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            disabled={limitReached}
            onClick={() => setModal({ worker: null })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <IconPlus size={16} />
            Dodaj radnika
          </button>
        )}
      </div>

      {limitReached && (
        <p className="text-[12.5px] text-warning mb-3">
          {tier === "USER"
            ? "Besplatan preview: 1 radnik. Pretplatite se za neograničeno radnika."
            : `PRO plan: maksimalno ${PRO_WORKERS_LIMIT} radnika po organizaciji.`}
        </p>
      )}

      {/* Filteri i izvoz */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100">
          {(
            [
              ["prijavljeni", `Prijavljeni (${brojevi.prijavljeni})`],
              ["odjavljeni", `Odjavljeni (${brojevi.odjavljeni})`],
              ["svi", `Svi (${brojevi.svi})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusTab(id)}
              className={[
                "px-3.5 py-1.5 text-[12.5px] font-medium rounded-full transition-colors whitespace-nowrap",
                statusTab === id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-cream-200",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ime, JMBG ili radno mjesto"
          className="w-[220px] rounded-lg border border-cream-300 bg-cream-100 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600"
        />
        <PkSelect
          ariaLabel="Sortiranje"
          value={sort}
          onChange={(v) => setSort(v as SortId)}
          options={SORT_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={izvozCsv}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
            title="Izvoz prikazanih radnika u CSV za Excel"
          >
            <IconDownload size={15} />
            Izvoz (CSV)
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => setUvozOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
              title="Uvoz novih radnika iz CSV fajla (šablon se preuzima u prozoru)"
            >
              <IconUpload size={15} />
              Uvoz (CSV)
            </button>
          )}
          <button
            type="button"
            onClick={preuzmiPdf}
            disabled={pdfBusy || rows.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
            title="PDF spisak prikazanih radnika (prati filtere)"
          >
            <IconDownload size={15} />
            Spisak (PDF)
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl bg-cream-100 border border-cream-300 overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
            Učitavanje...
          </div>
        ) : (workers ?? []).length === 0 ? (
          <div className="px-4 py-12 text-center">
            <span className="w-12 h-12 rounded-full bg-cream-200 text-text-tertiary inline-flex items-center justify-center mb-3">
              <IconInbox size={22} />
            </span>
            <p className="text-[14px] font-medium text-text-primary">
              Još nema unesenih radnika
            </p>
            <p className="text-[12.5px] text-text-tertiary mt-1 max-w-[380px] mx-auto">
              Dodajte vlasnika i radnike kroz &quot;Dodaj radnika&quot; pa će se
              pojaviti ovdje, zajedno sa obračunima plata.
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-text-tertiary">
            Nema radnika za izabrani filter.
          </div>
        ) : (
          <WorkersTable
            workers={rows}
            plataCell={(w) =>
              w.role === "VLASNIK" ? vlasnikLabel() : salaryLabel(w)
            }
            warningFor={nedostajePodaci}
            onRowClick={canEdit ? (w) => setModal({ worker: w }) : undefined}
            actionsFor={
              canEdit
                ? (w) => ({
                    primary: [
                      {
                        key: "uredi",
                        label: "Uredi",
                        icon: <IconPencil size={14} />,
                        onClick: () => setModal({ worker: w }),
                      },
                    ],
                    // Vlasnik se ne briše (organizacija ne postoji bez njega)
                    // i nema kadrovske dokumente (nije radnik po ugovoru);
                    // karton obračuna ima (doprinosi vlasnika).
                    menu:
                      w.role === "VLASNIK"
                        ? [
                            {
                              kind: "item",
                              key: "karton",
                              label: "Karton obračuna",
                              sub: "doprinosi po mjesecima",
                              icon: <IconReceipt size={14} />,
                              onClick: () => setKartonWorker(w),
                            },
                          ]
                        : [
                            {
                              kind: "group",
                              key: "pregled",
                              label: "Pregled",
                            },
                            {
                              kind: "item",
                              key: "karton",
                              label: "Karton radnika",
                              sub: "obračuni po mjesecima",
                              icon: <IconReceipt size={14} />,
                              onClick: () => setKartonWorker(w),
                            },
                            {
                              kind: "group",
                              key: "dokumenti",
                              label: "Kadrovski dokumenti",
                            },
                            {
                              kind: "item",
                              key: "ugovor",
                              label: "Ugovor o radu",
                              sub: "predpopunjen, nova kartica",
                              icon: <IconFileText size={14} />,
                              onClick: () =>
                                window.open(
                                  `${MARKETING_URL}/ugovor-o-radu?org=${orgId}&worker=${w.id}`,
                                  "_blank",
                                  "noopener",
                                ),
                            },
                            {
                              kind: "item",
                              key: "otkaz",
                              label: "Otkaz ugovora",
                              sub: "odluka o prestanku radnog odnosa",
                              icon: <IconFileX size={14} />,
                              onClick: () =>
                                window.open(
                                  `${MARKETING_URL}/ugovor-o-radu?tab=otkaz&org=${orgId}&worker=${w.id}`,
                                  "_blank",
                                  "noopener",
                                ),
                            },
                            {
                              kind: "item",
                              key: "rjesenja",
                              label: "Rješenja i odluke",
                              sub: "godišnji, odsustva, regres...",
                              icon: <IconClipboardText size={14} />,
                              onClick: () =>
                                window.open(
                                  `${MARKETING_URL}/rjesenja-i-odluke?org=${orgId}&worker=${w.id}`,
                                  "_blank",
                                  "noopener",
                                ),
                            },
                            {
                              kind: "item",
                              key: "evidencija",
                              label: "Matična evidencija",
                              sub: "Sl. nov. FBiH 92/16, PDF",
                              icon: <IconId size={14} />,
                              onClick: () => setEvidencijaWorker(w),
                            },
                            { kind: "group", key: "ostalo", label: "Ostalo" },
                            {
                              kind: "item",
                              key: "obrisi",
                              label: "Obriši radnika",
                              sub: "trajno, uz potvrdu",
                              icon: <IconTrash size={14} />,
                              onClick: () => setDeleteTarget(w),
                            },
                          ],
                  })
                : undefined
            }
          />
        )}
      </div>

      {/* Modal za dodavanje / uređivanje (keyed remount po radniku) */}
      {orgId != null && modal != null && (
        <WorkerModal
          key={modal.worker?.id ?? "new"}
          orgId={orgId}
          orgType={fullOrg?.type ?? activeOrg?.type ?? null}
          worker={modal.worker}
          onClose={() => setModal(null)}
        />
      )}

      {/* Uvoz radnika iz CSV fajla */}
      {uvozOpen && orgId != null && (
        <UvozRadnikaModal
          orgId={orgId}
          postojeci={workers ?? []}
          onClose={() => setUvozOpen(false)}
        />
      )}

      {/* Potvrda brisanja */}
      {orgId != null && (
        <DeleteWorkerModal
          orgId={orgId}
          worker={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* Karton radnika: obračuni po mjesecima */}
      {orgId != null && kartonWorker != null && (
        <RadnikKartonModal
          orgId={orgId}
          worker={kartonWorker}
          onClose={() => setKartonWorker(null)}
        />
      )}

      {/* Matična evidencija (isti modal kao na marketing strani) */}
      {orgId != null && evidencijaWorker != null && (
        <EvidencijaModal
          orgId={orgId}
          orgName={fullOrg?.name ?? activeOrg?.name ?? ""}
          orgType={fullOrg?.type === "COMPANY" ? "COMPANY" : "BUSINESS"}
          initialWorkerId={evidencijaWorker.id}
          lockWorkerName={`${evidencijaWorker.firstName} ${evidencijaWorker.lastName}`}
          onClose={() => setEvidencijaWorker(null)}
        />
      )}
    </div>
  );
}
