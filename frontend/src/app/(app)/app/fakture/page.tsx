"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconFileInvoice,
  IconDownload,
  IconCircleCheck,
  IconAlertCircle,
  IconPlus,
  IconInbox,
  IconLoader2,
  IconReceipt,
  IconTrash,
  IconRotate,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBAM, formatDate } from "src/lib/format";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { Modal } from "src/components/app-shell/Modal";
import RowActionsMenu from "src/components/RowActionsMenu/RowActionsMenu";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { useOrgInvoices } from "src/hooks/useBankStatements";
import {
  usePartners,
  useUlazniRacuni,
  useUpdateUlazniRacun,
  useDeleteUlazniRacun,
} from "src/hooks/usePartners";
import {
  convertProformaToInvoice,
  downloadInvoicePdf,
  patchInvoice,
  stornoAvansneFakture,
  type Invoice,
  type InvoiceStatus,
} from "src/api/invoices";
import { kifSign } from "src/sections/pdv/pdvObracun";
import { KnjiznaObavijestModal } from "src/sections/fakture/KnjiznaObavijestModal";
import { KopirajFakturuModal } from "src/sections/fakture/KopirajFakturuModal";
import type { UlazniRacun } from "src/api/partners";
import { getOrganization } from "src/api/profile";
import { unwrap } from "src/api/auth";
import { UlazniRacunModal } from "src/sections/partneri/UlazniRacunModal";
import { InvoicePreviewModal } from "src/sections/fakture/InvoicePreviewModal";
import {
  PartnerFormModal,
  EMPTY_PARTNER_FORM,
  type PartnerFormState,
} from "src/sections/partneri/PartnerFormModal";
import {
  KompenzacijaModal,
  CesijaModal,
} from "src/sections/prebijanja/PrebijanjeModali";
import {
  listPrebijanja,
  deletePrebijanje,
  type Prebijanje,
} from "src/api/prebijanja";

const STATUS_META: Record<InvoiceStatus, { label: string; cls: string }> = {
  DRAFT: { label: "nacrt", cls: "bg-cream-200 text-text-secondary" },
  ISSUED: { label: "izdana", cls: "bg-info-bg text-info" },
  PAID: { label: "naplaćena", cls: "bg-success-bg text-success" },
  CANCELLED: { label: "stornirana", cls: "bg-danger-bg text-danger" },
};

type TabId = "izlazne" | "ulazne" | "sve" | "prebijanja";

const TABS: { id: TabId; label: string }[] = [
  { id: "izlazne", label: "Izlazne" },
  { id: "ulazne", label: "Ulazne" },
  { id: "sve", label: "Sve" },
  { id: "prebijanja", label: "Kompenzacije i cesije" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

function invoiceLate(inv: Invoice): boolean {
  return inv.status === "ISSUED" && !!inv.dueDate && inv.dueDate < todayIso();
}
function racunLate(r: UlazniRacun): boolean {
  return r.status === "OTVOREN" && !!r.rokPlacanja && r.rokPlacanja < todayIso();
}

function InvoiceBadge({ inv }: { inv: Invoice }) {
  // storno i KO se ne naplaćuju: status PAID je tehnički (zatvorene)
  if (
    inv.docType === "STORNO_AVANSNE" ||
    inv.docType === "KNJIZNA_OBAVIJEST"
  ) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-cream-200 text-text-secondary shrink-0">
        proknjižena
      </span>
    );
  }
  if (invoiceLate(inv)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-accent-bg text-accent-500 shrink-0">
        <IconAlertCircle size={11} /> kasni
      </span>
    );
  }
  const meta = STATUS_META[inv.status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium shrink-0 ${meta.cls}`}
    >
      {inv.status === "PAID" ? (
        <IconCircleCheck size={11} />
      ) : inv.status === "ISSUED" ? (
        <IconAlertCircle size={11} />
      ) : null}
      {meta.label}
    </span>
  );
}

function RacunBadge({ r }: { r: UlazniRacun }) {
  // uvoz/JCI i sl.: u KUF-u je, ali nije obaveza prema dobavljaču
  if (r.samoEvidencija) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-cream-200 text-text-secondary shrink-0">
        PDV evidencija
      </span>
    );
  }
  if (r.status === "PLACEN") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-success-bg text-success shrink-0">
        <IconCircleCheck size={11} /> plaćen
      </span>
    );
  }
  if (racunLate(r)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-accent-bg text-accent-500 shrink-0">
        <IconAlertCircle size={11} /> kasni
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-medium bg-warning-bg text-warning shrink-0">
      otvoren
    </span>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "warning" | "accent";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "accent"
          ? "text-accent-500"
          : "text-text-primary";
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-xl p-[18px]">
      <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
        {label}
      </div>
      <div
        className={`font-serif-display text-[22px] leading-none tabular-nums ${color}`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11.5px] text-text-tertiary mt-1.5">{sub}</div>
      )}
    </div>
  );
}

// Redovi liste su na nivou modula (stabilan tip komponente) da se lista ne
// remontira pri svakom renderu: otvoren RowActionsMenu bi se inače sam
// zatvarao, a fokus gubio kad god se stanje osvježi.
// naziv vrste dokumenta ispred broja u listi (STANDARD faktura bez prefiksa)
const DOC_PREFIX: Record<string, string> = {
  AVANSNA: "Avansna faktura",
  STORNO_AVANSNE: "Storno avans",
  KNJIZNA_OBAVIJEST: "Knjižna obavijest",
  PAZAR: "Pazar",
};

function InvoiceRow({
  inv,
  last,
  downloading,
  markPending,
  onMarkPaid,
  onPdf,
  onOpen,
  onConvert,
  onStorno,
  onKnjizna,
  onCopy,
}: {
  inv: Invoice;
  last: boolean;
  downloading: number | null;
  markPending: boolean;
  onMarkPaid: (inv: Invoice) => void;
  onPdf: (inv: Invoice) => void;
  onOpen: (inv: Invoice) => void;
  onConvert: (inv: Invoice) => void;
  onStorno: (inv: Invoice) => void;
  onKnjizna: (inv: Invoice) => void;
  onCopy: (inv: Invoice) => void;
}) {
  // storno avansne i knjižne obavijesti se prikazuju negativno
  const sign = kifSign(inv);
  const isProforma = inv.type === "PROFORMA";
  const menuItems = [
    // kopija: samo standardne fakture/predračuni (avans/storno/KO ne)
    ...(inv.docType === "STANDARD"
      ? [
          {
            kind: "item" as const,
            key: "copy",
            label: "Kopiraj",
            onClick: () => onCopy(inv),
          },
        ]
      : []),
    // predračun koji još nije pretvoren → pretvaranje u fakturu
    ...(isProforma && !inv.convertedToInvoiceId && inv.status !== "CANCELLED"
      ? [
          {
            kind: "item" as const,
            key: "convert",
            label: "Pretvori u fakturu",
            onClick: () => onConvert(inv),
          },
        ]
      : []),
    // avansna bez postojećeg storna → storniranje (tipično uz konačnu fakturu)
    ...(!isProforma &&
    inv.docType === "AVANSNA" &&
    !inv.stornoInvoiceId &&
    inv.status !== "CANCELLED"
      ? [
          {
            kind: "item" as const,
            key: "storno",
            label: "Storniraj avans",
            onClick: () => onStorno(inv),
          },
        ]
      : []),
    // standardna izdana/naplaćena faktura → knjižna obavijest (umanjenje)
    ...(!isProforma &&
    inv.docType === "STANDARD" &&
    (inv.status === "ISSUED" || inv.status === "PAID")
      ? [
          {
            kind: "item" as const,
            key: "knjizna",
            label: "Knjižna obavijest",
            onClick: () => onKnjizna(inv),
          },
        ]
      : []),
  ];
  return (
    <li
      onClick={() => onOpen(inv)}
      title="Otvori pregled fakture"
      className={[
        "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-[13px] cursor-pointer hover:bg-cream-50/80 transition-colors",
        last ? "" : "border-b border-cream-300/70",
      ].join(" ")}
    >
      <span className="w-10 h-10 rounded-full bg-brand-100/60 text-brand-700 inline-flex items-center justify-center shrink-0">
        <IconFileInvoice size={17} />
      </span>
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-medium text-text-primary">
            {DOC_PREFIX[inv.docType] ? `${DOC_PREFIX[inv.docType]} ` : ""}
            {inv.fullNumber}
          </span>
          <InvoiceBadge inv={inv} />
        </div>
        <div className="text-[11.5px] text-text-tertiary mt-0.5 truncate">
          {[
            inv.buyerName,
            `izdana ${formatDate(inv.issueDate)}`,
            inv.dueDate ? `rok ${formatDate(inv.dueDate)}` : null,
            inv.docType === "STANDARD" && inv.paidAt
              ? `naplaćena ${formatDate(inv.paidAt)}`
              : null,
            // veze dokumenata
            inv.linkedFullNumber
              ? inv.docType === "STORNO_AVANSNE"
                ? `po avansnoj ${inv.linkedFullNumber}`
                : `uz fakturu ${inv.linkedFullNumber}`
              : null,
            inv.stornoFullNumber ? `stornirana (${inv.stornoFullNumber})` : null,
            inv.convertedToFullNumber
              ? `pretvoren u ${inv.convertedToFullNumber}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <span className="text-[13.5px] font-semibold tabular-nums whitespace-nowrap">
        {formatBAM(sign * Number(inv.grossTotal))}
      </span>
      <div
        className="flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {inv.status === "ISSUED" && inv.docType === "STANDARD" && (
          <button
            type="button"
            disabled={markPending}
            onClick={() => onMarkPaid(inv)}
            title="Označi naplaćenom (bez izvoda)"
            className="px-3 py-[5px] rounded-lg border border-brand-600 text-brand-600 text-[12px] font-medium hover:bg-brand-100 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            Naplaćena
          </button>
        )}
        <button
          type="button"
          disabled={downloading === inv.id}
          onClick={() => onPdf(inv)}
          title="Preuzmi PDF"
          className="p-2 rounded-lg border border-cream-300 text-text-tertiary hover:text-brand-600 hover:border-brand-600/50 transition-colors disabled:opacity-50"
        >
          {downloading === inv.id ? (
            <IconLoader2 size={15} className="animate-spin" />
          ) : (
            <IconDownload size={15} />
          )}
        </button>
        {menuItems.length > 0 && (
          <RowActionsMenu primaryActions={[]} menuItems={menuItems} />
        )}
      </div>
    </li>
  );
}

function RacunRow({
  r,
  last,
  updatePending,
  onMarkPaid,
  onReopen,
  onDelete,
  onOpen,
}: {
  r: UlazniRacun;
  last: boolean;
  updatePending: boolean;
  onMarkPaid: (r: UlazniRacun) => void;
  onReopen: (r: UlazniRacun) => void;
  onDelete: (r: UlazniRacun) => void;
  onOpen: (r: UlazniRacun) => void;
}) {
  return (
    <li
      onClick={() => onOpen(r)}
      title="Otvori knjiženje"
      className={[
        "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-[13px] cursor-pointer hover:bg-cream-50/80 transition-colors",
        last ? "" : "border-b border-cream-300/70",
      ].join(" ")}
    >
      <span className="w-10 h-10 rounded-full bg-info-bg text-info inline-flex items-center justify-center shrink-0">
        <IconReceipt size={17} />
      </span>
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-medium text-text-primary">
            {r.partner?.name ?? "Dobavljač"}
          </span>
          <RacunBadge r={r} />
        </div>
        <div className="text-[11.5px] text-text-tertiary mt-0.5 truncate">
          {[
            `račun ${r.brojRacuna}`,
            formatDate(r.datumRacuna),
            r.rokPlacanja ? `rok ${formatDate(r.rokPlacanja)}` : null,
            r.pdvIznos ? `PDV ${formatBAM(Number(r.pdvIznos))}` : null,
            r.paidAt ? `plaćen ${formatDate(r.paidAt)}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <span className="text-[13.5px] font-semibold tabular-nums whitespace-nowrap">
        {formatBAM(Number(r.iznos))}
      </span>
      <div
        className="flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {r.status === "OTVOREN" && (
          <button
            type="button"
            disabled={updatePending}
            onClick={() => onMarkPaid(r)}
            title="Označi plaćenim (bez izvoda)"
            className="px-3 py-[5px] rounded-lg border border-brand-600 text-brand-600 text-[12px] font-medium hover:bg-brand-100 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            Plaćen
          </button>
        )}
        <RowActionsMenu
          primaryActions={[]}
          menuItems={[
            ...(r.partner
              ? ([
                  {
                    kind: "item" as const,
                    key: "kartica",
                    label: "Kartica dobavljača",
                    href: `/app/partneri/${r.partner.id}`,
                  },
                ] as const)
              : []),
            ...(r.status === "PLACEN"
              ? ([
                  {
                    kind: "item" as const,
                    key: "reopen",
                    label: "Vrati u otvoreno",
                    icon: <IconRotate size={14} />,
                    onClick: () => onReopen(r),
                  },
                ] as const)
              : []),
            {
              kind: "item" as const,
              key: "delete",
              label: "Obriši račun",
              icon: <IconTrash size={14} />,
              onClick: () => onDelete(r),
            },
          ]}
        />
      </div>
    </li>
  );
}

export default function FakturePage() {
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const [tab, setTab] = useState<TabId>("izlazne");
  const [statusFilter, setStatusFilter] = useState("");
  const [ulazFilter, setUlazFilter] = useState("");
  const [downloading, setDownloading] = useState<number | null>(null);
  const [deleteRacunTarget, setDeleteRacunTarget] =
    useState<UlazniRacun | null>(null);
  // knjiženje ulaznog računa + "+ Novi partner" iz njega
  const [racunModalOpen, setRacunModalOpen] = useState(false);
  const [racunPreselect, setRacunPreselect] = useState<number | null>(null);
  // pregled izlazne fakture / otvaranje knjiženja ulaznog računa
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [racunEdit, setRacunEdit] = useState<UlazniRacun | null>(null);
  // avansni dokumenti i knjižne obavijesti
  const [convertTarget, setConvertTarget] = useState<Invoice | null>(null);
  const [stornoTarget, setStornoTarget] = useState<Invoice | null>(null);
  const [koTarget, setKoTarget] = useState<Invoice | null>(null);
  const [copyTarget, setCopyTarget] = useState<Invoice | null>(null);
  const [returnToRacun, setReturnToRacun] = useState(false);
  const [formInitial, setFormInitial] = useState<PartnerFormState | null>(null);
  // kompenzacije i cesije (zatvaranje bez novca)
  const [kompOpen, setKompOpen] = useState(false);
  const [cesijaOpen, setCesijaOpen] = useState(false);
  const [deletePrebTarget, setDeletePrebTarget] = useState<Prebijanje | null>(
    null,
  );

  const { data: fullOrg } = useQuery({
    queryKey: ["pk-org", orgId],
    queryFn: () => unwrap(getOrganization(orgId as number)),
    enabled: orgId != null,
  });

  const { data: invoices, isLoading } = useOrgInvoices(orgId, {});
  const { data: racuni, isLoading: racuniLoading } = useUlazniRacuni(orgId);
  const { data: partners } = usePartners(orgId);
  const { data: prebijanja } = useQuery({
    queryKey: ["prebijanja", orgId],
    queryFn: () => unwrap(listPrebijanja(orgId as number)),
    enabled: orgId != null,
  });
  const updateRacun = useUpdateUlazniRacun(orgId);
  const deleteRacun = useDeleteUlazniRacun(orgId);

  const qc = useQueryClient();
  const markPaid = useMutation({
    mutationFn: (inv: Invoice) =>
      unwrap(patchInvoice(inv.id, { status: "PAID" })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-invoices", orgId] });
    },
  });
  const invalidateInvoices = () => {
    qc.invalidateQueries({ queryKey: ["pk-invoices"] });
    qc.invalidateQueries({ queryKey: ["invoices"] });
  };
  const convert = useMutation({
    mutationFn: (inv: Invoice) => unwrap(convertProformaToInvoice(inv.id)),
    onSuccess: () => {
      invalidateInvoices();
      setConvertTarget(null);
    },
  });
  const storno = useMutation({
    mutationFn: (inv: Invoice) => unwrap(stornoAvansneFakture(inv.id)),
    onSuccess: () => {
      invalidateInvoices();
      setStornoTarget(null);
    },
  });

  const allInvoices = useMemo(() => invoices ?? [], [invoices]);
  const allRacuni = useMemo(() => racuni ?? [], [racuni]);

  // KPI: otvoreno sa obje strane + saldo, i PDV razlika za obveznike
  const openInvoices = allInvoices.filter((i) => i.status === "ISSUED");
  const openReceivable = openInvoices.reduce(
    (s, i) => s + Number(i.grossTotal),
    0,
  );
  const openRacuni = allRacuni.filter((r) => r.status === "OTVOREN");
  const openPayable = openRacuni.reduce((s, r) => s + Number(r.iznos), 0);
  const lateInvoices = openInvoices.filter(invoiceLate).length;
  const lateRacuni = openRacuni.filter(racunLate).length;
  const currentYear = String(new Date().getFullYear());
  // izlazni PDV: samo fakture (ne predračuni); storno/KO umanjuju (predznak)
  const pdvOut = allInvoices
    .filter(
      (i) =>
        i.type === "INVOICE" &&
        i.status !== "CANCELLED" &&
        i.issueDate?.startsWith(currentYear),
    )
    .reduce((s, i) => s + kifSign(i) * Number(i.vatTotal || 0), 0);
  const pdvIn = allRacuni
    .filter((r) => r.datumRacuna?.startsWith(currentYear))
    .reduce((s, r) => s + Number(r.pdvIznos || 0), 0);

  const visibleInvoices = statusFilter
    ? allInvoices.filter((i) => i.status === statusFilter)
    : allInvoices;
  const visibleRacuni =
    ulazFilter === "OTVOREN" || ulazFilter === "PLACEN"
      ? allRacuni.filter((r) => r.status === ulazFilter)
      : ulazFilter === "KASNI"
        ? allRacuni.filter(racunLate)
        : allRacuni;

  // "Sve": glavna knjiga dokumenata, hronološki (izlazne + ulazne zajedno)
  type LedgerRow =
    | { kind: "izlazna"; date: string; inv: Invoice }
    | { kind: "ulazna"; date: string; racun: UlazniRacun };
  const ledger: LedgerRow[] = useMemo(() => {
    const rows: LedgerRow[] = [
      ...allInvoices.map((inv) => ({
        kind: "izlazna" as const,
        date: inv.issueDate ?? "",
        inv,
      })),
      ...allRacuni.map((racun) => ({
        kind: "ulazna" as const,
        date: racun.datumRacuna ?? "",
        racun,
      })),
    ];
    rows.sort((a, b) => b.date.localeCompare(a.date));
    return rows;
  }, [allInvoices, allRacuni]);

  const tabCounts: Record<TabId, number> = {
    izlazne: allInvoices.length,
    ulazne: allRacuni.length,
    sve: allInvoices.length + allRacuni.length,
    prebijanja: (prebijanja ?? []).length,
  };

  const delPreb = useMutation({
    mutationFn: (p: Prebijanje) =>
      unwrap(deletePrebijanje(orgId as number, p.id)),
    onSuccess: () => {
      setDeletePrebTarget(null);
      // brisanje vraća fakture/račune u otvoreno i briše KPR stavke
      qc.invalidateQueries();
    },
  });

  async function handlePdf(inv: Invoice) {
    setDownloading(inv.id);
    try {
      await downloadInvoicePdf(inv.id, `Faktura-${inv.fullNumber}.pdf`);
    } finally {
      setDownloading(null);
    }
  }

  const loading = isLoading || racuniLoading;

  function markRacunPaid(r: UlazniRacun) {
    updateRacun.mutate({
      racunId: r.id,
      patch: { status: "PLACEN", paidAt: todayIso() },
    });
  }
  function reopenRacun(r: UlazniRacun) {
    updateRacun.mutate({ racunId: r.id, patch: { status: "OTVOREN" } });
  }

  return (
    <div className="px-6 py-6 max-w-[1280px] mx-auto">
      {/* Zaglavlje */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="inline-flex items-center gap-[7px] px-[11px] py-1 rounded-full bg-brand-100 text-brand-700 text-[12px] font-medium mb-3">
            <span className="w-[7px] h-[7px] rounded-full bg-brand-600" />
            Finansije
          </div>
          <h1 className="font-serif-display text-[28px] leading-tight text-text-primary mb-[5px]">
            Fakture.
          </h1>
          <p className="text-[13px] leading-6 text-text-tertiary max-w-[560px]">
            Izlazne fakture i ulazni računi dobavljača na jednom mjestu.
            Naplata i plaćanje se bilježe automatski potvrdom stavki na
            bankovnom izvodu.
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
          <Link
            href="/app/fakture/nova?vrsta=avansna"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
          >
            <IconPlus size={16} />
            Avansna faktura
          </Link>
          <Link
            href="/app/fakture/nova"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <IconPlus size={16} />
            Nova faktura
          </Link>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Kpi
          label="Njihov dug (fakture)"
          value={formatBAM(openReceivable)}
          sub={`${openInvoices.length} otvorenih${lateInvoices > 0 ? ` · ${lateInvoices} kasni` : ""}`}
          tone={openReceivable > 0 ? "success" : undefined}
        />
        <Kpi
          label="Naš dug (ulazni računi)"
          value={formatBAM(openPayable)}
          sub={`${openRacuni.length} otvorenih${lateRacuni > 0 ? ` · ${lateRacuni} kasni` : ""}`}
          tone={openPayable > 0 ? "warning" : undefined}
        />
        <Kpi
          label="Saldo otvorenog"
          value={formatBAM(openReceivable - openPayable)}
          sub="njihov dug minus naš dug"
          tone={openReceivable - openPayable < 0 ? "accent" : undefined}
        />
        {fullOrg?.isPdvObveznik && (
          <Kpi
            label={`PDV razlika (${currentYear}.)`}
            value={formatBAM(pdvOut - pdvIn)}
            sub={`izlazni ${formatBAM(pdvOut)} · ulazni ${formatBAM(pdvIn)}`}
          />
        )}
      </div>

      {/* Tabovi + filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-cream-300">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "inline-flex items-center gap-2 px-5 py-3 text-[14.5px] font-medium border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-text-tertiary hover:text-text-primary",
              ].join(" ")}
            >
              {t.label}
              <span
                className={[
                  "inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded-full text-[11.5px] tabular-nums",
                  tab === t.id
                    ? "bg-brand-100 text-brand-700"
                    : "bg-cream-200 text-text-tertiary",
                ].join(" ")}
              >
                {tabCounts[t.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="mb-1.5">
          {tab === "izlazne" && (
            <PkSelect
              ariaLabel="Status faktura"
              value={statusFilter}
              onChange={(v) => setStatusFilter(String(v ?? ""))}
              options={[
                { value: "", label: "Svi statusi" },
                { value: "ISSUED", label: "Izdane (nenaplaćene)" },
                { value: "PAID", label: "Naplaćene" },
                { value: "DRAFT", label: "Nacrti" },
                { value: "CANCELLED", label: "Stornirane" },
              ]}
            />
          )}
          {tab === "ulazne" && (
            <PkSelect
              ariaLabel="Status ulaznih računa"
              value={ulazFilter}
              onChange={(v) => setUlazFilter(String(v ?? ""))}
              options={[
                { value: "", label: "Svi statusi" },
                { value: "OTVOREN", label: "Otvoreni" },
                { value: "KASNI", label: "Kasne sa plaćanjem" },
                { value: "PLACEN", label: "Plaćeni" },
              ]}
            />
          )}
          {tab === "prebijanja" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCesijaOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors"
              >
                <IconPlus size={14} />
                Nova cesija
              </button>
              <button
                type="button"
                onClick={() => setKompOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity"
              >
                <IconPlus size={14} />
                Nova kompenzacija
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-xl bg-cream-100 border border-cream-300">
        {loading ? (
          <div className="px-4 py-12 text-center text-text-tertiary text-[13px]">
            Učitavanje...
          </div>
        ) : tab === "izlazne" && visibleInvoices.length === 0 ? (
          <EmptyBox
            title={`Nema faktura${statusFilter ? " za izabrani status" : ""}`}
            sub='Izdajte prvu fakturu klikom na "Nova faktura". Naplata se kasnije veže automatski sa bankovnog izvoda.'
          />
        ) : tab === "ulazne" && visibleRacuni.length === 0 ? (
          <EmptyBox
            title={`Nema ulaznih računa${ulazFilter ? " za izabrani filter" : ""}`}
            sub='Proknjižite fakturu dobavljača klikom na "Proknjiži ulazni račun"; plaćanje se veže automatski sa izvoda.'
          />
        ) : tab === "sve" && ledger.length === 0 ? (
          <EmptyBox
            title="Još nema dokumenata"
            sub="Ovdje se hronološki vide izlazne fakture i ulazni računi zajedno."
          />
        ) : tab === "prebijanja" && (prebijanja ?? []).length === 0 ? (
          <EmptyBox
            title="Još nema kompenzacija ni cesija"
            sub="Zatvaranje kupaca i dobavljača bez novca: kompenzacija prebija dug sa istim partnerom, cesija preko trećeg. Knjiženje ide u KPR automatski."
          />
        ) : tab === "prebijanja" ? (
          <ul>
            {(prebijanja ?? []).map((p, i) => (
              <PrebijanjeRow
                key={p.id}
                p={p}
                last={i === (prebijanja ?? []).length - 1}
                onDelete={setDeletePrebTarget}
              />
            ))}
          </ul>
        ) : (
          <ul>
            {tab === "izlazne" &&
              visibleInvoices.map((inv, i) => (
                <InvoiceRow
                  key={inv.id}
                  inv={inv}
                  last={i === visibleInvoices.length - 1}
                  downloading={downloading}
                  markPending={markPaid.isPending}
                  onMarkPaid={(x) => markPaid.mutate(x)}
                  onPdf={handlePdf}
                  onOpen={(x) => setPreviewId(x.id)}
                  onConvert={setConvertTarget}
                  onStorno={setStornoTarget}
                  onKnjizna={setKoTarget}
                  onCopy={setCopyTarget}
                />
              ))}
            {tab === "ulazne" &&
              visibleRacuni.map((r, i) => (
                <RacunRow
                  key={r.id}
                  r={r}
                  last={i === visibleRacuni.length - 1}
                  updatePending={updateRacun.isPending}
                  onMarkPaid={markRacunPaid}
                  onReopen={reopenRacun}
                  onDelete={setDeleteRacunTarget}
                  onOpen={setRacunEdit}
                />
              ))}
            {tab === "sve" &&
              ledger.map((row, i) =>
                row.kind === "izlazna" ? (
                  <InvoiceRow
                    key={`i-${row.inv.id}`}
                    inv={row.inv}
                    last={i === ledger.length - 1}
                    downloading={downloading}
                    markPending={markPaid.isPending}
                    onMarkPaid={(x) => markPaid.mutate(x)}
                    onPdf={handlePdf}
                    onOpen={(x) => setPreviewId(x.id)}
                    onConvert={setConvertTarget}
                    onStorno={setStornoTarget}
                    onKnjizna={setKoTarget}
                    onCopy={setCopyTarget}
                  />
                ) : (
                  <RacunRow
                    key={`u-${row.racun.id}`}
                    r={row.racun}
                    last={i === ledger.length - 1}
                    updatePending={updateRacun.isPending}
                    onMarkPaid={markRacunPaid}
                    onReopen={reopenRacun}
                    onDelete={setDeleteRacunTarget}
                    onOpen={setRacunEdit}
                  />
                ),
              )}
          </ul>
        )}
      </div>

      {/* Potvrda brisanja ulaznog računa */}
      <Modal
        open={deleteRacunTarget != null}
        onClose={() => setDeleteRacunTarget(null)}
        title="Brisanje ulaznog računa"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteRacunTarget(null)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={deleteRacun.isPending}
              onClick={() => {
                if (!deleteRacunTarget) return;
                deleteRacun.mutate(deleteRacunTarget.id, {
                  onSuccess: () => setDeleteRacunTarget(null),
                });
              }}
              className="px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Obriši račun
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-6 text-text-secondary">
          Obrisati račun{" "}
          <span className="font-semibold text-text-primary">
            {deleteRacunTarget?.brojRacuna}
          </span>{" "}
          dobavljača{" "}
          <span className="font-semibold text-text-primary">
            {deleteRacunTarget?.partner?.name ?? ""}
          </span>
          ? Transakcije sa izvoda ostaju netaknute.
        </p>
      </Modal>

      {/* Potvrda brisanja kompenzacije/cesije */}
      <Modal
        open={deletePrebTarget != null}
        onClose={() => setDeletePrebTarget(null)}
        title={`Brisanje: ${deletePrebTarget?.broj ?? ""}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeletePrebTarget(null)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={delPreb.isPending}
              onClick={() => {
                if (deletePrebTarget) delPreb.mutate(deletePrebTarget);
              }}
              className="px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Obriši
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-6 text-text-secondary">
          Brisanjem se uklanjaju KPR stavke ovog prebijanja, a obuhvaćene
          fakture i ulazni računi se vraćaju u otvoreno. Nastaviti?
        </p>
      </Modal>

      {/* Kompenzacija / cesija */}
      {kompOpen && orgId != null && (
        <KompenzacijaModal
          key={`komp-${orgId}`}
          orgId={orgId}
          orgName={fullOrg?.name ?? activeOrg?.name ?? ""}
          onClose={() => setKompOpen(false)}
        />
      )}
      {cesijaOpen && orgId != null && (
        <CesijaModal
          key={`cesija-${orgId}`}
          orgId={orgId}
          orgName={fullOrg?.name ?? activeOrg?.name ?? ""}
          orgJib={fullOrg?.taxNumber ?? ""}
          orgOwnerName={
            fullOrg?.owner?.name ||
            [fullOrg?.owner?.firstName, fullOrg?.owner?.lastName]
              .filter(Boolean)
              .join(" ")
          }
          orgCity={fullOrg?.city ?? ""}
          onClose={() => setCesijaOpen(false)}
        />
      )}

      {/* Knjiženje ulaznog računa */}
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

      {/* Pregled izlazne fakture (bez PDF-a) */}
      <InvoicePreviewModal
        invoiceId={previewId}
        onClose={() => setPreviewId(null)}
        onOpenPdf={(id) => {
          const inv = allInvoices.find((x) => x.id === id);
          if (inv) handlePdf(inv);
        }}
        isPdvObveznik={Boolean(fullOrg?.isPdvObveznik)}
        orgJurisdiction={fullOrg?.jurisdiction ?? null}
        orgId={orgId}
      />

      {/* Otvaranje/izmjena knjiženja ulaznog računa */}
      <UlazniRacunModal
        orgId={orgId}
        open={racunEdit != null}
        onClose={() => setRacunEdit(null)}
        editRacun={racunEdit}
        isPdvObveznik={Boolean(fullOrg?.isPdvObveznik)}
        orgJurisdiction={fullOrg?.jurisdiction ?? null}
      />

      {/* "+ Novi partner" iz knjiženja: po snimanju vrati na knjiženje */}
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

      {/* Pretvaranje predračuna u fakturu */}
      <Modal
        open={convertTarget != null}
        onClose={() => setConvertTarget(null)}
        title="Pretvoriti predračun u fakturu?"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConvertTarget(null)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={convert.isPending}
              onClick={() => convertTarget && convert.mutate(convertTarget)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {convert.isPending && (
                <IconLoader2 size={15} className="animate-spin" />
              )}
              Pretvori u fakturu
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-6 text-text-secondary">
          Predračun{" "}
          <span className="font-semibold text-text-primary">
            {convertTarget?.fullNumber}
          </span>{" "}
          ({formatBAM(Number(convertTarget?.grossTotal ?? 0))}) dobiće novu
          fakturu sa današnjim datumom i sljedećim F- brojem; stavke i kupac
          se prenose. Predračun se označava iskorištenim.
        </p>
      </Modal>

      {/* Storno avansne fakture */}
      <Modal
        open={stornoTarget != null}
        onClose={() => setStornoTarget(null)}
        title="Stornirati avansnu fakturu?"
        footer={
          <>
            <button
              type="button"
              onClick={() => setStornoTarget(null)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={storno.isPending}
              onClick={() => stornoTarget && storno.mutate(stornoTarget)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {storno.isPending && (
                <IconLoader2 size={15} className="animate-spin" />
              )}
              Storniraj avans
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-6 text-text-secondary">
          Za avansnu fakturu{" "}
          <span className="font-semibold text-text-primary">
            {stornoTarget?.fullNumber}
          </span>{" "}
          ({formatBAM(Number(stornoTarget?.grossTotal ?? 0))}) izdaje se
          storno dokument sa istim iznosima koji u KIF i PDV prijavu ulazi
          NEGATIVNO. Radi se tipično kad izdate konačnu fakturu za posao.
          Svaka avansna se može stornirati samo jednom.
        </p>
      </Modal>

      {/* Knjižna obavijest uz fakturu */}
      <KnjiznaObavijestModal
        invoice={koTarget}
        onClose={() => setKoTarget(null)}
      />

      {/* Kopiranje fakture/predračuna */}
      <KopirajFakturuModal
        invoice={copyTarget}
        org={fullOrg ?? null}
        partners={partners ?? []}
        onClose={() => setCopyTarget(null)}
      />
    </div>
  );
}

// Red knjižene kompenzacije/cesije: strane, iznos, obuhvaćene stavke, brisanje.
function PrebijanjeRow({
  p,
  last,
  onDelete,
}: {
  p: Prebijanje;
  last: boolean;
  onDelete: (p: Prebijanje) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const strane =
    p.type === "KOMPENZACIJA"
      ? (p.partner?.name ?? "–")
      : `${p.cesus?.name ?? "–"} → ${p.cesionar?.name ?? "–"}`;
  return (
    <li
      className={`px-4 py-3 ${last ? "" : "border-b border-cream-300/70"}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          className={[
            "inline-flex px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold tracking-[0.04em]",
            p.type === "KOMPENZACIJA"
              ? "bg-success-bg text-success"
              : "bg-info-bg text-info",
          ].join(" ")}
        >
          {p.type === "KOMPENZACIJA" ? "KOMPENZACIJA" : "CESIJA"}
        </span>
        <span className="text-[13.5px] font-medium text-text-primary">
          {p.broj}
        </span>
        <span className="text-[12.5px] text-text-tertiary tabular-nums">
          {formatDate(p.datum)}
        </span>
        <span className="text-[13px] text-text-secondary flex-1 min-w-[160px] truncate">
          {strane}
        </span>
        <span className="text-[13.5px] font-semibold tabular-nums text-text-primary">
          {formatBAM(Number(p.iznos))}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[12px] text-brand-700 hover:underline"
        >
          {expanded ? "Sakrij stavke" : `Stavke (${p.stavke.length})`}
        </button>
        <button
          type="button"
          onClick={() => onDelete(p)}
          aria-label="Obriši prebijanje"
          title="Obriši (vraća stavke u otvoreno)"
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-cream-300 text-danger hover:bg-danger-bg transition-colors"
        >
          <IconTrash size={14} />
        </button>
      </div>
      {p.napomena && (
        <p className="text-[12px] text-text-tertiary mt-1">{p.napomena}</p>
      )}
      {expanded && (
        <div className="mt-2 rounded-lg border border-cream-300 overflow-hidden">
          {p.stavke.map((s, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-x-3 px-3 py-1.5 text-[12.5px] border-b border-cream-300/60 last:border-0"
            >
              <span className="flex-1 min-w-[200px] text-text-secondary truncate">
                {s.description || "–"}
              </span>
              <span
                className={`tabular-nums ${
                  s.direction === "IN" ? "text-success" : "text-text-primary"
                }`}
              >
                {s.direction === "IN" ? "+" : "-"}
                {formatBAM(Number(s.amount))}
              </span>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

function EmptyBox({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <span className="w-12 h-12 rounded-full bg-cream-200 text-text-tertiary inline-flex items-center justify-center mb-3">
        <IconInbox size={22} />
      </span>
      <p className="text-[14px] font-medium text-text-primary">{title}</p>
      <p className="text-[12.5px] text-text-tertiary mt-1 max-w-[420px] mx-auto">
        {sub}
      </p>
    </div>
  );
}
