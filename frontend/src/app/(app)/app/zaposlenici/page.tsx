"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconClipboardText,
  IconFileText,
  IconFileX,
  IconInbox,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { formatBAM } from "src/lib/format";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { getOrganization, getWorkers, type Worker } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { getOsnovica, REZIM_LABELS } from "src/utils/obrtniciFbih";
import { WorkerModal } from "src/sections/zaposlenici/WorkerModal";
import { WorkersTable } from "src/sections/zaposlenici/WorkersTable";
import { DeleteWorkerModal } from "src/sections/zaposlenici/DeleteWorkerModal";

const PRO_WORKERS_LIMIT = 5;
const USER_WORKERS_LIMIT = 1;

// Kadrovski dokumenti (ugovor, otkaz, rješenja) se generišu na marketing
// strani: generatori već podržavaju ?org= i ?worker= predizbor, pa ih
// otvaramo predpopunjene u novoj kartici (app ostaje otvoren).
const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000";

function salaryLabel(w: Worker): string {
  if (w.salaryType === "BRUTO" && w.salaryBruto != null) {
    return `${formatBAM(Number(w.salaryBruto))} bruto`;
  }
  if (w.salaryNeto != null) {
    return `${formatBAM(Number(w.salaryNeto))} neto`;
  }
  return "plata nije unesena";
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
  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null);

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
  function vlasnikLabel(): React.ReactNode {
    const rezim = fullOrg?.taxRegime ?? null;
    if (!rezim) return "osnovica: režim nije postavljen";
    try {
      const osnovica = getOsnovica(
        new Date().getFullYear(),
        rezim,
        fullOrg?.taxCategory ?? undefined,
      );
      return (
        <span title={REZIM_LABELS[rezim]}>osnovica {formatBAM(osnovica)}</span>
      );
    } catch {
      return <span title={REZIM_LABELS[rezim]}>osnovica po režimu</span>;
    }
  }

  const rows = [...(workers ?? [])].sort((a, b) => {
    // vlasnik prvi, pa aktivni, pa po prezimenu
    if (a.role !== b.role) return a.role === "VLASNIK" ? -1 : 1;
    const aActive = a.employmentStatus === "PRIJAVLJEN" ? 0 : 1;
    const bActive = b.employmentStatus === "PRIJAVLJEN" ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    return a.lastName.localeCompare(b.lastName);
  });
  const activeCount = rows.filter(
    (w) => w.employmentStatus === "PRIJAVLJEN" && w.role === "RADNIK",
  ).length;

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
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
            {activeCount > 0 ? ` Trenutno ${activeCount} prijavljenih radnika.` : ""}
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

      {/* Tabela */}
      <div className="rounded-xl bg-cream-100 border border-cream-300 overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
            Učitavanje...
          </div>
        ) : rows.length === 0 ? (
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
        ) : (
          <WorkersTable
            workers={rows}
            plataCell={(w) =>
              w.role === "VLASNIK" ? vlasnikLabel() : salaryLabel(w)
            }
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
                    // i nema kadrovske dokumente (nije radnik po ugovoru).
                    menu:
                      w.role === "VLASNIK"
                        ? []
                        : [
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

      {/* Potvrda brisanja */}
      {orgId != null && (
        <DeleteWorkerModal
          orgId={orgId}
          worker={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
