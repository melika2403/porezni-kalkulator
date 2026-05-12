"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconChevronDown,
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

  function selectOrg(id: number) {
    if (id === active?.id) {
      setOpen(false);
      return;
    }
    activate.mutate(id, {
      onSettled: () => setOpen(false),
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-cream-50 border border-cream-300 hover:bg-cream-200 hover:border-text-tertiary/40 transition-colors text-left"
      >
        <span className="w-11 h-11 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center text-[14px] font-semibold shrink-0">
          {active ? initials(active.name) : <IconBuildingStore size={20} />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] leading-[1.2] font-medium text-text-primary truncate">
            {isLoading
              ? "Učitavanje…"
              : active
                ? active.name
                : "Bez organizacije"}
          </span>
          <span className="block text-[12px] leading-4 text-text-tertiary truncate mt-1">
            JIB: {active?.taxNumber || "—"}
          </span>
        </span>
        <IconChevronDown
          size={16}
          className={`text-text-tertiary transition shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-1.5 z-30 rounded-lg border border-cream-300 bg-cream-100 shadow-[0_-8px_28px_-8px_rgba(15,26,18,0.16)] overflow-hidden">
          <ul className="max-h-72 overflow-y-auto py-1">
            {orgs.length === 0 && (
              <li className="px-3 py-2.5 text-[12px] text-text-tertiary">
                Nemate nijedan obrt. Kreirajte ga u Postavkama.
              </li>
            )}
            {orgs.map((o) => {
              const isActive = active?.id === o.id;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => selectOrg(o.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cream-200 text-left transition-colors"
                  >
                    <span className="w-9 h-9 rounded-md bg-brand-700 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                      {initials(o.name)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] leading-5 truncate text-text-primary">{o.name}</span>
                      <span className="block text-[11px] leading-4 text-text-tertiary truncate mt-0.5">
                        {o.taxNumber || "—"} ·{" "}
                        {ROLE_LABEL[o.role] || o.role}
                      </span>
                    </span>
                    {isActive && (
                      <IconCheck size={15} className="text-brand-600 shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <Link
            href="/app/postavke?tab=nova-organizacija"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 border-t border-cream-300 text-[12.5px] font-medium text-brand-700 hover:bg-cream-200 transition-colors"
          >
            <IconPlus size={15} />
            Dodaj novi obrt
          </Link>
        </div>
      )}
    </div>
  );
}
