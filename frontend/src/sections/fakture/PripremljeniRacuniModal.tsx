"use client";

// Pripremljeni (ponavljajući) računi: šabloni fakture sa frekvencijom
// (sedmično/mjesečno/kvartalno/godišnje). Iz aktivnih se jednim klikom
// ("Fakturiši sve") prave prave izlazne fakture za izabranu frekvenciju.
import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  IconArrowLeft,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconReceipt2,
  IconTrash,
} from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { ConfirmModal } from "src/components/app-shell/ConfirmModal";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import {
  PartnerFormModal,
  type PartnerFormState,
  EMPTY_PARTNER_FORM,
} from "src/sections/partneri/PartnerFormModal";
import { unwrap } from "src/api/auth";
import { formatBAM, formatDate } from "src/lib/format";
import { parseKm, formatKm } from "src/lib/amountInput";
import { parseDateInput } from "src/lib/dateInput";
import type { Partner } from "src/api/partners";
import { useArtikli } from "src/hooks/useKalkulacije";
import {
  FREQ_LABEL,
  createPreparedInvoice,
  deletePreparedInvoice,
  invoicePrepared,
  listPreparedInvoices,
  setPreparedActive,
  updatePreparedInvoice,
  type Frequency,
  type PreparedInvoice,
  type PreparedPayload,
} from "src/api/preparedInvoices";

const FREQS: Frequency[] = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"];

type ItemForm = { name: string; quantity: string; unitPrice: string; vatPct: string };
type FormState = {
  id: number | null;
  frequency: Frequency;
  active: boolean;
  applyVat: boolean;
  partnerId: number | null;
  buyerName: string;
  buyerIdNumber: string;
  buyerVatNumber: string;
  buyerAddress: string;
  buyerCity: string;
  buyerEmail: string;
  buyerPhone: string;
  notes: string;
  items: ItemForm[];
};

const emptyItem = (): ItemForm => ({ name: "", quantity: "1", unitPrice: "", vatPct: "17" });
const emptyForm = (frequency: Frequency, applyVat: boolean): FormState => ({
  id: null,
  frequency,
  active: true,
  applyVat,
  partnerId: null,
  buyerName: "",
  buyerIdNumber: "",
  buyerVatNumber: "",
  buyerAddress: "",
  buyerCity: "",
  buyerEmail: "",
  buyerPhone: "",
  notes: "",
  items: [emptyItem()],
});

function formFromPrepared(p: PreparedInvoice): FormState {
  return {
    id: p.id,
    frequency: p.frequency,
    active: p.active,
    applyVat: p.applyVat,
    partnerId: p.partnerId,
    buyerName: p.buyerName ?? "",
    buyerIdNumber: p.buyerIdNumber ?? "",
    buyerVatNumber: p.buyerVatNumber ?? "",
    buyerAddress: p.buyerAddress ?? "",
    buyerCity: p.buyerCity ?? "",
    buyerEmail: p.buyerEmail ?? "",
    buyerPhone: p.buyerPhone ?? "",
    notes: p.notes ?? "",
    items:
      p.items.length > 0
        ? p.items.map((it) => ({
            name: it.name,
            quantity: String(it.quantity),
            unitPrice: formatKm(it.unitPrice),
            vatPct: String(it.vatPct),
          }))
        : [emptyItem()],
  };
}

// Količina iz plain inputa: podnosi i zarez ("1,5") i tačku ("1.5") kao
// decimalni separator (bez ovoga bi Number("1,5") dao NaN pa bi stavka ispala).
function parseQty(v: string): number {
  const n = Number(String(v).trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function itemGross(it: ItemForm, applyVat: boolean): number {
  const qty = parseQty(it.quantity);
  const price = parseKm(it.unitPrice) ?? 0;
  const vat = applyVat ? Number(it.vatPct) || 0 : 0;
  return qty * price * (1 + vat / 100);
}

export function PripremljeniRacuniModal({
  open,
  onClose,
  orgId,
  partners,
  isPdvObveznik = false,
  onInvoiced,
}: {
  open: boolean;
  onClose: () => void;
  orgId: number | null;
  partners: Partner[];
  isPdvObveznik?: boolean;
  onInvoiced?: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Frequency>("MONTHLY");
  const [form, setForm] = useState<FormState | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PreparedInvoice | null>(null);
  const [newPartner, setNewPartner] = useState<PartnerFormState | null>(null);
  // koji red stavke ima otvoren padajući spisak šifarnika
  const [activeDropRow, setActiveDropRow] = useState<number | null>(null);
  // batch fakturisanje
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchDatum, setBatchDatum] = useState("");
  const [batchDospijece, setBatchDospijece] = useState("");
  const [batchInfo, setBatchInfo] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["prepared-invoices", orgId],
    queryFn: () => unwrap(listPreparedInvoices(orgId as number)),
    enabled: open && orgId != null,
  });
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["prepared-invoices", orgId] });
  // šifarnik artikala/usluga za prijedloge u polju naziva stavke
  const { data: artikli } = useArtikli(open ? orgId : null);

  const rows = useMemo(
    () => (data ?? []).filter((p) => p.frequency === tab),
    [data, tab],
  );

  const toggleActive = useMutation({
    mutationFn: (p: PreparedInvoice) =>
      unwrap(setPreparedActive(p.id, !p.active)),
    onSuccess: invalidate,
  });
  const removeMut = useMutation({
    mutationFn: (p: PreparedInvoice) => unwrap(deletePreparedInvoice(p.id)),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });
  const saveMut = useMutation({
    mutationFn: (payload: { id: number | null; body: PreparedPayload }) =>
      payload.id != null
        ? unwrap(updatePreparedInvoice(payload.id, payload.body))
        : unwrap(createPreparedInvoice(payload.body)),
    onSuccess: () => {
      invalidate();
      setForm(null);
    },
    onError: (e: Error) => setFormErr(e?.message || String(e)),
  });
  const batchMut = useMutation({
    mutationFn: (body: {
      organizationId: number;
      frequency: Frequency;
      issueDate: string;
      dueDate: string | null;
    }) => unwrap(invoicePrepared(body)),
    onSuccess: (res) => {
      invalidate();
      onInvoiced?.();
      setBatchInfo(`Kreirano ${res.count} faktura.`);
      setBatchOpen(false);
    },
    onError: (e: Error) => setBatchInfo(e?.message || String(e)),
  });

  function startAdd() {
    setFormErr(null);
    setForm(emptyForm(tab, isPdvObveznik));
  }
  function startEdit(p: PreparedInvoice) {
    setFormErr(null);
    setForm(formFromPrepared(p));
  }

  function selectPartner(pid: number | null) {
    if (!form) return;
    const p = partners.find((x) => x.id === pid);
    setForm({
      ...form,
      partnerId: pid,
      ...(p
        ? {
            buyerName: p.name,
            buyerIdNumber: p.jib ?? "",
            buyerVatNumber: p.pdvBroj ?? "",
            buyerAddress: p.address ?? "",
            buyerCity: p.city ?? "",
            buyerEmail: p.email ?? "",
            buyerPhone: p.phone ?? "",
          }
        : {}),
    });
  }

  function setItem(i: number, patch: Partial<ItemForm>) {
    if (!form) return;
    const items = form.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    setForm({ ...form, items });
  }

  function saveForm() {
    if (!form || orgId == null) return;
    setFormErr(null);
    if (!form.buyerName.trim()) {
      setFormErr("Izaberite ili unesite kupca.");
      return;
    }
    const items = form.items
      .filter((it) => it.name.trim() && parseQty(it.quantity) > 0)
      .map((it) => ({
        name: it.name.trim(),
        unit: null,
        quantity: parseQty(it.quantity),
        unitPrice: parseKm(it.unitPrice) ?? 0,
        discountPct: 0,
        vatPct: form.applyVat ? Number(it.vatPct) || 0 : 0,
      }));
    if (items.length === 0) {
      setFormErr("Dodajte barem jednu stavku sa nazivom i količinom.");
      return;
    }
    const body: PreparedPayload = {
      organizationId: orgId,
      partnerId: form.partnerId,
      frequency: form.frequency,
      active: form.active,
      applyVat: form.applyVat,
      buyer: {
        name: form.buyerName.trim(),
        idNumber: form.buyerIdNumber.trim() || null,
        vatNumber: form.buyerVatNumber.trim() || null,
        address: form.buyerAddress.trim() || null,
        city: form.buyerCity.trim() || null,
        email: form.buyerEmail.trim() || null,
        phone: form.buyerPhone.trim() || null,
      },
      items,
      notes: form.notes.trim() || null,
    };
    saveMut.mutate({ id: form.id, body });
  }

  function openBatch() {
    setBatchInfo(null);
    const today = formatDate(new Date().toISOString());
    const due = new Date();
    due.setDate(due.getDate() + 15);
    setBatchDatum(today);
    setBatchDospijece(formatDate(due.toISOString()));
    setBatchOpen(true);
  }
  function runBatch() {
    if (orgId == null) return;
    const issueDate = parseDateInput(batchDatum);
    if (!issueDate) {
      setBatchInfo("Unesite ispravan datum računa.");
      return;
    }
    const dueDate = batchDospijece.trim() ? parseDateInput(batchDospijece) : null;
    batchMut.mutate({ organizationId: orgId, frequency: tab, issueDate, dueDate });
  }

  const fieldCls =
    "rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-brand-600";
  const aktivnih = rows.filter((p) => p.active).length;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Pripremljeni računi"
        maxWidthClass="max-w-[960px]"
      >
        {form ? (
          /* ── Forma dodaj/uredi ── */
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setForm(null)}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-text-tertiary hover:text-text-primary transition-colors"
            >
              <IconArrowLeft size={14} /> Nazad na listu
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Frekvencija
                </div>
                <PkSelect
                  ariaLabel="Frekvencija"
                  value={form.frequency}
                  onChange={(v) => setForm({ ...form, frequency: v as Frequency })}
                  options={FREQS.map((f) => ({ value: f, label: FREQ_LABEL[f] }))}
                  wrapStyle={{ width: "100%" }}
                />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                  Kupac iz šifarnika
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <PkSelect
                      ariaLabel="Kupac"
                      value={form.partnerId != null ? String(form.partnerId) : ""}
                      onChange={(v) => selectPartner(v ? Number(v) : null)}
                      searchable
                      options={[
                        { value: "", label: "Bez veze (ručni unos)" },
                        ...partners.map((p) => ({
                          value: String(p.id),
                          label: p.name,
                        })),
                      ]}
                      wrapStyle={{ width: "100%" }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewPartner({ ...EMPTY_PARTNER_FORM })}
                    title="Dodaj novog partnera"
                    className="w-9 h-9 shrink-0 rounded-lg border border-cream-300 text-brand-600 hover:bg-brand-100 inline-flex items-center justify-center transition-colors"
                  >
                    <IconPlus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Naziv kupca
              </div>
              <input
                value={form.buyerName}
                onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
                placeholder="Naziv kupca (ili izaberi iz šifarnika)"
                className={`${fieldCls} w-full`}
              />
            </div>

            {/* Stavke */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary">
                  Stavke
                </span>
                {isPdvObveznik && (
                  <label className="inline-flex items-center gap-1.5 text-[12px] text-text-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.applyVat}
                      onChange={(e) => setForm({ ...form, applyVat: e.target.checked })}
                    />
                    Obračunaj PDV
                  </label>
                )}
              </div>
              <div className="flex items-center gap-1.5 mb-1 px-0.5 text-[10px] uppercase tracking-[0.05em] text-text-tertiary">
                <span className="flex-1">Usluga / artikl</span>
                <span className="w-16 text-right">Količina</span>
                <span className="w-32 text-right">Cijena bez PDV</span>
                {form.applyVat && <span className="w-14 text-right">PDV %</span>}
                <span className="w-8 shrink-0" />
              </div>
              <div className="space-y-1.5">
                {form.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="relative flex-1 min-w-0">
                      <input
                        value={it.name}
                        onChange={(e) => {
                          setItem(i, { name: e.target.value });
                          setActiveDropRow(i);
                        }}
                        onFocus={() => setActiveDropRow(i)}
                        onBlur={() =>
                          setTimeout(
                            () => setActiveDropRow((r) => (r === i ? null : r)),
                            150,
                          )
                        }
                        placeholder="Naziv usluge ili artikla"
                        className={`${fieldCls} w-full`}
                      />
                      {activeDropRow === i &&
                        (() => {
                          const q = it.name.trim().toLowerCase();
                          const matches = (artikli ?? [])
                            .filter((a) => a.naziv.toLowerCase().includes(q))
                            .slice(0, 8);
                          if (matches.length === 0) return null;
                          return (
                            <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-lg border border-cream-300 bg-cream-100 shadow-[0_10px_30px_-8px_rgba(15,26,18,0.3)] max-h-56 overflow-y-auto">
                              {matches.map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    setItem(i, { name: a.naziv });
                                    setActiveDropRow(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-[13px] hover:bg-cream-200 transition-colors flex items-center justify-between gap-2"
                                >
                                  <span className="truncate">{a.naziv}</span>
                                  <span className="text-[11px] text-text-tertiary shrink-0 tabular-nums">
                                    {a.sifra}
                                  </span>
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                    </div>
                    <input
                      value={it.quantity}
                      onChange={(e) => setItem(i, { quantity: e.target.value })}
                      inputMode="decimal"
                      title="Količina"
                      className={`${fieldCls} w-16 text-right`}
                    />
                    <div className="w-32 shrink-0">
                      <PkAmountInput
                        value={it.unitPrice}
                        onChange={(v) => setItem(i, { unitPrice: v })}
                        ariaLabel="Cijena"
                        placeholder="0,00"
                      />
                    </div>
                    {form.applyVat && (
                      <input
                        value={it.vatPct}
                        onChange={(e) => setItem(i, { vatPct: e.target.value })}
                        inputMode="decimal"
                        title="PDV %"
                        className={`${fieldCls} w-14 text-right`}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          items:
                            form.items.length > 1
                              ? form.items.filter((_, idx) => idx !== i)
                              : [emptyItem()],
                        })
                      }
                      title="Ukloni stavku"
                      className="w-8 h-9 shrink-0 rounded-lg text-text-tertiary hover:text-accent-500 inline-flex items-center justify-center transition-colors"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}
                className="inline-flex items-center gap-1.5 mt-2 text-[12.5px] text-brand-600 hover:text-brand-700 transition-colors"
              >
                <IconPlus size={14} /> Dodaj stavku
              </button>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Napomena (opciono)
              </div>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Napomena na fakturi"
                className={`${fieldCls} w-full`}
              />
            </div>

            {formErr && (
              <p className="text-[12.5px] text-accent-500">{formErr}</p>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[13px] text-text-tertiary">
                Ukupno:{" "}
                <strong className="text-text-primary tabular-nums">
                  {formatBAM(
                    form.items.reduce((s, it) => s + itemGross(it, form.applyVat), 0),
                  )}
                </strong>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
                >
                  Odustani
                </button>
                <button
                  type="button"
                  disabled={saveMut.isPending}
                  onClick={saveForm}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saveMut.isPending && (
                    <IconLoader2 size={15} className="animate-spin" />
                  )}
                  {form.id != null ? "Sačuvaj izmjene" : "Sačuvaj"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Lista ── */
          <div className="space-y-3">
            {/* Tabovi po frekvenciji */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full border border-cream-300 bg-cream-100 flex-wrap">
              {FREQS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTab(f)}
                  className={[
                    "px-3.5 py-1 rounded-full text-[12.5px] font-medium transition-colors whitespace-nowrap",
                    tab === f
                      ? "bg-brand-600 text-white"
                      : "text-text-secondary hover:text-text-primary hover:bg-cream-200",
                  ].join(" ")}
                >
                  {FREQ_LABEL[f]}
                </button>
              ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-brand-600 text-brand-600 text-[12.5px] font-medium hover:bg-brand-100 transition-colors"
              >
                <IconPlus size={14} /> Dodaj pripremljeni račun
              </button>
              <button
                type="button"
                disabled={aktivnih === 0 || batchMut.isPending}
                onClick={openBatch}
                title={
                  aktivnih === 0
                    ? "Nema aktivnih pripremljenih računa u ovom tabu"
                    : `Fakturiši ${aktivnih} aktivnih ${FREQ_LABEL[tab].toLowerCase()} računa`
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-[12.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <IconReceipt2 size={14} /> Fakturiši sve ({aktivnih})
              </button>
              {batchInfo && (
                <span className="text-[12px] text-text-tertiary">{batchInfo}</span>
              )}
            </div>

            {/* Lista redova */}
            {isLoading ? (
              <div className="py-8 text-center text-text-tertiary text-[13px]">
                Učitavanje...
              </div>
            ) : rows.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-text-tertiary">
                Nema {FREQ_LABEL[tab].toLowerCase()} pripremljenih računa. Dodajte
                prvi dugmetom iznad.
              </div>
            ) : (
              <div className="rounded-xl border border-cream-300 divide-y divide-cream-300">
                {rows.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={p.active}
                      onChange={() => toggleActive.mutate(p)}
                      title={p.active ? "Uključen u fakturisanje" : "Isključen"}
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={[
                          "text-[13px] font-medium truncate",
                          p.active ? "text-text-primary" : "text-text-tertiary",
                        ].join(" ")}
                      >
                        {p.buyerName}
                      </div>
                      <div className="text-[11.5px] text-text-tertiary">
                        {p.items.length}{" "}
                        {p.items.length === 1 ? "stavka" : "stavke/stavki"}
                        {p.lastInvoicedAt
                          ? ` · zadnje ${formatDate(String(p.lastInvoicedAt).slice(0, 10))}`
                          : ""}
                      </div>
                    </div>
                    <span className="text-[13px] font-semibold tabular-nums whitespace-nowrap">
                      {formatBAM(p.grossTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      title="Uredi"
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-brand-600 hover:bg-cream-200 transition-colors"
                    >
                      <IconPencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(p)}
                      title="Obriši"
                      className="p-1.5 rounded-lg text-text-tertiary hover:text-accent-500 hover:bg-cream-200 transition-colors"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11.5px] text-text-tertiary">
              Fakturisanjem se od aktivnih pripremljenih računa prave prave
              izlazne fakture (KIF, PDV i kartica kupca standardno). Isključeni
              (bez kvačice) se preskaču.
            </p>
          </div>
        )}
      </Modal>

      {/* Fakturiši sve: datum računa + dospijeće */}
      <Modal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        title={`Fakturiši ${FREQ_LABEL[tab].toLowerCase()} račune`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setBatchOpen(false)}
              className="px-4 py-2 rounded-lg border border-cream-300 text-[13px] text-text-primary hover:bg-cream-200 transition-colors"
            >
              Odustani
            </button>
            <button
              type="button"
              disabled={batchMut.isPending}
              onClick={runBatch}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {batchMut.isPending && (
                <IconLoader2 size={15} className="animate-spin" />
              )}
              Fakturiši {aktivnih}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-text-secondary">
            Kreira fakture za{" "}
            <strong className="text-text-primary">{aktivnih}</strong> aktivnih{" "}
            {FREQ_LABEL[tab].toLowerCase()} pripremljenih računa. Datum i dospijeće
            vrijede za sve.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Datum računa
              </div>
              <PkDateInput
                value={batchDatum}
                onChange={setBatchDatum}
                placeholder="DD.MM.GGGG."
                ariaLabel="Datum računa"
              />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1">
                Dospijeće
              </div>
              <PkDateInput
                value={batchDospijece}
                onChange={setBatchDospijece}
                placeholder="DD.MM.GGGG."
                ariaLabel="Dospijeće"
              />
            </div>
          </div>
          {batchInfo && (
            <p className="text-[12.5px] text-accent-500">{batchInfo}</p>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Brisanje pripremljenog računa"
        message={
          deleteTarget ? (
            <>
              Obrisati pripremljeni račun za{" "}
              <strong className="text-text-primary">
                {deleteTarget.buyerName}
              </strong>
              ? Ovo ne dira već fakturisane račune.
            </>
          ) : null
        }
        confirmLabel="Da, obriši"
        busy={removeMut.isPending}
        onConfirm={() => deleteTarget && removeMut.mutate(deleteTarget)}
      />

      <PartnerFormModal
        orgId={orgId}
        initial={newPartner}
        onClose={() => setNewPartner(null)}
        onSaved={(p) => {
          if (!form) return;
          setForm({
            ...form,
            partnerId: p.id,
            buyerName: p.name,
            buyerIdNumber: p.jib ?? "",
            buyerVatNumber: p.pdvBroj ?? "",
            buyerAddress: p.address ?? "",
            buyerCity: p.city ?? "",
            buyerEmail: p.email ?? "",
            buyerPhone: p.phone ?? "",
          });
        }}
      />
    </>
  );
}
