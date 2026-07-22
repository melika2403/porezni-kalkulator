"use client";

// Kopiranje fakture/predračuna: nova kopija ide standardnim redoslijedom
// (sljedeći broj serije, u KIF ulazi po novom datumu). Kupac po defaultu
// ostaje isti (može se zamijeniti partnerom), prodavac se uzima iz SVJEŽIH
// postavki obrta, stavke i cijene se prenose 1:1 (za izmjene stavki postoji
// "Otvori u formi"). Stara faktura ostaje, osim ako se izričito označi
// brisanje (default NE).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import {
  createInvoice,
  deleteInvoice,
  getInvoice,
  type CreateInvoicePayload,
  type Invoice,
} from "src/api/invoices";
import type { Organization } from "src/api/profile";
import type { Partner } from "src/api/partners";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { parseDateInput, todayFormatted } from "src/lib/dateInput";

export function KopirajFakturuModal({
  invoice,
  org,
  partners,
  onClose,
}: {
  /** null = zatvoreno; izvorna faktura ili predračun (STANDARD) */
  invoice: Invoice | null;
  /** aktivna organizacija (svježi podaci prodavca za kopiju) */
  org: Organization | null;
  partners: Partner[];
  onClose: () => void;
}) {
  return (
    <Modal
      open={invoice != null}
      onClose={onClose}
      title={`Kopiraj ${invoice?.type === "PROFORMA" ? "predračun" : "fakturu"} · ${invoice?.fullNumber ?? ""}`}
    >
      {invoice && org && (
        <KopirajForm
          key={invoice.id}
          invoice={invoice}
          org={org}
          partners={partners}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

/** razlika u danima između dva ISO datuma (za prenos roka plaćanja) */
function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso.slice(0, 10));
  const b = new Date(toIso.slice(0, 10));
  const d = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Number.isFinite(d) && d > 0 ? d : 0;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso.slice(0, 10));
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function KopirajForm({
  invoice,
  org,
  partners,
  onClose,
}: {
  invoice: Invoice;
  org: Organization;
  partners: Partner[];
  onClose: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  // stavke se povlače posebno (lista ih ne nosi)
  const { data: full, isLoading } = useQuery({
    queryKey: ["invoice-detail", invoice.id],
    queryFn: () => unwrap(getInvoice(invoice.id)),
  });

  const [datum, setDatum] = useState(todayFormatted());
  // 0 = isti kupac sa originala; inače id partnera
  const [buyerPartnerId, setBuyerPartnerId] = useState(0);
  const [deleteOld, setDeleteOld] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = useMutation({
    mutationFn: async () => {
      const src = full;
      if (!src) throw new Error("Stavke još nisu učitane.");
      const issueIso = parseDateInput(datum);
      if (!issueIso) throw new Error("Datum nije validan (format DD.MM.GGGG.).");
      // rok plaćanja: isti razmak od datuma kao na originalu
      const rokDana =
        src.dueDate && src.issueDate
          ? daysBetween(src.issueDate, src.dueDate)
          : 0;
      const partner =
        buyerPartnerId > 0
          ? partners.find((p) => p.id === buyerPartnerId)
          : null;
      const payload: CreateInvoicePayload = {
        type: src.type,
        applyVat: src.applyVat,
        vrstaIsporuke: src.vrstaIsporuke,
        currency: src.currency,
        issueDate: issueIso,
        dueDate: rokDana > 0 ? addDaysIso(issueIso, rokDana) : null,
        notes: src.notes,
        seller: {
          // svježi podaci obrta, ne stari snapshot sa originala
          organizationId: org.id,
          name: org.name,
          address: org.address,
          city: org.city,
          phone: org.phone,
          email: org.email,
          taxNumber: org.taxNumber,
          vatNumber: org.pdvNumber,
          bankAccount: org.bankAccount,
          logoUrl: org.logoUrl,
        },
        buyer: partner
          ? {
              clientId: null,
              name: partner.name,
              address: partner.address,
              city: partner.city,
              phone: partner.phone,
              email: partner.email,
              idNumber: partner.jib,
              vatNumber: partner.pdvBroj,
            }
          : {
              clientId: src.clientId,
              name: src.buyerName,
              address: src.buyerAddress,
              city: src.buyerCity,
              postalCode: src.buyerPostalCode,
              phone: src.buyerPhone,
              email: src.buyerEmail,
              idNumber: src.buyerIdNumber,
              vatNumber: src.buyerVatNumber,
            },
        items: (src.items ?? []).map((it) => ({
          name: it.name,
          unit: it.unit,
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          discountPct: Number(it.discountPct) || 0,
          vatPct: Number(it.vatPct) || 0,
        })),
      };
      const created = await unwrap(createInvoice(payload));
      // brisanje starog TEK kad je kopija uspješno snimljena
      if (deleteOld) await unwrap(deleteInvoice(invoice.id));
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-invoices"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      onClose();
    },
    onError: (e: Error) =>
      setError(e?.message || "Greška pri kopiranju, pokušajte ponovo."),
  });

  const labelCls =
    "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";
  const thCls =
    "px-2.5 py-1.5 text-left text-[10.5px] uppercase tracking-[0.06em] text-text-tertiary font-semibold whitespace-nowrap border-b border-cream-300";
  const tdCls = "px-2.5 py-1.5 text-[12.5px] text-text-primary";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Datum novog računa</label>
          <PkDateInput
            value={datum}
            onChange={setDatum}
            ariaLabel="Datum novog računa"
            inputClassName="bg-cream-50"
          />
          {invoice.dueDate && invoice.issueDate && (
            <p className="text-[11px] text-text-tertiary mt-1">
              Rok plaćanja: {daysBetween(invoice.issueDate, invoice.dueDate)}{" "}
              dana od novog datuma (kao na originalu).
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Kupac</label>
          <PkSelect
            ariaLabel="Kupac kopije"
            value={buyerPartnerId}
            onChange={(v) => setBuyerPartnerId(Number(v) || 0)}
            searchable
            searchPlaceholder="Pretraži partnere..."
            options={[
              { value: 0, label: `Isti kupac · ${invoice.buyerName}` },
              ...partners.map((p) => ({
                value: p.id,
                label:
                  p.code != null
                    ? `${String(p.code).padStart(4, "0")} · ${p.name}`
                    : p.name,
              })),
            ]}
            wrapStyle={{ width: "100%" }}
          />
        </div>
      </div>

      {/* Pregled stavki i cijena (izmjene idu kroz "Otvori u formi") */}
      <div className="rounded-lg border border-cream-300 overflow-x-auto">
        {isLoading || !full ? (
          <div className="px-3 py-6 text-center text-text-tertiary text-[12.5px]">
            Učitavanje stavki...
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={thCls}>Naziv</th>
                <th className={`${thCls} text-right`}>Kol.</th>
                <th className={`${thCls} text-right`}>Cijena</th>
                <th className={`${thCls} text-right`}>PDV %</th>
                <th className={`${thCls} text-right`}>Iznos</th>
              </tr>
            </thead>
            <tbody>
              {(full.items ?? []).map((it, i) => (
                <tr
                  key={it.id}
                  className={
                    i < (full.items?.length ?? 0) - 1
                      ? "border-b border-cream-300/60"
                      : ""
                  }
                >
                  <td className={tdCls}>{it.name}</td>
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
            <tfoot>
              <tr className="border-t border-cream-300 bg-cream-50/60">
                <td className={`${tdCls} font-semibold`} colSpan={4}>
                  Ukupno
                </td>
                <td className={`${tdCls} text-right tabular-nums font-semibold`}>
                  {formatBAM(Number(full.grossTotal))}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <label className="inline-flex items-start gap-2 text-[13px] text-text-primary">
        <input
          type="checkbox"
          checked={deleteOld}
          onChange={(e) => setDeleteOld(e.target.checked)}
          className="accent-brand-600 w-4 h-4 mt-0.5"
        />
        <span>
          Obriši{" "}
          {invoice.type === "PROFORMA" ? "stari predračun" : "staru fakturu"}{" "}
          {invoice.fullNumber} nakon kopiranja
          <span className="block text-[11.5px] text-text-tertiary">
            Trajno se briše i nestaje iz knjiga (izdana{" "}
            {formatDate(invoice.issueDate)}). Bez ove opcije original ostaje
            netaknut.
          </span>
        </span>
      </label>

      <p className="text-[11.5px] text-text-tertiary">
        Kopija dobija sljedeći broj serije i u KIF ulazi po novom datumu.
        Podaci prodavca (račun, adresa, logo) se uzimaju iz trenutnih postavki
        obrta.
      </p>
      {error && <p className="text-[12.5px] text-accent-500">{error}</p>}

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
        >
          Odustani
        </button>
        <button
          type="button"
          onClick={() => router.push(`/app/fakture/nova?duplicateFrom=${invoice.id}`)}
          title="Otvori kompletnu formu predpopunjenu iz ove fakture (izmjena stavki, cijena...)"
          className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
        >
          Otvori u formi
        </button>
        <button
          type="button"
          disabled={copy.isPending || isLoading}
          onClick={() => {
            setError(null);
            copy.mutate();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {copy.isPending && <IconLoader2 size={15} className="animate-spin" />}
          Kreiraj kopiju
        </button>
      </div>
    </div>
  );
}
