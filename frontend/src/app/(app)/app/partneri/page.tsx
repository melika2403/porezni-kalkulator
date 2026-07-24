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
  IconX,
  IconFileUpload,
  IconReportAnalytics,
  IconArrowsExchange,
  IconDownload,
  IconLoader2,
  IconScale,
} from "@tabler/icons-react";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBAM, formatDate } from "src/lib/format";
import { bankNameFromAccount, formatBankAccount } from "src/lib/bankCodes";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  useDeletePartner,
  useMergePartner,
  usePartners,
  usePartnerSuggestions,
} from "src/hooks/usePartners";
import {
  createPartner,
  hidePartnerSuggestion,
  uvozPartnera,
  type Partner,
  type PartnerSuggestion,
} from "src/api/partners";
import { ConfirmModal } from "src/components/app-shell/ConfirmModal";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { parsePartneriFile } from "src/lib/comsoftUvoz";
import { UlazniRacunModal } from "src/sections/partneri/UlazniRacunModal";
import { PrometModal } from "src/sections/partneri/PrometModal";
import { PocetnaStanjaModal } from "src/sections/partneri/PocetnaStanjaModal";
import { Modal } from "src/components/app-shell/Modal";
import { UvozSifarnikaModal } from "src/components/app-shell/UvozSifarnikaModal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import RowActionsMenu from "src/components/RowActionsMenu/RowActionsMenu";
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

// sortiranje radi na svim tabovima; dug = otvorene stavke (njihov/naš)
type SortId =
  | "aktivnost"
  | "promet-desc"
  | "naziv-az"
  | "naziv-za"
  | "sifra-asc"
  | "sifra-desc"
  | "njihov-dug-desc"
  | "njihov-dug-asc"
  | "nas-dug-desc"
  | "nas-dug-asc";

const SORT_GROUPS = [
  {
    label: "Aktivnost",
    options: [
      { value: "aktivnost", label: "Najnovije prvo" },
      { value: "promet-desc", label: "Najveći promet" },
    ],
  },
  {
    label: "Naziv i šifra",
    options: [
      { value: "naziv-az", label: "Naziv A-Ž" },
      { value: "naziv-za", label: "Naziv Ž-A" },
      { value: "sifra-asc", label: "Šifra rastuće" },
      { value: "sifra-desc", label: "Šifra opadajuće" },
    ],
  },
  {
    label: "Dug",
    options: [
      { value: "njihov-dug-desc", label: "Njihov dug: najveći prvo" },
      { value: "njihov-dug-asc", label: "Njihov dug: najmanji prvo" },
      { value: "nas-dug-desc", label: "Naš dug: najveći prvo" },
      { value: "nas-dug-asc", label: "Naš dug: najmanji prvo" },
    ],
  },
];

// tip partnera se ne bira ručno nego izvodi iz poslovanja
// klasifikacija: promet izabrane godine ILI živ otvoren dug (partner sa
// dugom iz ranijih godina ne smije nestati iz tabova u godišnjem pregledu)
function isKupac(p: Partner): boolean {
  return p.stats.totalIn > 0 || p.stats.openInvoicesCount > 0;
}
function isDobavljac(p: Partner): boolean {
  return (
    p.stats.totalOut > 0 ||
    p.stats.racuniCount > 0 ||
    p.stats.openPayablesCount > 0
  );
}
function isAktivan(p: Partner): boolean {
  return (
    p.stats.txCount > 0 ||
    p.stats.openInvoicesCount > 0 ||
    p.stats.openPayablesCount > 0 ||
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
  const [sort, setSort] = useState<SortId>("aktivnost");
  // klik na KPI karticu duga filtrira listu na dužnike te strane
  const [dugFilter, setDugFilter] = useState<null | "njihov" | "nas">(null);
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
  const [formInitial, setFormInitial] = useState<PartnerFormState | null>(null);
  // globalno knjiženje ulaznog računa (izbor dobavljača u modalu)
  const [racunModalOpen, setRacunModalOpen] = useState(false);
  const [racunPreselect, setRacunPreselect] = useState<number | null>(null);
  // "+ Novi partner" iz knjiženja: po snimanju vrati na knjiženje
  const [returnToRacun, setReturnToRacun] = useState(false);
  const [uvozOpen, setUvozOpen] = useState(false);
  const [prometOpen, setPrometOpen] = useState(false);
  // grupni unos početnih stanja (migracija)
  const [pocetnaOpen, setPocetnaOpen] = useState(false);
  // godišnji pregled: promet i aktivnost za izabranu godinu, dugovi uvijek živi
  const currentYear = new Date().getFullYear();
  const [godina, setGodina] = useState<number | "sve">(currentYear);
  // spajanje duplikata: izvorni partner + izbor ciljnog
  const [mergeSource, setMergeSource] = useState<Partner | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null);
  const mergeM = useMergePartner(orgId);
  // grupno dodavanje svih prijedloga
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkInfo, setBulkInfo] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const { data: partners, isLoading } = usePartners(
    orgId,
    godina === "sve" ? null : godina,
  );
  const { data: suggestions } = usePartnerSuggestions(orgId);
  const deletePartner = useDeletePartner(orgId);

  const visible = useMemo(() => {
    // sortiranje: aktivnost/promet, naziv, šifra ili otvoreni dug (obje strane)
    const cmp = (a: Partner, b: Partner): number => {
      const byName = a.name.localeCompare(b.name, "bs");
      switch (sort) {
        case "naziv-az":
          return byName;
        case "naziv-za":
          return -byName;
        case "sifra-asc": {
          const ca = a.code ?? Number.MAX_SAFE_INTEGER;
          const cb = b.code ?? Number.MAX_SAFE_INTEGER;
          return ca - cb || byName;
        }
        case "sifra-desc": {
          const ca = a.code ?? -1;
          const cb = b.code ?? -1;
          return cb - ca || byName;
        }
        case "njihov-dug-desc":
          return (
            b.stats.openInvoicesTotal - a.stats.openInvoicesTotal || byName
          );
        case "njihov-dug-asc":
          return (
            a.stats.openInvoicesTotal - b.stats.openInvoicesTotal || byName
          );
        case "nas-dug-desc":
          return (
            b.stats.openPayablesTotal - a.stats.openPayablesTotal || byName
          );
        case "nas-dug-asc":
          return (
            a.stats.openPayablesTotal - b.stats.openPayablesTotal || byName
          );
        case "promet-desc":
          return (
            b.stats.totalIn +
              b.stats.totalOut -
              (a.stats.totalIn + a.stats.totalOut) || byName
          );
        default: {
          const da = a.stats.lastDate ?? "";
          const db = b.stats.lastDate ?? "";
          return db.localeCompare(da) || byName;
        }
      }
    };
    const all = [...(partners ?? [])].sort(cmp);
    let base = all;
    if (tab === "kupci") base = all.filter(isKupac);
    else if (tab === "dobavljaci") base = all.filter(isDobavljac);
    else if (tab === "svi") base = all.filter(isAktivan);
    if (dugFilter === "njihov") {
      base = base.filter((p) => p.stats.openInvoicesTotal > 0);
    } else if (dugFilter === "nas") {
      base = base.filter((p) => p.stats.openPayablesTotal > 0);
    }

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
  }, [partners, tab, q, sort, dugFilter]);

  // KPI: ukupni otvoreni dugovi preko svih partnera
  const dugSume = useMemo(() => {
    let njihov = 0;
    let njihovCnt = 0;
    let nas = 0;
    let nasCnt = 0;
    for (const p of partners ?? []) {
      if (p.stats.openInvoicesTotal > 0) {
        njihov += p.stats.openInvoicesTotal;
        njihovCnt += 1;
      }
      if (p.stats.openPayablesTotal > 0) {
        nas += p.stats.openPayablesTotal;
        nasCnt += 1;
      }
    }
    return { njihov, njihovCnt, nas, nasCnt };
  }, [partners]);

  // brojači po tabu (za navbar)
  const tabCounts = useMemo(() => {
    const all = partners ?? [];
    return {
      kupci: all.filter(isKupac).length,
      dobavljaci: all.filter(isDobavljac).length,
      svi: all.filter(isAktivan).length,
      imenik: all.length,
    } as Record<TabId, number>;
  }, [partners]);

  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const suggestionList = useMemo(() => {
    const s = suggestions;
    if (!s) return [];
    return [...s.fromStatements, ...s.fromInvoices];
  }, [suggestions]);
  const visibleSuggestions = showAllSuggestions
    ? suggestionList
    : suggestionList.slice(0, 4);

  // "nije partner": prijedlog za trajno skrivanje (potvrda u modalu)
  const [zaSkrivanje, setZaSkrivanje] = useState<PartnerSuggestion | null>(
    null,
  );
  const [hideBusy, setHideBusy] = useState(false);
  async function sakrijPrijedlog() {
    if (!orgId || !zaSkrivanje || hideBusy) return;
    setHideBusy(true);
    const r = await hidePartnerSuggestion(orgId, {
      account: zaSkrivanje.account,
      name: zaSkrivanje.name,
    });
    setHideBusy(false);
    if (r.ok) {
      setZaSkrivanje(null);
      qc.invalidateQueries({ queryKey: ["partners", orgId, "suggestions"] });
    }
  }

  // grupno dodavanje svih prijedloga (podaci koje već imamo sa izvoda/faktura)
  async function dodajSvePrijedloge() {
    if (!orgId || bulkBusy || suggestionList.length === 0) return;
    setBulkBusy(true);
    setBulkInfo(null);
    let dodano = 0;
    let preskoceno = 0;
    for (const s of suggestionList) {
      const r = await createPartner(orgId, {
        name: s.name,
        jib: s.jib ?? undefined,
        address: s.address ?? undefined,
        city: s.city ?? undefined,
        email: s.email ?? undefined,
        accounts: s.account ? [s.account] : [],
        isKupac: s.isKupac,
        isDobavljac: s.isDobavljac,
      });
      if (r.ok) dodano += 1;
      else preskoceno += 1;
    }
    qc.invalidateQueries({ queryKey: ["partners", orgId] });
    qc.invalidateQueries({ queryKey: ["bank-statements", orgId] });
    setBulkInfo(
      preskoceno === 0
        ? `Dodano ${dodano} ${dodano === 1 ? "partner" : "partnera"}.`
        : `Dodano ${dodano}, preskočeno ${preskoceno}.`,
    );
    setBulkBusy(false);
  }

  // izvoz imenika u CSV (Excel): izvozi se ono što je trenutno filtrirano
  function izvozCsv() {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const num = (n: number) => n.toFixed(2).replace(".", ",");
    const header = [
      "Šifra", "Naziv", "JIB", "PDV broj", "Adresa", "Grad", "Email",
      "Telefon", "Žiro računi", "Promet (KM)", "Njihov dug (KM)",
      "Naš dug (KM)", "Zadnja aktivnost", "Napomena",
    ];
    const lines = visible.map((p) => [
      p.code != null ? String(p.code).padStart(4, "0") : "",
      p.name,
      p.jib ?? "",
      p.pdvBroj ?? "",
      p.address ?? "",
      p.city ?? "",
      p.email ?? "",
      p.phone ?? "",
      p.accounts.join(" "),
      num(p.stats.totalIn + p.stats.totalOut),
      num(p.stats.openInvoicesTotal),
      num(p.stats.openPayablesTotal),
      p.stats.lastDate ? formatDate(p.stats.lastDate) : "",
      p.note ?? "",
    ]);
    // BOM da Excel ispravno pročita UTF-8 (č, ć, š...)
    const csv =
      "\uFEFF" +
      [header, ...lines].map((r) => r.map(esc).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Partneri_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }


  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="relative flex flex-wrap items-end justify-between gap-3 mb-5">
        <HelpButton slug="partneri" className="absolute top-0 right-0" />
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
          <PkSelect
            ariaLabel="Godina pregleda"
            value={godina === "sve" ? "sve" : String(godina)}
            onChange={(v) =>
              setGodina(v === "sve" ? "sve" : Number(v) || currentYear)
            }
            options={[
              ...Array.from({ length: 6 }, (_, i) => ({
                value: String(currentYear - i),
                label: `Godina ${currentYear - i}`,
              })),
              { value: "sve", label: "Sve godine" },
            ]}
            wrapStyle={{ width: 150 }}
          />
          <button
            type="button"
            onClick={() => setPrometOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cream-300 text-text-primary text-[13px] font-medium hover:bg-cream-200 transition-colors"
          >
            <IconReportAnalytics size={16} />
            Ukupni promet
          </button>
          <button
            type="button"
            onClick={() => setUvozOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cream-300 text-text-primary text-[13px] font-medium hover:bg-cream-200 transition-colors"
          >
            <IconFileUpload size={16} />
            Uvoz
          </button>
          <button
            type="button"
            onClick={() => setPocetnaOpen(true)}
            title="Grupni unos otvorenih stanja partnera pri ulasku obrta u program (migracija iz starog softvera)"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cream-300 text-text-primary text-[13px] font-medium hover:bg-cream-200 transition-colors"
          >
            <IconScale size={16} />
            Početna stanja
          </button>
          <button
            type="button"
            onClick={izvozCsv}
            disabled={visible.length === 0}
            title="Izvoz trenutno filtrirane liste u CSV (Excel): podaci, promet i dugovi"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cream-300 text-text-primary text-[13px] font-medium hover:bg-cream-200 transition-colors disabled:opacity-50"
          >
            <IconDownload size={16} />
            Izvoz (CSV)
          </button>
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
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-brand-700 px-4 pt-3 pb-2">
            <IconSparkles size={14} />
            Pronađeni u vašim izvodima i fakturama
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[11px] tabular-nums">
              {suggestionList.length}
            </span>
            {bulkInfo && (
              <span className="text-[11.5px] text-text-tertiary font-normal">
                {bulkInfo}
              </span>
            )}
            {suggestionList.length > 1 && (
              <button
                type="button"
                onClick={dodajSvePrijedloge}
                disabled={bulkBusy}
                title="Dodaj sve pronađene partnere odjednom, sa podacima koje već imamo"
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-600 text-brand-600 text-[12px] font-medium hover:bg-brand-100 transition-colors disabled:opacity-50"
              >
                {bulkBusy ? (
                  <IconLoader2 size={13} className="animate-spin" />
                ) : (
                  <IconPlus size={13} />
                )}
                Dodaj sve ({suggestionList.length})
              </button>
            )}
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
                  <button
                    type="button"
                    onClick={() => setZaSkrivanje(s)}
                    title="Nije partner: ukloni prijedlog i ne predlaži ga više"
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-cream-200 transition-colors shrink-0"
                  >
                    <IconX size={15} />
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

      {/* KPI: otvoreni dugovi; klik filtrira listu na dužnike te strane */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <button
          type="button"
          onClick={() => {
            const nov = dugFilter === "njihov" ? null : "njihov";
            setDugFilter(nov);
            if (nov) setSort("njihov-dug-desc");
          }}
          title="Prikaži samo partnere koji nam duguju (otvorene fakture)"
          className={[
            "text-left bg-cream-100 border rounded-xl p-[18px] transition-colors",
            dugFilter === "njihov"
              ? "border-brand-600 ring-1 ring-brand-600"
              : "border-cream-300 hover:border-brand-600/50",
          ].join(" ")}
        >
          <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Njihov dug (potraživanja)
          </div>
          <div className="font-serif-display text-[22px] leading-none tabular-nums text-success">
            {dugSume.njihov > 0 ? formatBAM(dugSume.njihov) : "–"}
          </div>
          <div className="text-[11.5px] text-text-tertiary mt-1.5">
            {dugSume.njihovCnt > 0
              ? `${dugSume.njihovCnt} ${dugSume.njihovCnt === 1 ? "partner duguje" : "partnera duguje"}`
              : "niko ne duguje"}
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            const nov = dugFilter === "nas" ? null : "nas";
            setDugFilter(nov);
            if (nov) setSort("nas-dug-desc");
          }}
          title="Prikaži samo dobavljače kojima dugujemo (otvoreni ulazni računi)"
          className={[
            "text-left bg-cream-100 border rounded-xl p-[18px] transition-colors",
            dugFilter === "nas"
              ? "border-brand-600 ring-1 ring-brand-600"
              : "border-cream-300 hover:border-brand-600/50",
          ].join(" ")}
        >
          <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Naš dug (obaveze)
          </div>
          <div className="font-serif-display text-[22px] leading-none tabular-nums text-warning">
            {dugSume.nas > 0 ? formatBAM(dugSume.nas) : "–"}
          </div>
          <div className="text-[11.5px] text-text-tertiary mt-1.5">
            {dugSume.nasCnt > 0
              ? `${dugSume.nasCnt} ${dugSume.nasCnt === 1 ? "dobavljaču dugujemo" : "dobavljača čeka plaćanje"}`
              : "nema otvorenih računa"}
          </div>
        </button>
        <div className="bg-cream-100 border border-cream-300 rounded-xl p-[18px]">
          <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
            Aktivni partneri
          </div>
          <div className="font-serif-display text-[22px] leading-none tabular-nums text-text-primary">
            {tabCounts.svi}
          </div>
          <div className="text-[11.5px] text-text-tertiary mt-1.5">
            ukupno {tabCounts.imenik} u imeniku
          </div>
        </div>
      </div>

      {/* Tabovi + pretraga (segmented pilula kao na ostatku PK Office-a) */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "inline-flex items-center gap-1.5 px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors whitespace-nowrap",
                tab === t.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-cream-200",
              ].join(" ")}
            >
              {t.label}
              <span
                className={[
                  "inline-flex items-center justify-center min-w-[20px] px-1.5 py-px rounded-full text-[11px] tabular-nums",
                  tab === t.id
                    ? "bg-white/20 text-white"
                    : "bg-cream-200 text-text-tertiary",
                ].join(" ")}
              >
                {tabCounts[t.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {dugFilter != null && (
            <button
              type="button"
              onClick={() => setDugFilter(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium hover:bg-brand-100/70 transition-colors"
              title="Ukloni filter duga"
            >
              {dugFilter === "njihov" ? "Samo dužnici" : "Samo naše obaveze"}
              <IconX size={13} />
            </button>
          )}
          <PkSelect
            ariaLabel="Sortiranje"
            value={sort}
            onChange={(v) => setSort(String(v ?? "aktivnost") as SortId)}
            groups={SORT_GROUPS}
          />
          <div className="relative">
            <IconSearch
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              className="rounded-lg border border-cream-300 bg-cream-100 pl-9 pr-8 py-1.5 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600 w-[240px]"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Naziv, šifra, JIB, račun..."
            />
            {q && (
              <button
                type="button"
                aria-label="Očisti pretragu"
                onClick={() => setQ("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-tertiary hover:text-text-primary"
              >
                <IconX size={14} />
              </button>
            )}
          </div>
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
                  onClick={() =>
                    router.push(
                      `/app/partneri/${p.id}${
                        tab === "kupci"
                          ? "?tip=kupac"
                          : tab === "dobavljaci"
                            ? "?tip=dobavljac"
                            : ""
                      }`,
                    )
                  }
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
                        label="Promet"
                        value={formatBAM(p.stats.totalIn + p.stats.totalOut)}
                      />
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
                  {/* rijetke akcije u overflow meni; klik ne otvara karticu */}
                  <span onClick={(e) => e.stopPropagation()}>
                    <RowActionsMenu
                      primaryActions={[]}
                      menuItems={[
                        {
                          kind: "item",
                          key: "racun",
                          label: "Proknjiži ulazni račun",
                          icon: <IconReceipt size={14} />,
                          onClick: () => {
                            setRacunPreselect(p.id);
                            setRacunModalOpen(true);
                          },
                        },
                        {
                          kind: "item",
                          key: "merge",
                          label: "Spoji sa drugim partnerom",
                          icon: <IconArrowsExchange size={14} />,
                          onClick: () => {
                            mergeM.reset(); // očisti grešku prethodnog pokušaja
                            setMergeTargetId(null);
                            setMergeSource(p);
                          },
                        },
                        {
                          kind: "item",
                          key: "delete",
                          label: "Obriši partnera",
                          icon: <IconTrash size={14} />,
                          onClick: () => setDeleteTarget(p),
                        },
                      ]}
                    />
                  </span>
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
      <PrometModal
        open={prometOpen}
        onClose={() => setPrometOpen(false)}
        orgId={orgId}
        org={fullOrg}
      />

      <UvozSifarnikaModal
        open={uvozOpen}
        onClose={() => setUvozOpen(false)}
        title="Uvoz partnera"
        opis="Uvoz poslovnih partnera iz drugih programa (XML ili CSV fajl). Partneri koji već postoje (isti ID broj ili isti naziv) se preskaču i ništa im se ne mijenja."
        parse={parsePartneriFile}
        uvezi={async (parsed) => {
          const r = await unwrap(uvozPartnera(orgId as number, parsed));
          qc.invalidateQueries({ queryKey: ["partners", orgId] });
          const napomene: string[] = [];
          if (r.bezIdBroja > 0) {
            napomene.push(
              `${r.bezIdBroja} ${r.bezIdBroja === 1 ? "partner je uvezen" : "partnera je uvezeno"} bez ID broja (u fajlu ga nema). Za knjiženje faktura i PDV evidencije dopunite ID broj na partneru.`,
            );
          }
          if (r.vezanoTransakcija > 0) {
            napomene.push(
              `${r.vezanoTransakcija} postojećih transakcija sa izvoda je automatski povezano sa uvezenim partnerima.`,
            );
          }
          return { ...r, napomene };
        }}
      />

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

      {/* Potvrda brisanja partnera */}
      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Brisanje partnera"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={deletePartner.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deletePartner.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                });
              }}
              className="px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Obriši partnera
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-6 text-text-secondary">
          Obrisati partnera{" "}
          <span className="font-semibold text-text-primary">
            {deleteTarget?.name}
          </span>
          ? Transakcije, izvodi i fakture ostaju netaknuti, skida se samo
          veza sa karticom ovog partnera.
        </p>
      </Modal>

      {/* Spajanje duplikata */}
      <Modal
        open={mergeSource != null}
        onClose={() => setMergeSource(null)}
        title="Spajanje duplikata"
      >
        {mergeSource && (
          <div className="space-y-3">
            <p className="text-[13px] leading-6 text-text-secondary">
              Sav promet partnera{" "}
              <span className="font-semibold text-text-primary">
                {mergeSource.name}
              </span>{" "}
              (transakcije sa izvoda, ulazni računi, prebijanja, kalkulacije)
              prelazi na partnera kojeg izaberete. Žiro računi i podaci se
              spajaju, a{" "}
              <span className="font-semibold text-text-primary">
                {mergeSource.name}
              </span>{" "}
              se briše. Radnja je nepovratna.
            </p>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Spoji u partnera
              </label>
              <PkSelect
                ariaLabel="Ciljni partner"
                value={mergeTargetId != null ? String(mergeTargetId) : ""}
                onChange={(v) => setMergeTargetId(v ? Number(v) : null)}
                searchable
                placeholder="Izaberi partnera"
                options={[
                  { value: "", label: "Izaberi partnera" },
                  ...(partners ?? [])
                    .filter((x) => x.id !== mergeSource.id)
                    .sort((a, b) => a.name.localeCompare(b.name, "bs"))
                    .map((x) => ({
                      value: String(x.id),
                      label: `${
                        x.code != null
                          ? `${String(x.code).padStart(4, "0")} · `
                          : ""
                      }${x.name}`,
                    })),
                ]}
                wrapStyle={{ width: "100%" }}
              />
            </div>
            {mergeM.isError && (
              <p className="text-[12.5px] text-accent-500">
                Spajanje nije uspjelo, pokušajte ponovo.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMergeSource(null)}
                className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
              >
                Odustani
              </button>
              <button
                type="button"
                disabled={mergeTargetId == null || mergeM.isPending}
                onClick={async () => {
                  if (!mergeSource || mergeTargetId == null) return;
                  try {
                    await mergeM.mutateAsync({
                      sourceId: mergeSource.id,
                      targetId: mergeTargetId,
                    });
                    setMergeSource(null);
                  } catch {
                    // greška ostaje prikazana u modalu (mergeM.isError)
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {mergeM.isPending && (
                  <IconLoader2 size={15} className="animate-spin" />
                )}
                Spoji i obriši
              </button>
            </div>
          </div>
        )}
      </Modal>

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
        orgJurisdiction={fullOrg?.jurisdiction ?? null}
        onRequestNewPartner={() => {
          setRacunModalOpen(false);
          setReturnToRacun(true);
          setFormInitial({ ...EMPTY_PARTNER_FORM });
        }}
      />

      {/* Grupni unos početnih stanja partnera (migracija) */}
      <PocetnaStanjaModal
        orgId={orgId}
        partners={partners ?? []}
        open={pocetnaOpen}
        onClose={() => setPocetnaOpen(false)}
      />

      {/* "Nije partner": potvrda trajnog skrivanja prijedloga */}
      <ConfirmModal
        open={zaSkrivanje != null}
        onClose={() => setZaSkrivanje(null)}
        title="Ukloni prijedlog"
        message={
          zaSkrivanje && (
            <>
              <strong className="text-text-primary">{zaSkrivanje.name}</strong>{" "}
              se više neće predlagati kao partner (prepoznaje se po{" "}
              {zaSkrivanje.account ? "žiro računu i nazivu" : "nazivu"}).
              Transakcije ostaju netaknute, a partnera i dalje možete dodati
              ručno kad zatreba.
            </>
          )
        }
        confirmLabel="Da, nije partner"
        busy={hideBusy}
        onConfirm={() => void sakrijPrijedlog()}
      />
    </div>
  );
}
