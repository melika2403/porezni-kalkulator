"use client";

import { useQuery } from "@tanstack/react-query";
import {
  IconUsers,
  IconExternalLink,
  IconInbox,
  IconCrown,
} from "@tabler/icons-react";
import { formatBAM, formatDate } from "src/lib/format";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { getOrganization, getWorkers, type Worker } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { getOsnovica, REZIM_LABELS } from "src/utils/obrtniciFbih";

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000";

function initials(w: Worker) {
  return `${w.firstName[0] ?? ""}${w.lastName[0] ?? ""}`.toUpperCase();
}

function salaryLabel(w: Worker): string {
  if (w.salaryType === "BRUTO" && w.salaryBruto != null) {
    return `${formatBAM(Number(w.salaryBruto))} bruto`;
  }
  if (w.salaryNeto != null) {
    return `${formatBAM(Number(w.salaryNeto))} neto`;
  }
  return "plata nije unesena";
}

function StatusBadge({ status }: { status: Worker["employmentStatus"] }) {
  if (status === "PRIJAVLJEN") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-success-bg text-success shrink-0">
        prijavljen
      </span>
    );
  }
  if (status === "ODJAVLJEN") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-cream-200 text-text-secondary shrink-0">
        odjavljen
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-warning-bg text-warning shrink-0">
      nacrt
    </span>
  );
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
  // puna organizacija zbog režima oporezivanja (osnovica vlasnika)
  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  // vlasnik nema platu: prikazuje se osnovica za doprinose + režim
  function vlasnikLabel(): string {
    const rezim = fullOrg?.taxRegime ?? null;
    if (!rezim) return "osnovica: režim nije postavljen";
    try {
      const osnovica = getOsnovica(
        new Date().getFullYear(),
        rezim,
        fullOrg?.taxCategory ?? undefined,
      );
      return `osnovica ${formatBAM(osnovica)} · ${REZIM_LABELS[rezim]}`;
    } catch {
      return `osnovica po režimu: ${REZIM_LABELS[rezim]}`;
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
            Radnici i vlasnik obrta, povezano sa Poreznim Kalkulatorom.
            {activeCount > 0 ? ` Trenutno ${activeCount} prijavljenih radnika.` : ""}
          </p>
        </div>
        <a
          href={`${MARKETING_URL}/aktivni-radnici${orgId ? `?org=${orgId}` : ""}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
        >
          <IconExternalLink size={16} />
          Dodaj / uredi radnike
        </a>
      </div>

      {/* Lista */}
      <div className="rounded-xl bg-cream-100 border border-cream-300">
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
              Dodajte vlasnika i radnike kroz "Dodaj / uredi radnike" pa će se
              pojaviti ovdje, zajedno sa obračunima plata.
            </p>
          </div>
        ) : (
          <ul>
            {rows.map((w, i) => (
              <li
                key={w.id}
                className={[
                  "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-[13px]",
                  i < rows.length - 1 ? "border-b border-cream-300/70" : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "w-10 h-10 rounded-full inline-flex items-center justify-center text-[13px] font-semibold shrink-0",
                    w.role === "VLASNIK"
                      ? "bg-brand-600 text-white"
                      : "bg-brand-100 text-brand-700",
                  ].join(" ")}
                >
                  {initials(w)}
                </span>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-medium text-text-primary">
                      {w.firstName} {w.lastName}
                    </span>
                    {w.role === "VLASNIK" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-brand-100 text-brand-700 shrink-0">
                        <IconCrown size={11} /> vlasnik
                      </span>
                    )}
                    <StatusBadge status={w.employmentStatus} />
                  </div>
                  <div className="text-[11.5px] text-text-tertiary mt-0.5 truncate">
                    {[
                      w.position,
                      w.startDate ? `od ${formatDate(w.startDate)}` : null,
                      w.endDate ? `do ${formatDate(w.endDate)}` : null,
                      w.city,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <span className="text-[13px] font-medium tabular-nums text-text-primary whitespace-nowrap">
                  {w.role === "VLASNIK" ? vlasnikLabel() : salaryLabel(w)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[12px] text-text-tertiary mt-3 flex items-center gap-1.5">
        <IconUsers size={13} />
        Dodavanje, izmjene i prijave/odjave radnika rade se na Poreznom
        Kalkulatoru; ovdje se sve odmah vidi.
      </p>
    </div>
  );
}
