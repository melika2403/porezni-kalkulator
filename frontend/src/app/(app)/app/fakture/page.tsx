"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconFileInvoice,
  IconDownload,
  IconCircleCheck,
  IconAlertCircle,
  IconArrowsExchange,
  IconMail,
  IconPlus,
  IconInbox,
  IconSearch,
  IconLoader2,
  IconReceipt,
  IconTrash,
  IconRotate,
  IconPencil,
  IconRepeat,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBAM, formatDate } from "src/lib/format";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { HelpButton } from "src/components/app-shell/HelpButton";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { Modal } from "src/components/app-shell/Modal";
import { ConfirmModal } from "src/components/app-shell/ConfirmModal";
import RowActionsMenu from "src/components/RowActionsMenu/RowActionsMenu";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { useOrgInvoices } from "src/hooks/useBankStatements";
import { parseDateInput } from "src/lib/dateInput";
import { searchBankTransactions } from "src/api/bankStatements";
import {
  usePartners,
  useUlazniRacuni,
  useUpdateUlazniRacun,
  useDeleteUlazniRacun,
} from "src/hooks/usePartners";
import {
  convertProformaToInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  emailInvoice,
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
import { PripremljeniRacuniModal } from "src/sections/fakture/PripremljeniRacuniModal";
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

// lokalni datum (ne UTC): toISOString bi nakon lokalne ponoći dao jučer
const todayIso = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function invoiceLate(inv: Invoice): boolean {
  return inv.status === "ISSUED" && !!inv.dueDate && inv.dueDate < todayIso();
}
// izvedeni status naplate (FIFO sa izvoda) ima prednost nad zapamćenim
function racunEffStatus(r: UlazniRacun): string {
  return r.paymentStatus ?? r.status;
}
// koliko još treba platiti (preostalo iz FIFO, fallback pun iznos ako otvoren)
function racunPreostalo(r: UlazniRacun): number {
  if (r.preostalo != null) return r.preostalo;
  const st = racunEffStatus(r);
  return st === "PLACEN" || st === "KREDIT" ? 0 : Number(r.iznos);
}
function racunLate(r: UlazniRacun): boolean {
  const st = racunEffStatus(r);
  return (
    (st === "OTVOREN" || st === "DJELIMICNO") &&
    !!r.rokPlacanja &&
    r.rokPlacanja < todayIso()
  );
}

// "rok 06.08.2026. (za 27 d)" ili "(kasni 3 d)": broj dana uz rok
function rokSaDanima(rokIso: string, otvoreno: boolean): string {
  const rok = `rok ${formatDate(rokIso)}`;
  if (!otvoreno) return rok;
  const end = new Date(`${rokIso.slice(0, 10)}T00:00:00`);
  const today = new Date(`${todayIso()}T00:00:00`);
  const dana = Math.round((end.getTime() - today.getTime()) / 86400000);
  if (dana === 0) return `${rok} (ističe danas)`;
  return dana > 0 ? `${rok} (za ${dana} d)` : `${rok} (kasni ${-dana} d)`;
}

// "DD.MM.GGGG." za PkDateInput (brzi periodi)
function fmtDisplay(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}.`;
}

function periodRange(kind: "mjesec" | "prosli" | "godina"): [string, string] {
  const now = new Date();
  if (kind === "mjesec") {
    return [
      fmtDisplay(new Date(now.getFullYear(), now.getMonth(), 1)),
      fmtDisplay(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    ];
  }
  if (kind === "prosli") {
    return [
      fmtDisplay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      fmtDisplay(new Date(now.getFullYear(), now.getMonth(), 0)),
    ];
  }
  return [
    fmtDisplay(new Date(now.getFullYear(), 0, 1)),
    fmtDisplay(new Date(now.getFullYear(), 11, 31)),
  ];
}

const MJESECI = [
  "januar", "februar", "mart", "april", "maj", "juni",
  "juli", "august", "septembar", "oktobar", "novembar", "decembar",
];

// "juli 2026." iz ISO datuma, za mjesečne podnaslove na tabu "Sve"
function mjesecLabel(iso: string): string {
  const m = Number(iso.slice(5, 7));
  const y = iso.slice(0, 4);
  return m >= 1 && m <= 12 ? `${MJESECI[m - 1]} ${y}.` : "bez datuma";
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
  const st = racunEffStatus(r);
  if (st === "PLACEN") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-success-bg text-success shrink-0">
        <IconCircleCheck size={11} /> plaćen
      </span>
    );
  }
  if (st === "DJELIMICNO") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium bg-info-bg text-info shrink-0"
        title={
          r.preostalo != null
            ? `Preostalo za platiti: ${formatBAM(r.preostalo)}`
            : undefined
        }
      >
        djelimično
        {r.preostalo != null ? ` · ostalo ${formatBAM(r.preostalo)}` : ""}
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
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "warning" | "accent";
  /** klik na karticu prebaci tab/filter na odgovarajuću listu */
  onClick?: () => void;
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "accent"
          ? "text-accent-500"
          : "text-text-primary";
  const inner = (
    <>
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
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="bg-cream-100 border border-cream-300 rounded-xl p-[18px] text-left cursor-pointer hover:border-text-tertiary transition-colors"
      >
        {inner}
      </button>
    );
  }
  return (
    <div className="bg-cream-100 border border-cream-300 rounded-xl p-[18px]">
      {inner}
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
  PDV_EVIDENCIJA: "PDV evidencija",
};

function InvoiceRow({
  inv,
  last,
  downloading,
  markPending,
  onMarkPaid,
  onUnmarkPaid,
  onPdf,
  onOpen,
  onConvert,
  onStorno,
  onKnjizna,
  onCopy,
  onEdit,
  onDelete,
  onCancel,
  onEmail,
  uplataPrijedlog,
}: {
  inv: Invoice;
  last: boolean;
  downloading: number | null;
  markPending: boolean;
  onMarkPaid: (inv: Invoice) => void;
  onUnmarkPaid: (inv: Invoice) => void;
  onPdf: (inv: Invoice) => void;
  onOpen: (inv: Invoice) => void;
  onConvert: (inv: Invoice) => void;
  onStorno: (inv: Invoice) => void;
  onKnjizna: (inv: Invoice) => void;
  onCopy: (inv: Invoice) => void;
  onEdit: (inv: Invoice) => void;
  onDelete: (inv: Invoice) => void;
  onCancel: (inv: Invoice) => void;
  onEmail?: (inv: Invoice, podsjetnik: boolean) => void;
  /** nepovezan priliv istog iznosa na izvodu: prijedlog naplate */
  uplataPrijedlog?: { statementId: number; broj: string | null } | null;
}) {
  // storno avansne i knjižne obavijesti se prikazuju negativno
  const sign = kifSign(inv);
  const isProforma = inv.type === "PROFORMA";
  const menuItems = [
    // puni edit: samo nenaplaćena standardna faktura/predračun koji nije
    // pretvoren (backend dodatno odbija ako ima knjižnu obavijest)
    ...(inv.docType === "STANDARD" &&
    (inv.status === "ISSUED" || inv.status === "DRAFT") &&
    !inv.convertedToInvoiceId
      ? [
          {
            kind: "item" as const,
            key: "edit",
            label: "Uredi",
            icon: <IconPencil size={14} />,
            onClick: () => onEdit(inv),
          },
        ]
      : []),
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
    // slanje kupcu emailom (PDF u prilogu); podsjetnik samo za nenaplaćene
    ...(onEmail &&
    inv.docType === "STANDARD" &&
    (inv.status === "ISSUED" || inv.status === "PAID")
      ? [
          {
            kind: "item" as const,
            key: "email",
            label: "Pošalji kupcu emailom",
            icon: <IconMail size={14} />,
            onClick: () => onEmail(inv, false),
          },
        ]
      : []),
    ...(onEmail && inv.docType === "STANDARD" && inv.status === "ISSUED"
      ? [
          {
            kind: "item" as const,
            key: "podsjetnik",
            label: "Pošalji podsjetnik za plaćanje",
            icon: <IconMail size={14} />,
            onClick: () => onEmail(inv, true),
          },
        ]
      : []),
    // storniranje standardne fakture: status CANCELLED, broj ostaje (bez
    // rupe u numeraciji), izlazi iz KIF-a, PDV prijave i kartice kupca
    ...(inv.docType === "STANDARD" &&
    (inv.status === "ISSUED" || inv.status === "DRAFT") &&
    !inv.convertedToInvoiceId
      ? [
          {
            kind: "item" as const,
            key: "cancel",
            label: "Storniraj",
            onClick: () => onCancel(inv),
          },
        ]
      : []),
    // brisanje: samo nenaplaćena standardna faktura/predračun koji nije
    // pretvoren (upozorenje na prazninu u numeraciji je u modalu potvrde)
    ...(inv.docType === "STANDARD" &&
    (inv.status === "ISSUED" || inv.status === "DRAFT") &&
    !inv.convertedToInvoiceId
      ? [
          {
            kind: "item" as const,
            key: "delete",
            label: "Obriši",
            icon: <IconTrash size={14} />,
            onClick: () => onDelete(inv),
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
            inv.dueDate
              ? rokSaDanima(inv.dueDate, inv.status === "ISSUED")
              : null,
            inv.docType === "STANDARD" && inv.paidAt
              ? `naplaćena ${formatDate(inv.paidAt)}`
              : null,
            inv.emailSentAt ? `email poslan ${formatDate(inv.emailSentAt)}` : null,
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
        {/* nepovezan priliv istog iznosa na izvodu: prijedlog naplate */}
        {uplataPrijedlog && inv.status === "ISSUED" && (
          <Link
            href={`/app/bankovni-izvodi/${uplataPrijedlog.statementId}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11.5px] font-medium bg-info-bg text-info hover:opacity-80 transition-opacity"
            title="Na izvodu postoji nepovezan priliv istog iznosa: otvorite izvod i povežite uplatu sa fakturom"
          >
            <IconAlertCircle size={11} />
            {uplataPrijedlog.broj
              ? `moguća uplata na izvodu br. ${uplataPrijedlog.broj}`
              : "moguća uplata na izvodu"}
          </Link>
        )}
      </div>
      <span className="text-[13.5px] font-semibold tabular-nums whitespace-nowrap">
        {inv.currency === "EUR"
          ? formatBAM(sign * Number(inv.grossTotal)).replace(/KM$/, "EUR")
          : formatBAM(sign * Number(inv.grossTotal))}
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
        {inv.status === "PAID" && inv.docType === "STANDARD" && (
          <button
            type="button"
            disabled={markPending}
            onClick={() => onUnmarkPaid(inv)}
            title="Vrati u nenaplaćeno (poništi ručnu oznaku naplate)"
            className="px-3 py-[5px] rounded-lg border border-cream-300 text-text-tertiary text-[12px] font-medium hover:bg-cream-200 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            Nenaplaćena
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

// sortiranje liste ulaznih računa po izboru korisnika
function sortRacuni(list: UlazniRacun[], key: string): UlazniRacun[] {
  const arr = [...list];
  const dat = (r: UlazniRacun) => (r.datumRacuna ?? "").slice(0, 10);
  const rok = (r: UlazniRacun) => (r.rokPlacanja ?? "").slice(0, 10);
  switch (key) {
    case "datum-asc":
      return arr.sort((a, b) => dat(a).localeCompare(dat(b)));
    case "rok-asc":
      // prazni rokovi na kraj, inače najbliži/istekli prvi
      return arr.sort((a, b) => {
        const ra = rok(a);
        const rb = rok(b);
        if (!ra && !rb) return 0;
        if (!ra) return 1;
        if (!rb) return -1;
        return ra.localeCompare(rb);
      });
    case "iznos-desc":
      return arr.sort((a, b) => Number(b.iznos) - Number(a.iznos));
    case "iznos-asc":
      return arr.sort((a, b) => Number(a.iznos) - Number(b.iznos));
    case "dobavljac":
      return arr.sort((a, b) =>
        (a.partner?.name ?? "").localeCompare(b.partner?.name ?? ""),
      );
    case "datum-desc":
    default:
      return arr.sort((a, b) => dat(b).localeCompare(dat(a)));
  }
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
            r.rokPlacanja
              ? rokSaDanima(
                  r.rokPlacanja,
                  racunPreostalo(r) > 0 && !r.samoEvidencija,
                )
              : null,
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
        {(racunEffStatus(r) === "OTVOREN" ||
          racunEffStatus(r) === "DJELIMICNO") &&
          !r.samoEvidencija && (
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const [tab, setTab] = useState<TabId>("izlazne");
  const [statusFilter, setStatusFilter] = useState("");
  const [ulazFilter, setUlazFilter] = useState("");
  const [racunSort, setRacunSort] = useState("datum-desc");
  // pretraga + partner + period (klijentski, nad već učitanim listama)
  const [q, setQ] = useState("");
  // ?q= iz linka (npr. red kartice partnera vodi na konkretnu fakturu)
  useEffect(() => {
    const initQ = searchParams.get("q");
    if (initQ) setQ(initQ);
    const initTab = searchParams.get("tab");
    if (initTab && TABS.some((t) => t.id === initTab)) {
      setTab(initTab as TabId);
    }
  }, [searchParams]);
  // ?status= iz linka (KPI "Otvorene fakture" na Početnoj); reagira i na
  // promjenu query stringa bez remounta (drugi ulaz dok si već ovdje)
  useEffect(() => {
    const s = searchParams.get("status");
    if (!s) return;
    const t = setTimeout(() => setStatusFilter(s), 0);
    return () => clearTimeout(t);
  }, [searchParams]);
  const [partnerFilter, setPartnerFilter] = useState<number | null>(null);
  const [fromStr, setFromStr] = useState("");
  const [toStr, setToStr] = useState("");
  // email kupcu / podsjetnik za plaćanje
  const [emailTarget, setEmailTarget] = useState<{
    inv: Invoice;
    podsjetnik: boolean;
  } | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [deleteRacunTarget, setDeleteRacunTarget] =
    useState<UlazniRacun | null>(null);
  // brisanje izlazne fakture (samo nenaplaćene, uz upozorenje na numeraciju)
  const [deleteInvoiceTarget, setDeleteInvoiceTarget] =
    useState<Invoice | null>(null);
  // storniranje standardne fakture (status CANCELLED, broj ostaje)
  const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null);
  // poruka greške u PK modalu umjesto window.alert
  const [obavijest, setObavijest] = useState<string | null>(null);
  // pripremljeni (ponavljajući) računi
  const [preparedOpen, setPreparedOpen] = useState(false);
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
  const [prebPdfBusy, setPrebPdfBusy] = useState<number | null>(null);

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
  // vraćanje naplaćene fakture u nenaplaćeno (poništi ručnu oznaku)
  const unmarkPaid = useMutation({
    mutationFn: (inv: Invoice) =>
      unwrap(patchInvoice(inv.id, { status: "ISSUED", paidAt: null })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-invoices", orgId] });
    },
    onError: (e) => {
      const code = (e as Error).message;
      setObavijest(
        code === "IMA_VEZANU_UPLATU"
          ? "Faktura je zatvorena uplatom sa bankovnog izvoda. Prvo ukloni vezu s tom uplatom na izvodu, pa je onda vrati u nenaplaćeno."
          : "Nije moguće vratiti fakturu u nenaplaćeno.",
      );
    },
  });
  const invalidateInvoices = () => {
    qc.invalidateQueries({ queryKey: ["pk-invoices"] });
    qc.invalidateQueries({ queryKey: ["invoices"] });
  };
  const deleteInvoiceMut = useMutation({
    mutationFn: (inv: Invoice) => unwrap(deleteInvoice(inv.id)),
    onSuccess: () => {
      invalidateInvoices();
      setDeleteInvoiceTarget(null);
    },
  });
  const cancelInvoice = useMutation({
    mutationFn: (inv: Invoice) =>
      unwrap(patchInvoice(inv.id, { status: "CANCELLED" })),
    onSuccess: () => {
      invalidateInvoices();
      setCancelTarget(null);
    },
  });
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
  const openRacuni = allRacuni.filter((r) => {
    const st = racunEffStatus(r);
    return st === "OTVOREN" || st === "DJELIMICNO";
  });
  const openPayable = openRacuni.reduce((s, r) => s + racunPreostalo(r), 0);
  const lateInvoicesList = openInvoices.filter(invoiceLate);
  const lateRacuniList = openRacuni.filter(racunLate);
  const lateInvoices = lateInvoicesList.length;
  const lateRacuni = lateRacuniList.length;
  // dospjelo = otvoreno kojem je rok već prošao (to se stvarno naplaćuje)
  const lateReceivable = lateInvoicesList.reduce(
    (s, i) => s + Number(i.grossTotal),
    0,
  );
  const latePayable = lateRacuniList.reduce((s, r) => s + racunPreostalo(r), 0);
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

  // ── zajednički filteri: pretraga, partner, period ──────────────────────
  const fromIso = parseDateInput(fromStr);
  const toIso = parseDateInput(toStr);
  const needle = q.trim().toLowerCase();
  const partnerName = partnerFilter
    ? ((partners ?? []).find((p) => p.id === partnerFilter)?.name ?? null)
    : null;

  // normalizacija naziva za poređenje: skida razmake, tačke, zareze, crtice,
  // pa "SF PHARM DOO" == "SF PHARM d.o.o." (fakture nemaju partnerId, vežu
  // se po nazivu kupca koji ne mora biti identičan nazivu partnera)
  const normNaziv = (s: string | null | undefined) =>
    (s ?? "").toLowerCase().replace(/[\s.,\-]/g, "");
  const partnerNorm = partnerName ? normNaziv(partnerName) : "";

  function invoiceMatches(i: Invoice): boolean {
    if (needle) {
      const hit =
        i.fullNumber.toLowerCase().includes(needle) ||
        (i.buyerName ?? "").toLowerCase().includes(needle) ||
        String(Number(i.grossTotal).toFixed(2)).includes(needle.replace(",", "."));
      if (!hit) return false;
    }
    // veza po normalizovanom nazivu kupca (jednakost ili podniz u oba smjera,
    // da uhvati "SF PHARM" partner vs "SF PHARM DOO Sarajevo" na fakturi)
    if (partnerNorm) {
      const a = normNaziv(i.buyerName);
      // prazan naziv kupca nikad ne poklapa stvarnog partnera
      if (!a || !(a === partnerNorm || a.includes(partnerNorm) || partnerNorm.includes(a))) {
        return false;
      }
    }
    const d = (i.issueDate ?? "").slice(0, 10);
    if (fromIso && d < fromIso) return false;
    if (toIso && d > toIso) return false;
    return true;
  }

  function racunMatches(r: UlazniRacun): boolean {
    if (needle) {
      const hit =
        (r.brojRacuna ?? "").toLowerCase().includes(needle) ||
        (r.partner?.name ?? "").toLowerCase().includes(needle) ||
        String(Number(r.iznos).toFixed(2)).includes(needle.replace(",", "."));
      if (!hit) return false;
    }
    if (partnerFilter && r.partner?.id !== partnerFilter) return false;
    const d = (r.datumRacuna ?? "").slice(0, 10);
    if (fromIso && d < fromIso) return false;
    if (toIso && d > toIso) return false;
    return true;
  }

  const aktivanPeriod = (["mjesec", "prosli", "godina"] as const).find((k) => {
    const [od, dod] = periodRange(k);
    return fromStr === od && toStr === dod;
  });

  function primijeniPeriod(kind: "mjesec" | "prosli" | "godina" | "sve") {
    if (kind === "sve") {
      setFromStr("");
      setToStr("");
      return;
    }
    const [od, dod] = periodRange(kind);
    setFromStr(od);
    setToStr(dod);
  }

  const visibleInvoices = (
    statusFilter === "KASNI"
      ? allInvoices.filter(invoiceLate)
      : statusFilter
        ? allInvoices.filter((i) => i.status === statusFilter)
        : allInvoices
  ).filter(invoiceMatches);
  const visibleRacuni = sortRacuni(
    (ulazFilter === "OTVOREN"
      ? allRacuni.filter((r) => {
          const st = racunEffStatus(r);
          return st === "OTVOREN" || st === "DJELIMICNO";
        })
      : ulazFilter === "PLACEN"
        ? allRacuni.filter((r) => racunEffStatus(r) === "PLACEN")
        : ulazFilter === "KASNI"
          ? allRacuni.filter(racunLate)
          : allRacuni
    ).filter(racunMatches),
    racunSort,
  );

  // sume za filtrirano (po tabu), da lista radi i kao brzi izvještaj
  const invSume = useMemo(() => {
    let ukupno = 0;
    let naplaceno = 0;
    let otvoreno = 0;
    for (const i of visibleInvoices) {
      if (i.status === "CANCELLED" || i.type === "PROFORMA") continue;
      const iznos = kifSign(i) * Number(i.grossTotal);
      ukupno += iznos;
      if (i.status === "PAID" && i.docType === "STANDARD") naplaceno += iznos;
      if (i.status === "ISSUED") otvoreno += iznos;
    }
    return { ukupno, naplaceno, otvoreno };
  }, [visibleInvoices]);
  const racSume = useMemo(() => {
    let ukupno = 0;
    let placeno = 0;
    let otvoreno = 0;
    for (const r of visibleRacuni) {
      const iznos = Number(r.iznos);
      ukupno += iznos;
      // placeno = dio koji je pokriven (iznos - preostalo), otvoreno = preostalo
      const preostalo = racunPreostalo(r);
      placeno += iznos - preostalo;
      otvoreno += preostalo;
    }
    return { ukupno, placeno, otvoreno };
  }, [visibleRacuni]);

  // "Sve": glavna knjiga dokumenata, hronološki (izlazne + ulazne zajedno)
  type LedgerRow =
    | { kind: "izlazna"; date: string; inv: Invoice }
    | { kind: "ulazna"; date: string; racun: UlazniRacun };
  const ledger: LedgerRow[] = useMemo(() => {
    const rows: LedgerRow[] = [
      ...allInvoices.filter(invoiceMatches).map((inv) => ({
        kind: "izlazna" as const,
        date: inv.issueDate ?? "",
        inv,
      })),
      ...allRacuni.filter(racunMatches).map((racun) => ({
        kind: "ulazna" as const,
        date: racun.datumRacuna ?? "",
        racun,
      })),
    ];
    rows.sort((a, b) => b.date.localeCompare(a.date));
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allInvoices, allRacuni, needle, partnerFilter, partnerName, fromIso, toIso]);

  // nepovezani prilivi sa izvoda → prijedlog naplate za izdane fakture
  const { data: prilivi } = useQuery({
    queryKey: ["bank-statements", orgId, "prilivi-za-fakture"],
    queryFn: () =>
      unwrap(
        searchBankTransactions(orgId as number, { direction: "IN", limit: 500 }),
      ),
    enabled: orgId != null,
  });
  const uplataPrijedlozi = useMemo(() => {
    const map = new Map<number, { statementId: number; broj: string | null }>();
    // svaki priliv se troši: jedan priliv ne smije biti prijedlog za više
    // faktura istog iznosa (npr. dvije fakture po 1.170 a jedna uplata)
    const slobodni = (prilivi?.items ?? []).filter((t) => t.invoiceId == null);
    const iskorišteni = new Set<number>();
    for (const inv of allInvoices) {
      if (inv.status !== "ISSUED" || inv.docType !== "STANDARD") continue;
      const tx = slobodni.find(
        (t) =>
          !iskorišteni.has(t.id) &&
          Math.abs(Number(t.amount) - Number(inv.grossTotal)) < 0.005,
      );
      if (tx) {
        iskorišteni.add(tx.id);
        map.set(inv.id, {
          statementId: tx.statementId,
          broj: tx.statement?.statementNumber ?? null,
        });
      }
    }
    return map;
  }, [prilivi, allInvoices]);

  // prijedlozi prebijanja: partneri sa otvorenim stavkama na OBJE strane
  const prebijanjePrijedlozi = useMemo(
    () =>
      (partners ?? [])
        .filter(
          (p) => p.stats.openInvoicesTotal > 0 && p.stats.openPayablesTotal > 0,
        )
        .map((p) => ({
          partner: p,
          iznos: Math.min(
            p.stats.openInvoicesTotal,
            p.stats.openPayablesTotal,
          ),
        }))
        .sort((a, b) => b.iznos - a.iznos),
    [partners],
  );
  const [kompPartnerId, setKompPartnerId] = useState<number | null>(null);

  const tabCounts: Record<TabId, number> = {
    izlazne: allInvoices.length,
    ulazne: allRacuni.length,
    sve: allInvoices.length + allRacuni.length,
    prebijanja: (prebijanja ?? []).length,
  };

  const sendEmail = useMutation({
    mutationFn: (args: { id: number; to: string; message: string }) =>
      unwrap(emailInvoice(args.id, { to: args.to, message: args.message })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-invoices", orgId] });
      setEmailTarget(null);
    },
  });

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

  // PDF prebijanja se regeneriše iz snimljenih podataka (stavke sa smjerom,
  // partneri, org), pa je štampa uvijek dostupna, ne samo u momentu knjiženja.
  async function handlePrebijanjePdf(p: Prebijanje) {
    setPrebPdfBusy(p.id);
    try {
      const { collapseStavke, formatBroj, iznosUSlova } = await import(
        "src/sections/cesije-i-kompenzacije/money"
      );
      const orgName = fullOrg?.name ?? activeOrg?.name ?? "";
      // PDF prikazuje CIJELE dokumente (punIznos), nikad djelimično alocirane
      // iznose: kompenzuje se manji zbir, a razlika ide u "nekompenzirani
      // ostatak uplatiti na žiro račun" (računa je sam generator).
      const stavke = (dir: "IN" | "OUT") =>
        p.stavke
          .filter((s) => s.direction === dir)
          .map((s) => ({
            opis: s.oznaka ?? s.description ?? "",
            iznos: Number(s.punIznos ?? s.amount),
          }));

      let blob: Blob;
      let filename: string;
      if (p.type === "KOMPENZACIJA") {
        const partner = (partners ?? []).find((x) => x.id === p.partner?.id);
        const { generateKompenzacijaPdf } = await import(
          "src/sections/cesije-i-kompenzacije/kompenzacijaPdf"
        );
        blob = await generateKompenzacijaPdf({
          broj: p.broj,
          datum: formatDate(p.datum),
          duznikNaziv: orgName,
          duznikAdresa: [fullOrg?.address, fullOrg?.city]
            .filter(Boolean)
            .join(", "),
          duznikId: fullOrg?.taxNumber ?? "",
          duznikPdv: fullOrg?.pdvNumber ?? "",
          duznikSifra: "",
          povjeriocNaziv: p.partner?.name ?? partner?.name ?? "",
          povjeriocAdresa: [partner?.address, partner?.city]
            .filter(Boolean)
            .join(", "),
          povjeriocId: partner?.jib ?? "",
          povjeriocPdv: partner?.pdvBroj ?? "",
          povjeriocSifra: partner?.code != null ? String(partner.code) : "",
          duznikStavke: collapseStavke(stavke("OUT")),
          povjeriocStavke: collapseStavke(stavke("IN")),
        });
        filename = `Kompenzacija_${p.broj.replace("/", "-")}.pdf`;
      } else {
        const cesus = (partners ?? []).find((x) => x.id === p.cesus?.id);
        const cesionar = (partners ?? []).find(
          (x) => x.id === p.cesionar?.id,
        );
        const { generateCesijaPdf } = await import(
          "src/sections/cesije-i-kompenzacije/cesijaPdf"
        );
        blob = await generateCesijaPdf({
          mjesto: fullOrg?.city ?? "",
          datum: formatDate(p.datum),
          cedentNaziv: orgName,
          cedentId: fullOrg?.taxNumber ?? "",
          cedentZastupnik:
            fullOrg?.owner?.name ||
            [fullOrg?.owner?.firstName, fullOrg?.owner?.lastName]
              .filter(Boolean)
              .join(" "),
          cesionarNaziv: p.cesionar?.name ?? cesionar?.name ?? "",
          cesionarId: cesionar?.jib ?? "",
          cesionarZastupnik: "",
          cesusNaziv: p.cesus?.name ?? cesus?.name ?? "",
          cesusId: cesus?.jib ?? "",
          cesusZastupnik: "",
          iznosBroj: `${formatBroj(Number(p.iznos))} KM`,
          iznosSlovima: iznosUSlova(Number(p.iznos)),
          sud: fullOrg?.city ?? "",
          brojPrimjeraka: "3 (tri)",
        });
        filename = `Ugovor_o_cesiji_${p.broj.replace("/", "-")}.pdf`;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setPrebPdfBusy(null);
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
      <div className="relative flex flex-wrap items-end justify-between gap-3 mb-6">
        <HelpButton slug="fakture" className="absolute top-0 right-0" />
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
            onClick={() => setPreparedOpen(true)}
            title="Ponavljajuće/pripremljene fakture za stalne klijente"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cream-300 text-text-secondary text-[13px] font-medium hover:border-brand-600/50 hover:text-brand-600 transition-colors"
          >
            <IconRepeat size={16} />
            Pripremljeni računi
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

      {/* KPI (klik na karticu filtrira listu ispod) */}
      <div
        className={`grid grid-cols-2 lg:grid-cols-4 ${fullOrg?.isPdvObveznik ? "xl:grid-cols-5" : ""} gap-4 mb-5`}
      >
        <Kpi
          label="Njihov dug (fakture)"
          value={formatBAM(openReceivable)}
          sub={`${openInvoices.length} otvorenih · klik filtrira`}
          tone={openReceivable > 0 ? "success" : undefined}
          onClick={() => {
            setTab("izlazne");
            setStatusFilter("ISSUED");
          }}
        />
        <Kpi
          label="Naš dug (ulazni računi)"
          value={formatBAM(openPayable)}
          sub={`${openRacuni.length} otvorenih · klik filtrira`}
          tone={openPayable > 0 ? "warning" : undefined}
          onClick={() => {
            setTab("ulazne");
            setUlazFilter("OTVOREN");
          }}
        />
        <Kpi
          label="Dospjelo (rok prošao)"
          value={formatBAM(lateReceivable)}
          sub={
            lateInvoices || lateRacuni
              ? `${lateInvoices} njihovih kasni${latePayable > 0 ? ` · naš dug kasni ${formatBAM(latePayable)}` : ""}`
              : "ništa ne kasni"
          }
          tone={lateReceivable > 0 ? "accent" : undefined}
          onClick={() => {
            setTab("izlazne");
            setStatusFilter("KASNI");
          }}
        />
        <Kpi
          label="Saldo otvorenog"
          value={formatBAM(openReceivable - openPayable)}
          sub="njihov dug minus naš dug"
          tone={openReceivable - openPayable < 0 ? "accent" : undefined}
          onClick={() => setTab("sve")}
        />
        {fullOrg?.isPdvObveznik && (
          <Kpi
            label={`PDV razlika (${currentYear}.)`}
            value={formatBAM(pdvOut - pdvIn)}
            sub={`izlazni ${formatBAM(pdvOut)} · ulazni ${formatBAM(pdvIn)}`}
          />
        )}
      </div>

      {/* Tabovi (pilula); filteri idu u zaseban red ispod da se traka tabova
          ne pomjera pri promjeni taba */}
      <div className="mb-4">
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
        <div className="flex flex-wrap items-center gap-2 mt-2.5 empty:hidden">
          {tab === "izlazne" && (
            <PkSelect
              ariaLabel="Status faktura"
              value={statusFilter}
              onChange={(v) => setStatusFilter(String(v ?? ""))}
              options={[
                { value: "", label: "Svi statusi" },
                { value: "ISSUED", label: "Izdane (nenaplaćene)" },
                { value: "KASNI", label: "Kasne sa naplatom" },
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
          {tab === "ulazne" && (
            <PkSelect
              ariaLabel="Sortiraj ulazne račune"
              value={racunSort}
              onChange={(v) => setRacunSort(String(v ?? "datum-desc"))}
              options={[
                { value: "datum-desc", label: "Datum: najnoviji" },
                { value: "datum-asc", label: "Datum: najstariji" },
                { value: "rok-asc", label: "Rok: prvo dospjeli" },
                { value: "iznos-desc", label: "Iznos: najveći" },
                { value: "iznos-asc", label: "Iznos: najmanji" },
                { value: "dobavljac", label: "Dobavljač: A-Z" },
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

      {/* Pretraga + partner + period (za izlazne/ulazne/sve) */}
      {tab !== "prebijanja" && (
        <div className="rounded-xl bg-cream-100 border border-cream-300 p-3.5 mb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <IconSearch
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Traži: broj, kupac/dobavljač, iznos..."
                className="w-full rounded-lg border border-cream-300 bg-cream-50 pl-9 pr-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
              />
            </div>
            <PkSelect
              ariaLabel="Partner"
              value={partnerFilter != null ? String(partnerFilter) : ""}
              onChange={(v) =>
                setPartnerFilter(v ? Number(v) : null)
              }
              searchable
              options={[
                { value: "", label: "Svi partneri" },
                ...(partners ?? []).map((p) => ({
                  value: String(p.id),
                  label: p.name,
                })),
              ]}
              wrapStyle={{ maxWidth: 220 }}
            />
            <PkDateInput
              value={fromStr}
              onChange={setFromStr}
              placeholder="DD.MM.GGGG."
              ariaLabel="Datum od"
              className="w-[140px]"
            />
            <PkDateInput
              value={toStr}
              onChange={setToStr}
              placeholder="DD.MM.GGGG."
              ariaLabel="Datum do"
              className="w-[140px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {(
              [
                { id: "mjesec", label: "Ovaj mjesec" },
                { id: "prosli", label: "Prošli mjesec" },
                { id: "godina", label: "Ova godina" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => primijeniPeriod(p.id)}
                className={[
                  "px-3 py-1 rounded-full text-[12px] font-medium border transition-colors",
                  aktivanPeriod === p.id
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-cream-50 text-text-secondary border-cream-300 hover:border-text-tertiary",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
            {(fromStr || toStr) && (
              <button
                type="button"
                onClick={() => primijeniPeriod("sve")}
                className="px-3 py-1 rounded-full text-[12px] font-medium text-text-tertiary hover:text-text-primary transition-colors"
              >
                Poništi period
              </button>
            )}
            {/* sume za trenutno filtrirano: lista kao brzi izvještaj */}
            <span className="ml-auto text-[12px] text-text-tertiary tabular-nums">
              {tab === "izlazne" && visibleInvoices.length > 0 && (
                <>
                  Ukupno:{" "}
                  <strong className="text-text-primary">
                    {formatBAM(invSume.ukupno)}
                  </strong>
                  {" · "}Naplaćeno:{" "}
                  <strong className="text-success">
                    {formatBAM(invSume.naplaceno)}
                  </strong>
                  {" · "}Otvoreno:{" "}
                  <strong className="text-warning">
                    {formatBAM(invSume.otvoreno)}
                  </strong>
                </>
              )}
              {tab === "ulazne" && visibleRacuni.length > 0 && (
                <>
                  Ukupno:{" "}
                  <strong className="text-text-primary">
                    {formatBAM(racSume.ukupno)}
                  </strong>
                  {" · "}Plaćeno:{" "}
                  <strong className="text-success">
                    {formatBAM(racSume.placeno)}
                  </strong>
                  {" · "}Otvoreno:{" "}
                  <strong className="text-warning">
                    {formatBAM(racSume.otvoreno)}
                  </strong>
                </>
              )}
              {tab === "sve" && ledger.length > 0 && (
                <>
                  Izlazno:{" "}
                  <strong className="text-text-primary">
                    {formatBAM(invSume.ukupno)}
                  </strong>
                  {" · "}Ulazno:{" "}
                  <strong className="text-text-primary">
                    {formatBAM(racSume.ukupno)}
                  </strong>
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Prijedlozi prebijanja: partneri sa dugom na obje strane */}
      {tab === "prebijanja" && prebijanjePrijedlozi.length > 0 && (
        <div className="rounded-xl border border-brand-600/25 bg-brand-100/40 p-3.5 mb-4">
          <div className="text-[12px] uppercase tracking-[0.06em] text-brand-700 font-semibold mb-2">
            Prijedlozi kompenzacije
          </div>
          <ul className="flex flex-col gap-1.5">
            {prebijanjePrijedlozi.map(({ partner: p, iznos }) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-text-primary"
              >
                <IconArrowsExchange size={15} className="text-brand-700 shrink-0" />
                <span className="min-w-0">
                  Sa <strong>{p.name}</strong> imate dug na obje strane:
                  možete prebiti{" "}
                  <strong className="tabular-nums">{formatBAM(iznos)}</strong>
                  <span className="text-text-tertiary">
                    {" "}(potražujete {formatBAM(p.stats.openInvoicesTotal)},
                    dugujete {formatBAM(p.stats.openPayablesTotal)})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setKompPartnerId(p.id)}
                  className="ml-auto shrink-0 px-3 py-1 rounded-lg border border-brand-600 text-brand-600 text-[12px] font-medium hover:bg-brand-100 transition-colors"
                >
                  Kompenzacija
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
                pdfBusy={prebPdfBusy === p.id}
                onPdf={handlePrebijanjePdf}
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
                  markPending={markPaid.isPending || unmarkPaid.isPending}
                  onMarkPaid={(x) => markPaid.mutate(x)}
                  onUnmarkPaid={(x) => unmarkPaid.mutate(x)}
                  onPdf={handlePdf}
                  onOpen={(x) => setPreviewId(x.id)}
                  onConvert={setConvertTarget}
                  onStorno={setStornoTarget}
                  onCancel={setCancelTarget}
                  onKnjizna={setKoTarget}
                  onCopy={setCopyTarget}
                  onEdit={(x) => router.push(`/app/fakture/nova?uredi=${x.id}`)}
                  onDelete={setDeleteInvoiceTarget}
                  onEmail={(x, podsjetnik) =>
                    setEmailTarget({ inv: x, podsjetnik })
                  }
                  uplataPrijedlog={uplataPrijedlozi.get(inv.id) ?? null}
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
              ledger.map((row, i) => {
                // mjesečni podnaslov: glavna knjiga po mjesecima
                const mjesec = row.date ? mjesecLabel(row.date) : "bez datuma";
                const prethodni =
                  i > 0 && ledger[i - 1].date
                    ? mjesecLabel(ledger[i - 1].date)
                    : null;
                const noviMjesec = i === 0 || mjesec !== prethodni;
                const rowEl =
                  row.kind === "izlazna" ? (
                    <InvoiceRow
                      inv={row.inv}
                      last={i === ledger.length - 1}
                      downloading={downloading}
                      markPending={markPaid.isPending || unmarkPaid.isPending}
                      onMarkPaid={(x) => markPaid.mutate(x)}
                      onUnmarkPaid={(x) => unmarkPaid.mutate(x)}
                      onPdf={handlePdf}
                      onOpen={(x) => setPreviewId(x.id)}
                      onConvert={setConvertTarget}
                      onStorno={setStornoTarget}
                  onCancel={setCancelTarget}
                      onKnjizna={setKoTarget}
                      onCopy={setCopyTarget}
                  onEdit={(x) => router.push(`/app/fakture/nova?uredi=${x.id}`)}
                  onDelete={setDeleteInvoiceTarget}
                      onEmail={(x, podsjetnik) =>
                        setEmailTarget({ inv: x, podsjetnik })
                      }
                      uplataPrijedlog={uplataPrijedlozi.get(row.inv.id) ?? null}
                    />
                  ) : (
                    <RacunRow
                      r={row.racun}
                      last={i === ledger.length - 1}
                      updatePending={updateRacun.isPending}
                      onMarkPaid={markRacunPaid}
                      onReopen={reopenRacun}
                      onDelete={setDeleteRacunTarget}
                      onOpen={setRacunEdit}
                    />
                  );
                return (
                  <Fragment
                    key={
                      row.kind === "izlazna"
                        ? `i-${row.inv.id}`
                        : `u-${row.racun.id}`
                    }
                  >
                    {noviMjesec && (
                      <li className="px-4 pt-2.5 pb-1 text-[11px] uppercase tracking-[0.06em] text-text-tertiary border-b border-cream-300/40 bg-cream-50/50 list-none">
                        {mjesec}
                      </li>
                    )}
                    {rowEl}
                  </Fragment>
                );
              })}
          </ul>
        )}
      </div>

      {/* Potvrda brisanja izlazne fakture (samo nenaplaćene) */}
      <Modal
        open={deleteInvoiceTarget != null}
        onClose={() => setDeleteInvoiceTarget(null)}
        title="Brisanje izlazne fakture"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteInvoiceTarget(null)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={deleteInvoiceMut.isPending}
              onClick={() => {
                if (!deleteInvoiceTarget) return;
                deleteInvoiceMut.mutate(deleteInvoiceTarget);
              }}
              className="px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Obriši fakturu
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-6 text-text-secondary">
          Obrisati fakturu{" "}
          <span className="font-semibold text-text-primary">
            {deleteInvoiceTarget?.fullNumber}
          </span>
          ? Brisanje ostavlja prazninu u numeraciji (npr. F-0001, pa F-0003) i
          uklanja fakturu iz KIF-a, PDV prijave i sa kartice kupca. Za ispravku
          je bolje koristiti storno ili knjižnu obavijest. Ovo se ne može
          poništiti.
        </p>
      </Modal>

      <PripremljeniRacuniModal
        open={preparedOpen}
        onClose={() => setPreparedOpen(false)}
        orgId={orgId}
        partners={partners ?? []}
        isPdvObveznik={Boolean(fullOrg?.isPdvObveznik)}
        onInvoiced={invalidateInvoices}
      />

      {/* Potvrda storniranja standardne fakture */}
      <Modal
        open={cancelTarget != null}
        onClose={() => setCancelTarget(null)}
        title="Storniranje fakture"
        footer={
          <>
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={cancelInvoice.isPending}
              onClick={() => {
                if (!cancelTarget) return;
                cancelInvoice.mutate(cancelTarget);
              }}
              className="px-4 py-2 rounded-lg bg-accent-500 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Storniraj fakturu
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-6 text-text-secondary">
          Stornirati fakturu{" "}
          <span className="font-semibold text-text-primary">
            {cancelTarget?.fullNumber}
          </span>
          ? Faktura se poništava (status Stornirana), broj ostaje isti bez
          praznine u numeraciji, a faktura izlazi iz KIF-a, PDV prijave i sa
          kartice kupca. Za razliku od brisanja, dokument ostaje evidentiran
          kao storniran.
        </p>
      </Modal>

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
          ? Račun se uklanja iz KUF-a i sa kartice dobavljača. Transakcije sa
          izvoda ostaju netaknute.
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
      {/* kompenzacija otvorena iz prijedloga (predizabran partner) */}
      {kompPartnerId != null && orgId != null && (
        <KompenzacijaModal
          key={`komp-prijedlog-${orgId}-${kompPartnerId}`}
          orgId={orgId}
          orgName={fullOrg?.name ?? activeOrg?.name ?? ""}
          initialPartnerId={kompPartnerId}
          onClose={() => setKompPartnerId(null)}
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

      {/* Slanje fakture / podsjetnika kupcu emailom (PDF u prilogu) */}
      <EmailFaktureModal
        target={emailTarget}
        pending={sendEmail.isPending}
        error={sendEmail.isError ? (sendEmail.error as Error).message : null}
        onSend={(to, message) => {
          if (!emailTarget) return;
          sendEmail.mutate({ id: emailTarget.inv.id, to, message });
        }}
        onClose={() => {
          setEmailTarget(null);
          sendEmail.reset();
        }}
      />

      {/* obavijest/greška u PK modalu umjesto window.alert */}
      <ConfirmModal
        open={obavijest != null}
        onClose={() => setObavijest(null)}
        title="Obavijest"
        message={obavijest}
      />
    </div>
  );
}

// Modal za slanje fakture kupcu: adresa (default sa fakture) + poruka.
// Podsjetnik = ista faktura u prilogu, samo sa tekstom opomene.
function EmailFaktureModal({
  target,
  pending,
  error,
  onSend,
  onClose,
}: {
  target: { inv: Invoice; podsjetnik: boolean } | null;
  pending: boolean;
  error: string | null;
  onSend: (to: string, message: string) => void;
  onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  // novi target → predpopuni polja (reset tokom rendera, bez effecta)
  const [prevKey, setPrevKey] = useState<string | null>(null);
  const key = target ? `${target.inv.id}-${target.podsjetnik}` : null;
  if (key !== prevKey) {
    setPrevKey(key);
    if (target) {
      setTo(target.inv.buyerEmail ?? "");
      setMessage(
        target.podsjetnik
          ? `Poštovani,\n\npodsjećamo Vas da faktura ${target.inv.fullNumber} od ${formatDate(target.inv.issueDate)} na iznos ${formatBAM(Number(target.inv.grossTotal))}${target.inv.dueDate ? ` sa rokom plaćanja ${formatDate(target.inv.dueDate)}` : ""} još nije plaćena. Fakturu šaljemo ponovo u prilogu.\n\nAko je uplata u međuvremenu izvršena, zanemarite ovu poruku.`
          : "",
      );
    }
  }
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim());
  return (
    <Modal
      open={target != null}
      onClose={onClose}
      title={
        target?.podsjetnik
          ? `Podsjetnik za ${target.inv.fullNumber}`
          : `Pošalji fakturu ${target?.inv.fullNumber ?? ""}`
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
          >
            Odustani
          </button>
          <button
            type="button"
            disabled={pending || !validEmail}
            onClick={() => onSend(to.trim(), message.trim())}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {pending && <IconLoader2 size={15} className="animate-spin" />}
            <IconMail size={15} />
            Pošalji
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] leading-6 text-text-secondary">
          Kupcu se šalje email sa PDF-om fakture u prilogu
          {target?.podsjetnik ? " i tekstom podsjetnika za plaćanje" : ""}.
        </p>
        <div>
          <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1.5">
            Email kupca *
          </div>
          <input
            inputMode="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="kupac@email.ba"
            className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600"
          />
          {!target?.inv.buyerEmail && (
            <p className="text-[11.5px] text-text-tertiary mt-1">
              Kupac na fakturi nema email: upišite adresu (snima se samo za
              ovo slanje).
            </p>
          )}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1.5">
            Poruka (opciono)
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] leading-5 text-text-primary focus:outline-none focus:border-brand-600 resize-y"
          />
        </div>
        {error && (
          <p className="text-[12.5px] text-danger leading-5">{error}</p>
        )}
      </div>
    </Modal>
  );
}

// Red knjižene kompenzacije/cesije: strane, iznos, obuhvaćene stavke, brisanje.
function PrebijanjeRow({
  p,
  last,
  pdfBusy,
  onPdf,
  onDelete,
}: {
  p: Prebijanje;
  last: boolean;
  pdfBusy: boolean;
  onPdf: (p: Prebijanje) => void;
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
          onClick={() => onPdf(p)}
          disabled={pdfBusy}
          title={
            p.type === "KOMPENZACIJA"
              ? "Preuzmi PDF prijedloga kompenzacije"
              : "Preuzmi PDF ugovora o cesiji"
          }
          className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg border border-cream-300 text-[12px] font-medium text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
        >
          {pdfBusy ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconDownload size={13} />
          )}
          PDF
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
