"use client";

// Dijeljena tabela radnika u PK Office stilu. Koriste je /app/zaposlenici i
// marketing stranice (organizacija, aktivni radnici) unutar .pk-scope
// kontejnera (vidi src/styles/pk-embed.css). Akcije po redu idu kroz
// RowActionsMenu (vidljive primarne + kebab meni), po PK standardu.
import type { ReactNode } from "react";
import { IconCrown } from "@tabler/icons-react";
import RowActionsMenu, {
  type RowMenuItem,
  type RowPrimaryAction,
} from "src/components/RowActionsMenu/RowActionsMenu";
import { formatDate } from "src/lib/format";
import type { Worker } from "src/api/profile";

// Boje kao na live verziji: prijavljen zeleno, odjavljen crveno, caps.
export function WorkerStatusBadge({
  status,
}: {
  status: Worker["employmentStatus"];
}) {
  if (status === "PRIJAVLJEN") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-success-bg text-success shrink-0">
        prijavljen
      </span>
    );
  }
  if (status === "ODJAVLJEN") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-danger-bg text-danger shrink-0">
        odjavljen
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-warning-bg text-warning shrink-0">
      draft
    </span>
  );
}

function initials(w: Worker) {
  return `${w.firstName[0] ?? ""}${w.lastName[0] ?? ""}`.toUpperCase();
}

export type WorkerRowActions = {
  primary: RowPrimaryAction[];
  menu: RowMenuItem[];
};

export function WorkersTable({
  workers,
  plataCell,
  actionsFor,
  onRowClick,
}: {
  workers: Worker[];
  /** Sadržaj kolone Plata (app: osnovica vlasnika / neto; marketing isto). */
  plataCell: (w: Worker) => ReactNode;
  /** Akcije po redu; null/undefined = bez kolone akcija (read-only). */
  actionsFor?: (w: Worker) => WorkerRowActions | null;
  /** Klik na red (obično otvara uređivanje). */
  onRowClick?: (w: Worker) => void;
}) {
  const hasActions = !!actionsFor;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-cream-300 text-left text-[11px] uppercase tracking-wider text-text-tertiary">
            <th className="px-4 py-2.5 font-semibold">Ime i prezime</th>
            <th className="px-3 py-2.5 font-semibold">JMBG</th>
            <th className="px-3 py-2.5 font-semibold">Period</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
            <th className="px-3 py-2.5 font-semibold text-right">Plata</th>
            {hasActions && <th className="px-4 py-2.5"></th>}
          </tr>
        </thead>
        <tbody>
          {workers.map((w) => {
            const actions = actionsFor?.(w) ?? null;
            return (
              <tr
                key={w.id}
                onClick={onRowClick ? () => onRowClick(w) : undefined}
                className={[
                  "border-b border-cream-300/70 last:border-0",
                  onRowClick ? "cursor-pointer hover:bg-cream-50" : "",
                ].join(" ")}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <span
                      className={[
                        "w-9 h-9 rounded-full inline-flex items-center justify-center text-[12.5px] font-semibold shrink-0",
                        w.role === "VLASNIK"
                          ? "bg-brand-600 text-white"
                          : "bg-brand-100 text-brand-700",
                      ].join(" ")}
                    >
                      {initials(w)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-medium text-text-primary whitespace-nowrap">
                          {w.firstName} {w.lastName}
                        </span>
                        {w.role === "VLASNIK" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-brand-100 text-brand-700 shrink-0">
                            <IconCrown size={11} /> vlasnik
                          </span>
                        )}
                      </div>
                      <div className="text-[11.5px] text-text-tertiary truncate max-w-[260px]">
                        {[w.position, w.city].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-[12px] text-text-secondary whitespace-nowrap">
                  {w.jmbg || "–"}
                </td>
                <td className="px-3 py-3 text-text-secondary whitespace-nowrap">
                  {/* Prijava i odjava u jednoj koloni da tabela stane bez
                      horizontalnog scrola na užim karticama (organizacija) */}
                  {w.prijavaDate ? (
                    <>
                      <div>od {formatDate(w.prijavaDate)}</div>
                      {w.odjavaDate && <div>do {formatDate(w.odjavaDate)}</div>}
                    </>
                  ) : (
                    "–"
                  )}
                </td>
                <td className="px-3 py-3">
                  <WorkerStatusBadge status={w.employmentStatus} />
                </td>
                <td className="px-3 py-3 text-right text-text-primary font-medium tabular-nums whitespace-nowrap">
                  {plataCell(w)}
                </td>
                {hasActions && (
                  <td
                    className="px-4 py-3 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {actions && (
                      <RowActionsMenu
                        primaryActions={actions.primary}
                        menuItems={actions.menu}
                      />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
