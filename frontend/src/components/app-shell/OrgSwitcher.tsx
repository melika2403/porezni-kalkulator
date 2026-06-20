"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconSelector,
  IconCheck,
  IconPlus,
  IconBuildingStore,
} from "@tabler/icons-react";
import {
  usePkOfficeMe,
  useActivateOrganization,
} from "src/hooks/usePkOfficeMe";
import type { OrganizationSummary } from "src/api/pkOffice";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Vlasnik",
  ADMIN: "Admin",
  MEMBER: "Član",
};

export function OrgSwitcher() {
  const { data, isLoading } = usePkOfficeMe();
  const activate = useActivateOrganization();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const orgs = data?.organizations ?? [];
  const active: OrganizationSummary | null =
    data?.activeOrganization ?? orgs[0] ?? null;

  const mine = orgs.filter((o) => !o.isClientOrg);
  const clients = orgs.filter((o) => o.isClientOrg);
  // Grupne labele imaju smisla tek kad postoje obje grupe.
  const showGroups = mine.length > 0 && clients.length > 0;

  function selectOrg(id: number) {
    if (id === active?.id) {
      setOpen(false);
      return;
    }
    activate.mutate(id, {
      onSettled: () => setOpen(false),
    });
  }

  function renderOrg(o: OrganizationSummary) {
    const isActive = active?.id === o.id;
    return (
      <li key={o.id}>
        <button
          type="button"
          onClick={() => selectOrg(o.id)}
          className={[
            "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-left transition-colors",
            isActive ? "bg-brand-100" : "hover:bg-cream-200",
          ].join(" ")}
        >
          <span className="w-9 h-9 rounded-lg bg-brand-700 text-white flex items-center justify-center text-[12px] font-semibold shrink-0">
            {initials(o.name)}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] leading-[1.2] truncate text-text-primary font-medium">
              {o.name}
            </span>
            <span className="block text-[11.5px] leading-4 text-text-tertiary truncate mt-0.5">
              {o.taxNumber || "–"} · {ROLE_LABEL[o.role] || o.role}
            </span>
          </span>
          {isActive && (
            <IconCheck size={16} className="text-brand-600 shrink-0" />
          )}
        </button>
      </li>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          "w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors",
          open
            ? "bg-cream-100 border-brand-600"
            : "bg-cream-50 border-cream-300 hover:border-brand-400 hover:bg-cream-100",
        ].join(" ")}
      >
        <span className="w-9 h-9 rounded-[10px] bg-brand-600 text-white flex items-center justify-center text-[13px] font-semibold shrink-0">
          {active ? initials(active.name) : <IconBuildingStore size={20} />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[11px] uppercase tracking-[0.1em] text-text-tertiary leading-none mb-[6px] whitespace-nowrap">
            Organizacija
          </span>
          <span
            title={active?.name}
            className="block text-[14px] leading-[1.2] font-medium text-text-primary line-clamp-2"
          >
            {isLoading
              ? "Učitavanje..."
              : active
                ? active.name
                : "Bez organizacije"}
          </span>
        </span>
        <IconSelector size={19} className="text-text-tertiary shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2.5 z-30 rounded-xl border border-cream-300 bg-cream-100 shadow-[0_12px_34px_-10px_rgba(15,26,18,0.24)] overflow-hidden p-2">
          <ul className="max-h-80 overflow-y-auto flex flex-col gap-1">
            {orgs.length === 0 && (
              <li className="px-3 py-3 text-[12.5px] text-text-tertiary">
                Nemate nijedan obrt. Kreirajte ga u Postavkama.
              </li>
            )}
            {showGroups && (
              <li className="px-2.5 pt-1.5 pb-0.5 text-[10.5px] font-medium uppercase tracking-[0.13em] text-text-tertiary">
                Moji obrti
              </li>
            )}
            {mine.map(renderOrg)}
            {showGroups && (
              <li className="px-2.5 pt-2.5 pb-0.5 mt-1 border-t border-cream-300 text-[10.5px] font-medium uppercase tracking-[0.13em] text-text-tertiary">
                Klijenti
              </li>
            )}
            {clients.map(renderOrg)}
          </ul>
          <Link
            href="/app/postavke?tab=nova-organizacija"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 mt-1.5 px-3 py-3 rounded-lg border-t border-cream-300 text-[13px] font-medium text-brand-700 hover:bg-cream-200 transition-colors"
          >
            <IconPlus size={17} />
            Dodaj novi obrt
          </Link>
        </div>
      )}
    </div>
  );
}
