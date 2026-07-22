"use client";

// Pregled izlazne fakture na ekranu (bez otvaranja PDF-a): zaglavlje,
// prodavac/kupac, stavke i totali. Za PDV obveznike nudi i uređivanje
// KIF klasifikacija (tip/vrsta dokumenta, krajnja potrošnja).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconFileTypePdf,
  IconPencil,
  IconTrash,
  IconUserEdit,
} from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { ConfirmModal } from "src/components/app-shell/ConfirmModal";
import {
  DOC_TYPE_LABEL,
  deleteInvoice,
  getInvoice,
  type Invoice,
} from "src/api/invoices";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { KifKnjizenjeModal } from "src/sections/pdv/KifKnjizenjeModal";
import { usePartners } from "src/hooks/usePartners";
import {
  EMPTY_PARTNER_FORM,
  PartnerFormModal,
  formFromPartner,
  type PartnerFormState,
} from "src/sections/partneri/PartnerFormModal";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Nacrt",
  ISSUED: "Izdana",
  PAID: "Plaćena",
  CANCELLED: "Stornirana",
};

export function InvoicePreviewModal({
  invoiceId,
  onClose,
  onOpenPdf,
  isPdvObveznik = false,
  orgJurisdiction = null,
  orgId = null,
}: {
  /** null = zatvoreno */
  invoiceId: number | null;
  onClose: () => void;
  /** opciono dugme za PDF (postojeća funkcionalnost ostaje) */
  onOpenPdf?: (invoiceId: number) => void;
  /** prikaži "Uredi knjiženje u KIF" */
  isPdvObveznik?: boolean;
  orgJurisdiction?: string | null;
  /** kad je zadan: ikonica na kartici kupca otvara matične podatke partnera */
  orgId?: number | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [kifEdit, setKifEdit] = useState<Invoice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMut = useMutation({
    mutationFn: (id: number) => unwrap(deleteInvoice(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setConfirmDelete(false);
      onClose();
    },
  });

  const { data: inv, isLoading } = useQuery({
    queryKey: ["invoice-detail", invoiceId],
    queryFn: () => unwrap(getInvoice(invoiceId as number)),
    enabled: invoiceId != null,
  });

  // matični podaci kupca: faktura nosi snapshot, a partner se traži po PDV
  // broju / JIB-u / nazivu; ako ga nema, otvara se novi predpopunjen
  const { data: allPartners } = usePartners(invoiceId != null ? orgId : null);
  const [editPartner, setEditPartner] = useState<PartnerFormState | null>(null);
  function openBuyerEdit() {
    if (!inv) return;
    const digits = (s: string | null | undefined) =>
      (s ?? "").replace(/\D/g, "");
    const vat = digits(inv.buyerVatNumber);
    const jib = digits(inv.buyerIdNumber);
    const name = inv.buyerName.trim().toLowerCase();
    const p = (allPartners ?? []).find(
      (x) =>
        (vat !== "" && digits(x.pdvBroj) === vat) ||
        (jib !== "" && digits(x.jib) === jib) ||
        x.name.trim().toLowerCase() === name,
    );
    setEditPartner(
      p
        ? formFromPartner(p)
        : {
            ...EMPTY_PARTNER_FORM,
            name: inv.buyerName,
            jib: inv.buyerIdNumber ?? "",
            pdvBroj: inv.buyerVatNumber ?? "",
            address: inv.buyerAddress ?? "",
            city: inv.buyerCity ?? "",
            email: inv.buyerEmail ?? "",
            phone: inv.buyerPhone ?? "",
          },
    );
  }

  const labelCls =
    "text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary";
  const thCls =
    "px-2.5 py-2 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap border-b border-cream-300";
  const tdCls = "px-2.5 py-2 text-[12.5px] text-text-primary";

  return (
    <>
      <Modal
        open={invoiceId != null}
        onClose={onClose}
        title={
          inv
            ? `${
                inv.type === "PROFORMA"
                  ? "Predračun"
                  : (DOC_TYPE_LABEL[inv.docType] ?? "Faktura")
              } ${inv.fullNumber}`
            : "Faktura"
        }
        footer={
          inv ? (
            <>
              {isPdvObveznik && (
                <button
                  type="button"
                  onClick={() => setKifEdit(inv)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors mr-auto"
                >
                  <IconPencil size={15} /> Knjiženje u KIF
                </button>
              )}
              {inv.docType === "STANDARD" &&
                (inv.status === "ISSUED" || inv.status === "DRAFT") &&
                !inv.convertedToInvoiceId && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    title="Obriši fakturu"
                    aria-label="Obriši fakturu"
                    className="inline-flex items-center justify-center p-2 rounded-lg border border-accent-500 text-accent-500 hover:bg-accent-500/10 transition-colors"
                  >
                    <IconTrash size={16} />
                  </button>
                )}
              {onOpenPdf && (
                <button
                  type="button"
                  onClick={() => onOpenPdf(inv.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
                >
                  <IconFileTypePdf size={15} /> PDF
                </button>
              )}
              {inv.docType === "STANDARD" &&
                (inv.status === "ISSUED" || inv.status === "DRAFT") &&
                !inv.convertedToInvoiceId && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(`/app/fakture/nova?uredi=${inv.id}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-brand-600 text-brand-600 text-[13px] font-medium hover:bg-brand-100 transition-colors"
                  >
                    <IconPencil size={15} /> Uredi
                  </button>
                )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
              >
                Zatvori
              </button>
            </>
          ) : undefined
        }
      >
        {isLoading || !inv ? (
          <div className="py-10 text-center text-text-tertiary text-[13px]">
            Učitavanje...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Zaglavlje */}
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <div>
                <div className={labelCls}>Status</div>
                <div className="text-[13px] font-medium text-text-primary">
                  {STATUS_LABEL[inv.status] ?? inv.status}
                  {inv.paidAt ? ` · ${formatDate(String(inv.paidAt).slice(0, 10))}` : ""}
                </div>
              </div>
              <div>
                <div className={labelCls}>Datum izdavanja</div>
                <div className="text-[13px] font-medium text-text-primary">
                  {formatDate(inv.issueDate)}
                </div>
              </div>
              {inv.dueDate && (
                <div>
                  <div className={labelCls}>Rok plaćanja</div>
                  <div className="text-[13px] font-medium text-text-primary">
                    {formatDate(inv.dueDate)}
                  </div>
                </div>
              )}
              <div>
                <div className={labelCls}>Valuta</div>
                <div className="text-[13px] font-medium text-text-primary">
                  {inv.currency}
                </div>
              </div>
              {inv.linkedFullNumber && (
                <div>
                  <div className={labelCls}>
                    {inv.docType === "STORNO_AVANSNE"
                      ? "Po avansnoj fakturi"
                      : "Uz fakturu"}
                  </div>
                  <div className="text-[13px] font-medium text-text-primary">
                    {inv.linkedFullNumber}
                  </div>
                </div>
              )}
              {inv.stornoFullNumber && (
                <div>
                  <div className={labelCls}>Stornirana</div>
                  <div className="text-[13px] font-medium text-text-primary">
                    {inv.stornoFullNumber}
                  </div>
                </div>
              )}
            </div>

            {/* Prodavac / kupac */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-cream-300 bg-cream-50/60 px-3 py-2.5">
                <div className={labelCls}>Prodavac</div>
                <div className="text-[13px] font-medium text-text-primary mt-0.5">
                  {inv.sellerName}
                </div>
                <div className="text-[12px] text-text-tertiary">
                  {[inv.sellerAddress, inv.sellerCity]
                    .filter(Boolean)
                    .join(", ") || "–"}
                </div>
                <div className="text-[12px] text-text-tertiary">
                  {inv.sellerVatNumber
                    ? `PDV: ${inv.sellerVatNumber}`
                    : inv.sellerTaxNumber
                      ? `JIB: ${inv.sellerTaxNumber}`
                      : ""}
                </div>
              </div>
              <div className="rounded-lg border border-cream-300 bg-cream-50/60 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className={labelCls}>Kupac</div>
                  {orgId != null && (
                    <button
                      type="button"
                      onClick={openBuyerEdit}
                      title="Matični podaci partnera (JIB, PDV broj, adresa...)"
                      className="p-1 -mr-1 -mt-0.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
                    >
                      <IconUserEdit size={15} />
                    </button>
                  )}
                </div>
                <div className="text-[13px] font-medium text-text-primary mt-0.5">
                  {inv.buyerName}
                </div>
                <div className="text-[12px] text-text-tertiary">
                  {[inv.buyerAddress, inv.buyerCity]
                    .filter(Boolean)
                    .join(", ") || "–"}
                </div>
                <div className="text-[12px] text-text-tertiary">
                  {inv.buyerVatNumber
                    ? `PDV: ${inv.buyerVatNumber}`
                    : inv.buyerIdNumber
                      ? `JIB: ${inv.buyerIdNumber}`
                      : ""}
                </div>
              </div>
            </div>

            {/* Stavke */}
            <div className="rounded-lg border border-cream-300 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={thCls}>#</th>
                    <th className={thCls}>Naziv</th>
                    <th className={`${thCls} text-right`}>Kol.</th>
                    <th className={`${thCls} text-right`}>Cijena</th>
                    <th className={`${thCls} text-right`}>PDV %</th>
                    <th className={`${thCls} text-right`}>Ukupno</th>
                  </tr>
                </thead>
                <tbody>
                  {(inv.items ?? []).map((it, i) => (
                    <tr
                      key={it.id}
                      className={
                        i < (inv.items?.length ?? 0) - 1
                          ? "border-b border-cream-300/60"
                          : ""
                      }
                    >
                      <td className={`${tdCls} text-text-tertiary`}>
                        {it.ordinal}
                      </td>
                      <td className={tdCls}>
                        {it.name}
                        {it.unit ? (
                          <span className="text-text-tertiary"> ({it.unit})</span>
                        ) : null}
                      </td>
                      <td className={`${tdCls} text-right tabular-nums`}>
                        {Number(it.quantity)}
                      </td>
                      <td className={`${tdCls} text-right tabular-nums`}>
                        {formatBAM(Number(it.unitPrice))}
                      </td>
                      <td className={`${tdCls} text-right tabular-nums`}>
                        {Number(it.vatPct)}%
                      </td>
                      <td className={`${tdCls} text-right tabular-nums`}>
                        {formatBAM(Number(it.grossLine))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totali */}
            <div className="flex flex-col items-end gap-0.5 text-[13px]">
              <div className="text-text-tertiary">
                Osnovica:{" "}
                <span className="tabular-nums text-text-primary">
                  {formatBAM(Number(inv.netTotal))}
                </span>
              </div>
              {Number(inv.discountTotal) > 0 && (
                <div className="text-text-tertiary">
                  Popust:{" "}
                  <span className="tabular-nums text-text-primary">
                    −{formatBAM(Number(inv.discountTotal))}
                  </span>
                </div>
              )}
              <div className="text-text-tertiary">
                PDV:{" "}
                <span className="tabular-nums text-text-primary">
                  {formatBAM(Number(inv.vatTotal))}
                </span>
              </div>
              <div className="font-semibold text-text-primary text-[14.5px]">
                Ukupno: <span className="tabular-nums">{formatBAM(Number(inv.grossTotal))}</span>
              </div>
            </div>

            {inv.notes && (
              <p className="text-[12px] text-text-tertiary whitespace-pre-wrap">
                {inv.notes}
              </p>
            )}
          </div>
        )}
      </Modal>

      <KifKnjizenjeModal
        invoice={kifEdit}
        orgJurisdiction={orgJurisdiction}
        onClose={() => setKifEdit(null)}
      />
      <PartnerFormModal
        orgId={orgId}
        initial={editPartner}
        onClose={() => setEditPartner(null)}
      />
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Brisanje izlazne fakture"
        message={
          inv ? (
            <>
              Obrisati fakturu{" "}
              <strong className="text-text-primary">{inv.fullNumber}</strong>?
              Brisanje ostavlja prazninu u numeraciji i uklanja fakturu iz
              KIF-a, PDV prijave i sa kartice kupca. Za ispravke je bolji Uredi
              ili knjižna obavijest. Ovo se ne može poništiti.
            </>
          ) : null
        }
        confirmLabel="Da, obriši fakturu"
        busy={deleteMut.isPending}
        onConfirm={() => inv && deleteMut.mutate(inv.id)}
      />
    </>
  );
}
