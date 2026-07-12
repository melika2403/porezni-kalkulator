"use client";

import { useState } from "react";
import { IconLoader2, IconPlus, IconX } from "@tabler/icons-react";
import { Modal } from "src/components/app-shell/Modal";
import { bankNameFromAccount, formatBankAccount } from "src/lib/bankCodes";
import { useCreatePartner, useUpdatePartner } from "src/hooks/usePartners";
import type { Partner, PartnerPayload, PartnerSuggestion } from "src/api/partners";

export type PartnerFormState = {
  id: number | null;
  name: string;
  jib: string;
  pdvBroj: string;
  address: string;
  city: string;
  email: string;
  phone: string;
  accounts: string[];
  note: string;
};

export const EMPTY_PARTNER_FORM: PartnerFormState = {
  id: null,
  name: "",
  jib: "",
  pdvBroj: "",
  address: "",
  city: "",
  email: "",
  phone: "",
  accounts: [""],
  note: "",
};

export function formFromPartner(p: Partner): PartnerFormState {
  return {
    id: p.id,
    name: p.name,
    jib: p.jib ?? "",
    pdvBroj: p.pdvBroj ?? "",
    address: p.address ?? "",
    city: p.city ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    accounts:
      (p.accounts ?? []).length > 0 ? p.accounts.map(formatBankAccount) : [""],
    note: p.note ?? "",
  };
}

export function formFromSuggestion(s: PartnerSuggestion): PartnerFormState {
  return {
    ...EMPTY_PARTNER_FORM,
    name: s.name,
    jib: s.jib ?? "",
    address: s.address ?? "",
    city: s.city ?? "",
    email: s.email ?? "",
    accounts: s.account ? [formatBankAccount(s.account)] : [""],
  };
}

function payloadFromForm(f: PartnerFormState): PartnerPayload {
  return {
    name: f.name.trim(),
    jib: f.jib.trim() || undefined,
    pdvBroj: f.pdvBroj.trim() || undefined,
    address: f.address.trim() || undefined,
    city: f.city.trim() || undefined,
    email: f.email.trim() || undefined,
    phone: f.phone.trim() || undefined,
    accounts: f.accounts.map((a) => a.replace(/\D+/g, "")).filter(Boolean),
    note: f.note.trim() || undefined,
  };
}

/** Zajednička forma za dodavanje/uređivanje partnera (lista i kartica). */
export function PartnerFormModal({
  orgId,
  initial,
  onClose,
  onSaved,
}: {
  orgId: number | null;
  /** null = zatvoreno; forma se seed-uje pri otvaranju */
  initial: PartnerFormState | null;
  onClose: () => void;
  onSaved?: (partner: Partner) => void;
}) {
  const createPartner = useCreatePartner(orgId);
  const updatePartner = useUpdatePartner(orgId);

  const [form, setForm] = useState<PartnerFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  // seed forme pri promjeni `initial` (render-adjust umjesto efekta)
  const [seededInitial, setSeededInitial] = useState<
    PartnerFormState | null | undefined
  >(undefined);
  if (seededInitial !== initial) {
    setSeededInitial(initial);
    setForm(initial ? { ...initial, accounts: [...initial.accounts] } : null);
    setError(null);
  }

  function setAccount(idx: number, value: string) {
    if (!form) return;
    const accounts = [...form.accounts];
    accounts[idx] = formatBankAccount(value);
    setForm({ ...form, accounts });
  }

  function save() {
    if (!form) return;
    setError(null);
    const payload = payloadFromForm(form);
    if (!payload.name) {
      setError("Naziv partnera je obavezan.");
      return;
    }
    const jibDigits = (payload.jib ?? "").replace(/\D+/g, "");
    if (jibDigits.length !== 13) {
      setError("JIB / ID broj je obavezan i mora imati 13 cifara.");
      return;
    }
    const pdvDigits = (payload.pdvBroj ?? "").replace(/\D+/g, "");
    if (pdvDigits && pdvDigits.length !== 12) {
      setError("PDV broj mora imati 12 cifara (ili ostaviti prazno).");
      return;
    }
    const onError = (e: unknown) => {
      const msg = (e as Error)?.message;
      setError(
        msg === "PARTNER_EXISTS"
          ? "Partner sa tim nazivom već postoji."
          : "Greška pri snimanju, pokušajte ponovo.",
      );
    };
    if (form.id == null) {
      createPartner.mutate(payload, {
        onSuccess: (created) => {
          onClose();
          onSaved?.(created);
        },
        onError,
      });
    } else {
      updatePartner.mutate(
        { partnerId: form.id, payload },
        {
          onSuccess: (updated) => {
            onClose();
            onSaved?.(updated);
          },
          onError,
        },
      );
    }
  }

  const saving = createPartner.isPending || updatePartner.isPending;
  const inputCls =
    "w-full rounded-lg border border-cream-300 bg-cream-50 px-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-600";
  const labelCls =
    "block text-[11px] uppercase tracking-[0.06em] text-text-tertiary mb-1";

  return (
    <Modal
      open={form != null}
      onClose={onClose}
      title={form?.id == null ? "Novi partner" : "Uredi partnera"}
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
            disabled={saving}
            onClick={save}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving && <IconLoader2 size={15} className="animate-spin" />}
            Sačuvaj
          </button>
        </>
      }
    >
      {form && (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Naziv *</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="npr. Penny d.o.o. Sarajevo"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>JIB / ID broj *</label>
              <input
                className={inputCls}
                value={form.jib}
                onChange={(e) =>
                  setForm({
                    ...form,
                    jib: e.target.value.replace(/\D/g, "").slice(0, 13),
                  })
                }
                placeholder="13 cifara"
                inputMode="numeric"
                maxLength={13}
              />
            </div>
            <div>
              <label className={labelCls}>PDV broj</label>
              <input
                className={inputCls}
                value={form.pdvBroj}
                onChange={(e) =>
                  setForm({
                    ...form,
                    pdvBroj: e.target.value.replace(/\D/g, "").slice(0, 12),
                  })
                }
                placeholder="12 cifara"
                inputMode="numeric"
                maxLength={12}
              />
              <p className="text-[11px] text-text-tertiary mt-1">
                Ako se upiše, partner se vodi kao PDV obveznik (bitno za
                KUF/KIF).
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Adresa</label>
              <input
                className={inputCls}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Grad</label>
              <input
                className={inputCls}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input
                className={inputCls}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>Telefon</label>
              <input
                className={inputCls}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Žiro računi</label>
            <div className="space-y-2">
              {form.accounts.map((acc, idx) => {
                const bank = bankNameFromAccount(acc);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      className={`${inputCls} font-mono text-[12.5px] max-w-[230px]`}
                      value={acc}
                      onChange={(e) => setAccount(idx, e.target.value)}
                      placeholder="XXX-XXX-XXXXXXXX-XX"
                      inputMode="numeric"
                    />
                    <span className="text-[12px] text-text-tertiary flex-1 truncate">
                      {bank ??
                        (acc.replace(/\D+/g, "").length >= 3
                          ? "nepoznata banka"
                          : "")}
                    </span>
                    {form.accounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            accounts: form.accounts.filter((_, i) => i !== idx),
                          })
                        }
                        title="Ukloni račun"
                        className="p-1.5 rounded-lg text-text-tertiary hover:bg-cream-200 hover:text-accent-500 transition-colors"
                      >
                        <IconX size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, accounts: [...form.accounts, ""] })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-info-bg text-info text-[12.5px] font-medium hover:brightness-95 transition-[filter]"
              >
                <IconPlus size={14} />
                Dodaj još jedan račun
              </button>
            </div>
            <p className="text-[11.5px] text-text-tertiary mt-1">
              Po ovim računima (i nazivu) se transakcije sa izvoda automatski
              vežu za partnera, postojeće i buduće.
            </p>
          </div>
          <div>
            <label className={labelCls}>Napomena</label>
            <textarea
              className={`${inputCls} min-h-[48px]`}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          {error && <p className="text-[12.5px] text-accent-500">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
