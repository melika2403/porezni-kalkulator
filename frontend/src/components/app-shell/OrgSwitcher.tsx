"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconSelector,
  IconCheck,
  IconPlus,
  IconBuildingStore,
  IconSearch,
} from "@tabler/icons-react";
import {
  usePkOfficeMe,
  useActivateOrganization,
  usePkOfficePristup,
  usePkOfficeSlot,
} from "src/hooks/usePkOfficeMe";
import type { OrganizationSummary } from "src/api/pkOffice";
import { orgInitials } from "src/lib/format";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Vlasnik",
  ADMIN: "Admin",
  MEMBER: "Član",
  VIEWER: "Uvid",
};

// pretraga bez dijakritika: "cevap" nađe "Ćevabdžinicu"
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

export function OrgSwitcher() {
  const { data, isLoading } = usePkOfficeMe();
  const activate = useActivateOrganization();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  // Office paketi: kad je naplata uključena, u switcheru se nude samo obrti
  // AKTIVIRANI u PK Office. Upravljanje slotovima (brojač + "Dodaj u PK
  // Office") ima samo nosilac pretplate (slotovi != null); naslijeđen
  // pristup (npr. knjigovođa u agenciji) vidi samo svoje aktivirane obrte.
  const { data: pristup } = usePkOfficePristup();
  const slotMode = Boolean(pristup?.enforced && pristup?.hasOffice);
  const upravljaSlotovima = slotMode && pristup?.slotovi != null;
  // pristup.organizations su SAMO obrti kojima korisnik upravlja (OWNER/ADMIN),
  // dok `orgs` (meWithOrgs) uključuje i one gdje je samo MEMBER. Klasifikacija
  // mora ići po upravljivima: inače bi MEMBER obrt završio pod "Dodaj u PK
  // Office" sa dugmetom Aktiviraj koje uvijek pukne (backend traži OWNER/ADMIN).
  const upravljiveIds = new Set(
    (pristup?.organizations ?? []).map((o) => o.id),
  );
  const enabledIds = new Set(
    (pristup?.organizations ?? [])
      .filter((o) => o.pkOfficeEnabled)
      .map((o) => o.id),
  );
  const vidljive = slotMode ? orgs.filter((o) => enabledIds.has(o.id)) : orgs;
  const neaktivirane = upravljaSlotovima
    ? orgs.filter((o) => upravljiveIds.has(o.id) && !enabledIds.has(o.id))
    : [];
  const { aktiviraj } = usePkOfficeSlot();
  const [slotError, setSlotError] = useState<string | null>(null);

  // pretraga po nazivu (bez dijakritika) i ID/poreskom broju; filtrira i
  // "Dodaj u PK Office" sekciju da agencija nađe obrt i prije aktivacije
  const nq = norm(q.trim());
  const pogodak = (o: OrganizationSummary) => {
    if (!nq) return true;
    if (norm(o.name).includes(nq)) return true;
    const digits = nq.replace(/\D+/g, "");
    return (
      digits.length > 0 &&
      String(o.taxNumber ?? "").replace(/\D+/g, "").includes(digits)
    );
  };
  const vidljiveFilt = vidljive.filter(pogodak);
  const neaktiviraneFilt = neaktivirane.filter(pogodak);
  // search se nudi tek kad lista stvarno naraste
  const showSearch = vidljive.length + neaktivirane.length > 5;

  const mine = vidljiveFilt.filter((o) => !o.isClientOrg);
  const clients = vidljiveFilt.filter((o) => o.isClientOrg);
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

  async function aktivirajPaOtvori(id: number) {
    setSlotError(null);
    try {
      await aktiviraj.mutateAsync(id);
      selectOrg(id);
    } catch (e) {
      setSlotError(
        e instanceof Error && e.message === "LIMIT_PAKETA"
          ? "Svi slotovi paketa su popunjeni. Deaktiviraj neki obrt na stranici Organizacije ili nadogradi paket."
          : "Greška pri aktivaciji, pokušaj ponovo.",
      );
    }
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
            {orgInitials(o.name)}
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
        onClick={() => {
          setQ(""); // svako otvaranje kreće sa praznom pretragom
          setOpen((o) => !o);
        }}
        className={[
          "w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-colors",
          open
            ? "bg-cream-100 border-brand-600"
            : "bg-cream-50 border-cream-300 hover:border-brand-400 hover:bg-cream-100",
        ].join(" ")}
      >
        <span className="w-9 h-9 rounded-[10px] bg-brand-600 text-white flex items-center justify-center text-[13px] font-semibold shrink-0">
          {active ? orgInitials(active.name) : <IconBuildingStore size={20} />}
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
          {upravljaSlotovima && pristup?.slotovi && (
            <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1 text-[11px] text-text-tertiary">
              <span className="uppercase tracking-[0.1em] font-medium">
                {pristup.planNaziv ?? "PK Office paket"}
              </span>
              <span className="tabular-nums">
                {pristup.slotovi.max != null
                  ? `slotovi ${pristup.slotovi.zauzeto}/${pristup.slotovi.max}`
                  : `${pristup.slotovi.zauzeto} aktivno`}
              </span>
            </div>
          )}
          {showSearch && (
            <div className="relative mb-1.5">
              <IconSearch
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
              />
              <input
                ref={searchRef}
                type="text"
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    if (q) setQ("");
                    else setOpen(false);
                  }
                  if (e.key === "Enter") {
                    // Enter bira prvi pogodak
                    const first = mine[0] ?? clients[0];
                    if (first) selectOrg(first.id);
                  }
                }}
                placeholder="Pretraži obrte..."
                aria-label="Pretraži obrte"
                className="w-full rounded-lg border border-cream-300 bg-cream-50 pl-8 pr-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-600 transition-colors"
              />
            </div>
          )}
          <ul className="max-h-80 overflow-y-auto flex flex-col gap-1">
            {orgs.length === 0 && (
              <li className="px-3 py-3 text-[12.5px] text-text-tertiary">
                Nemate nijedan obrt. Kreirajte ga u Postavkama.
              </li>
            )}
            {orgs.length > 0 && vidljive.length === 0 && (
              <li className="px-3 py-3 text-[12.5px] text-text-tertiary">
                Nijedan obrt još nije aktiviran u PK Office. Aktiviraj ispod.
              </li>
            )}
            {nq &&
              vidljive.length > 0 &&
              vidljiveFilt.length === 0 &&
              neaktiviraneFilt.length === 0 && (
                <li className="px-3 py-3 text-[12.5px] text-text-tertiary">
                  Nema obrta za ovu pretragu.
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
            {slotMode && neaktiviraneFilt.length > 0 && (
              <>
                <li className="px-2.5 pt-2.5 pb-0.5 mt-1 border-t border-cream-300 text-[10.5px] font-medium uppercase tracking-[0.13em] text-text-tertiary">
                  Dodaj u PK Office
                </li>
                {neaktiviraneFilt.map((o) => (
                  <li key={`slot-${o.id}`}>
                    <div className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg">
                      <span className="w-9 h-9 rounded-lg bg-cream-200 text-text-tertiary flex items-center justify-center text-[12px] font-semibold shrink-0">
                        {orgInitials(o.name)}
                      </span>
                      <span className="flex-1 min-w-0 text-[13px] text-text-secondary truncate">
                        {o.name}
                      </span>
                      <button
                        type="button"
                        disabled={aktiviraj.isPending}
                        onClick={() => aktivirajPaOtvori(o.id)}
                        className="px-2.5 py-1 rounded-lg border border-brand-600 text-brand-600 text-[11.5px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50 shrink-0"
                      >
                        Aktiviraj
                      </button>
                    </div>
                  </li>
                ))}
              </>
            )}
            {slotError && (
              <li className="px-2.5 py-1.5 text-[11.5px] text-accent-500">
                {slotError}
              </li>
            )}
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
