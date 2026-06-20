"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconPlus,
  IconInbox,
  IconSparkles,
  IconTrash,
  IconBuildingStore,
  IconUserDollar,
  IconPencil,
  IconReceipt,
  IconSearch,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { formatBAM, formatDate } from "src/lib/format";
import { bankNameFromAccount, formatBankAccount } from "src/lib/bankCodes";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  useDeletePartner,
  usePartners,
  usePartnerSuggestions,
} from "src/hooks/usePartners";
import type { Partner } from "src/api/partners";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { UlazniRacunModal } from "src/sections/partneri/UlazniRacunModal";
import {
  PartnerFormModal,
  EMPTY_PARTNER_FORM,
  formFromPartner,
  formFromSuggestion,
  type PartnerFormState,
} from "src/sections/partneri/PartnerFormModal";

type TabId = "kupci" | "dobavljaci" | "svi" | "imenik";

const TABS: { id: TabId; label: string }[] = [
  { id: "kupci", label: "Kupci" },
  { id: "dobavljaci", label: "Dobavljači" },
  { id: "svi", label: "Svi aktivni" },
  { id: "imenik", label: "Imenik" },
];

// tip partnera se ne bira ručno nego izvodi iz poslovanja
function isKupac(p: Partner): boolean {
  return p.stats.totalIn > 0 || p.stats.openInvoicesCount > 0;
}
function isDobavljac(p: Partner): boolean {
  return p.stats.totalOut > 0 || p.stats.racuniCount > 0;
}
function isAktivan(p: Partner): boolean {
  return (
    p.stats.txCount > 0 ||
    p.stats.openInvoicesCount > 0 ||
    p.stats.racuniCount > 0
  );
}

// pretraga: mala/velika slova i kvačice se ignorišu
function looseText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

function TypeChips({ p }: { p: Partner }) {
  return (
    <span className="inline-flex gap-1">
      {isKupac(p) && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-success-bg text-success shrink-0">
          kupac
        </span>
      )}
      {isDobavljac(p) && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-info-bg text-info shrink-0">
          dobavljač
        </span>
      )}
      {p.pdvBroj && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-cream-200 text-text-secondary shrink-0">
          PDV obveznik
        </span>
      )}
    </span>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning" | "accent" | "muted";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "accent"
          ? "text-accent-500"
          : tone === "muted"
            ? "text-text-tertiary"
            : "text-text-primary";
  return (
    <div className="min-w-[105px] text-right">
      <div className="text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary">
        {label}
      </div>
      <div className={`text-[13.5px] font-semibold tabular-nums ${color}`}>
        {value}
      </div>
    </div>
  );
}

export default function PartneriPage() {
  const router = useRouter();
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const [tab, setTab] = useState<TabId>("svi");
  const [q, setQ] = useState("");
  const [formInitial, setFormInitial] = useState<PartnerFormState | null>(null);
  // globalno knjiženje ulaznog računa (izbor dobavljača u modalu)
  const [racunModalOpen, setRacunModalOpen] = useState(false);
  const [racunPreselect, setRacunPreselect] = useState<number | null>(null);
  // "+ Novi partner" iz knjiženja: po snimanju vrati na knjiženje
  const [returnToRacun, setReturnToRacun] = useState(false);

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const { data: partners, isLoading } = usePartners(orgId);
  const { data: suggestions } = usePartnerSuggestions(orgId);
  const deletePartner = useDeletePartner(orgId);

  const visible = useMemo(() => {
    const all = partners ?? [];
    let base = all;
    if (tab === "kupci") base = all.filter(isKupac);
    else if (tab === "dobavljaci") base = all.filter(isDobavljac);
    else if (tab === "svi") base = all.filter(isAktivan);

    const query = q.trim();
    if (!query) return base;
    const digits = query.replace(/\D+/g, "");
    const isNumeric = digits.length > 0 && /^[\d\s./-]+$/.test(query);
    if (isNumeric) {
      // šifra ima prioritet, pa JIB i žiro računi
      const byCode = base.filter(
        (p) =>
          p.code != null &&
          (String(p.code) === String(Number(digits)) ||
            String(p.code).padStart(4, "0").startsWith(digits)),
      );
      const rest = base.filter(
        (p) =>
          !byCode.includes(p) &&
          ((p.jib ?? "").includes(digits) ||
            p.accounts.some((a) => a.includes(digits))),
      );
      return [...byCode, ...rest];
    }
    const nq = looseText(query);
    return base.filter(
      (p) =>
        looseText(p.name).includes(nq) ||
        looseText(p.city ?? "").includes(nq),
    );
  }, [partners, tab, q]);

  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const suggestionList = useMemo(() => {
    const s = suggestions;
    if (!s) return [];
    return [...s.fromStatements, ...s.fromInvoices];
  }, [suggestions]);
  const visibleSuggestions = showAllSuggestions
    ? suggestionList
    : suggestionList.slice(0, 4);

  function removePartner(p: Partner) {
    if (
      !window.confirm(
        `Obrisati partnera "${p.name}"? Transakcije ostaju, samo se skida veza.`,
      )
    ) {
      return;
    }
    deletePartner.mutate(p.id);
  }

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
            <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
            Partneri
          </div>
          <h1 className="font-serif-display text-[28px] leading-tight text-text-primary mb-[5px]">
            Poslovni partneri.
          </h1>
          <p className="text-[13px] leading-6 text-text-tertiary max-w-[560px]">
            Jedan registar za sve partnere. Da li je neko kupac ili dobavljač
            vidi se samo iz poslovanja: uplate, isplate i fakture.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRacunPreselect(null);
              setRacunModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconReceipt size={16} />
            Proknjiži ulazni račun
          </button>
          <button
            type="button"
            onClick={() => setFormInitial({ ...EMPTY_PARTNER_FORM })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <IconPlus size={16} />
            Dodaj partnera
          </button>
        </div>
      </div>

      {/* Prijedlozi iz podataka */}
      {suggestionList.length > 0 && (
        <div className="rounded-xl bg-cream-100 border border-cream-300 mb-5 overflow-hidden">
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-brand-700 px-4 pt-3 pb-2">
            <IconSparkles size={14} />
            Pronađeni u vašim izvodima i fakturama
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[11px] tabular-nums">
              {suggestionList.length}
            </span>
          </div>
          <ul>
            {visibleSuggestions.map((s, i) => {
              const bank = s.account ? bankNameFromAccount(s.account) : null;
              const meta = [
                s.source === "statement" ? "sa izvoda" : "sa faktura",
                bank ?? (s.account ? formatBankAccount(s.account) : null),
                s.source === "statement"
                  ? `${s.txCount} ${s.txCount === 1 ? "transakcija" : "transakcije"}`
                  : `${s.txCount} ${s.txCount === 1 ? "faktura" : "fakture"}`,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={`${s.source}-${s.account ?? s.name}-${i}`}
                  className={[
                    "flex items-center gap-3 px-4 py-2.5",
                    i < visibleSuggestions.length - 1 ||
                    suggestionList.length > 4
                      ? "border-b border-cream-300/60"
                      : "",
                  ].join(" ")}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[13px] text-text-primary truncate"
                      title={s.name}
                    >
                      {s.name}
                    </p>
                    <p className="text-[11.5px] text-text-tertiary">{meta}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormInitial(formFromSuggestion(s))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-600 text-brand-600 text-[12px] font-medium hover:bg-brand-100 transition-colors shrink-0"
                  >
                    <IconPlus size={13} />
                    Dodaj
                  </button>
                </li>
              );
            })}
          </ul>
          {suggestionList.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAllSuggestions((v) => !v)}
              className="w-full px-4 py-2 text-[12px] font-medium text-brand-600 hover:bg-cream-50 transition-colors text-left"
            >
              {showAllSuggestions
                ? "Prikaži manje"
                : `Prikaži još ${suggestionList.length - 4}`}
            </button>
          )}
        </div>
      )}

      {/* Tabovi + pretraga */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-cream-300">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-text-tertiary hover:text-text-primary",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative mb-1.5">
          <IconSearch
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            className="rounded-lg border border-cream-300 bg-cream-100 pl-9 pr-3 py-1.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600 w-[240px]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Naziv, šifra, JIB, račun..."
          />
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-xl bg-cream-100 border border-cream-300">
        {isLoading ? (
          <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
            Učitavanje...
          </div>
        ) : visible.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <span className="w-12 h-12 rounded-full bg-cream-200 text-text-tertiary inline-flex items-center justify-center mb-3">
              <IconInbox size={22} />
            </span>
            <p className="text-[14px] font-medium text-text-primary">
              {q.trim()
                ? "Nema rezultata pretrage"
                : tab === "kupci"
                  ? "Još nema aktivnih kupaca"
                  : tab === "dobavljaci"
                    ? "Još nema aktivnih dobavljača"
                    : tab === "imenik"
                      ? "Imenik je prazan"
                      : "Još nema aktivnih partnera"}
            </p>
            <p className="text-[12.5px] text-text-tertiary mt-1 max-w-[420px] mx-auto">
              {q.trim()
                ? "Pokušajte drugi pojam, šifru ili JIB."
                : tab === "imenik"
                  ? "Dodajte partnera ručno ili jednim klikom iz prijedloga iznad."
                  : "Ovdje se prikazuju partneri sa kojima ste poslovali (uplate, isplate, fakture). Svi uneseni partneri su u Imeniku."}
            </p>
          </div>
        ) : (
          <ul>
            {visible.map((p, i) => {
              const dugujeKupac = p.stats.invoicesTotal;
              const potrazujeKupac = p.stats.totalIn;
              const dugujeDob = p.stats.totalOut;
              const potrazujeDob = p.stats.racuniTotal;
              return (
                <li
                  key={p.id}
                  className={[
                    "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-[13px] cursor-pointer hover:bg-cream-50/60 transition-colors",
                    i < visible.length - 1 ? "border-b border-cream-300/70" : "",
                  ].join(" ")}
                  onClick={() => router.push(`/app/partneri/${p.id}`)}
                >
                  <span
                    className={[
                      "w-10 h-10 rounded-full inline-flex items-center justify-center shrink-0",
                      isDobavljac(p) && !isKupac(p)
                        ? "bg-info-bg text-info"
                        : "bg-brand-100 text-brand-700",
                    ].join(" ")}
                  >
                    {isDobavljac(p) && !isKupac(p) ? (
                      <IconBuildingStore size={17} />
                    ) : (
                      <IconUserDollar size={17} />
                    )}
                  </span>
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13.5px] font-medium text-text-primary">
                        {p.name}
                      </span>
                      <TypeChips p={p} />
                    </div>
                    <div className="text-[11.5px] text-text-tertiary mt-0.5 truncate">
                      {[
                        p.code != null
                          ? `šifra ${String(p.code).padStart(4, "0")}`
                          : null,
                        p.jib ? `JIB ${p.jib}` : null,
                        p.stats.txCount > 0
                          ? `${p.stats.txCount} transakcija`
                          : null,
                        p.stats.lastDate
                          ? `zadnja ${formatDate(p.stats.lastDate)}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>

                  {/* kolone po tabu */}
                  {tab === "kupci" && (
                    <div className="flex gap-5">
                      <MiniStat
                        label="Duguje"
                        value={formatBAM(dugujeKupac)}
                      />
                      <MiniStat
                        label="Potražuje"
                        value={formatBAM(potrazujeKupac)}
                      />
                      <MiniStat
                        label="Saldo"
                        value={formatBAM(dugujeKupac - potrazujeKupac)}
                        tone={
                          dugujeKupac - potrazujeKupac > 0
                            ? "success"
                            : "muted"
                        }
                      />
                    </div>
                  )}
                  {tab === "dobavljaci" && (
                    <div className="flex gap-5">
                      <MiniStat label="Duguje" value={formatBAM(dugujeDob)} />
                      <MiniStat
                        label="Potražuje"
                        value={formatBAM(potrazujeDob)}
                      />
                      <MiniStat
                        label="Saldo"
                        value={formatBAM(dugujeDob - potrazujeDob)}
                        tone={dugujeDob - potrazujeDob < 0 ? "accent" : "muted"}
                      />
                    </div>
                  )}
                  {tab === "svi" && (
                    <div className="flex gap-5">
                      <MiniStat
                        label="Njihov dug"
                        value={
                          p.stats.openInvoicesTotal > 0
                            ? formatBAM(p.stats.openInvoicesTotal)
                            : "–"
                        }
                        tone={
                          p.stats.openInvoicesTotal > 0 ? "success" : "muted"
                        }
                      />
                      <MiniStat
                        label="Naš dug"
                        value={
                          p.stats.openPayablesTotal > 0
                            ? formatBAM(p.stats.openPayablesTotal)
                            : "–"
                        }
                        tone={
                          p.stats.openPayablesTotal > 0 ? "warning" : "muted"
                        }
                      />
                    </div>
                  )}
                  {tab === "imenik" && (
                    <div className="text-right min-w-[150px]">
                      <div className="text-[12px] text-text-tertiary">
                        {[p.city, p.phone].filter(Boolean).join(" · ") || "–"}
                      </div>
                      <div className="text-[11.5px] text-text-tertiary">
                        {isAktivan(p) ? "aktivan" : "bez prometa"}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormInitial(formFromPartner(p));
                    }}
                    title="Uredi podatke"
                    className="p-2 rounded-lg border border-cream-300 text-text-tertiary hover:text-brand-600 hover:border-brand-600/50 transition-colors"
                  >
                    <IconPencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePartner(p);
                    }}
                    title="Obriši partnera"
                    className="p-2 rounded-lg border border-cream-300 text-text-tertiary hover:text-accent-500 hover:border-accent-500/50 transition-colors"
                  >
                    <IconTrash size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-[12px] text-text-tertiary mt-3">
        Klik na partnera otvara njegovu karticu (promet, fakture, ulazni
        računi); olovka uređuje podatke.
      </p>

      {/* Forma partnera (dodavanje/uređivanje) */}
      <PartnerFormModal
        orgId={orgId}
        initial={formInitial}
        onClose={() => setFormInitial(null)}
        onSaved={(saved) => {
          if (returnToRacun) {
            setReturnToRacun(false);
            setRacunPreselect(saved.id);
            setRacunModalOpen(true);
          }
        }}
      />

      {/* Globalno knjiženje ulaznog računa */}
      <UlazniRacunModal
        orgId={orgId}
        open={racunModalOpen}
        onClose={() => setRacunModalOpen(false)}
        partners={(partners ?? []).map((pp) => ({
          id: pp.id,
          name: pp.name,
          code: pp.code,
        }))}
        preselectPartnerId={racunPreselect}
        isPdvObveznik={Boolean(fullOrg?.isPdvObveznik)}
        onRequestNewPartner={() => {
          setRacunModalOpen(false);
          setReturnToRacun(true);
          setFormInitial({ ...EMPTY_PARTNER_FORM });
        }}
      />
    </div>
  );
}
