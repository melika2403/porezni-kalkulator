"use client";

import { useEffect, useState } from "react";
import {
  IconBuildingStore,
  IconCategory,
  IconReceiptTax,
  IconMail,
} from "@tabler/icons-react";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "src/hooks/useOrganizationSettings";
import type {
  Jurisdiction,
  OrgSettingsPayload,
  TaxRegime,
} from "src/api/profile";

const JURISDICTIONS: { value: Jurisdiction; label: string }[] = [
  { value: "FBIH", label: "Federacija BiH" },
  { value: "RS", label: "Republika Srpska" },
  { value: "BD", label: "Brčko distrikt" },
];

const TAX_REGIMES: { value: TaxRegime; label: string }[] = [
  { value: "STVARNI_DOHODAK", label: "Stvarni dohodak (poslovne knjige)" },
  { value: "PAUSALNI", label: "Paušalni" },
  { value: "OSTALI", label: "Ostali obveznici" },
];

type FormState = {
  name: string;
  taxNumber: string;
  jurisdiction: Jurisdiction | "";
  taxRegime: TaxRegime | "";
  isPdvObveznik: boolean;
  pdvNumber: string;
  address: string;
  city: string;
  email: string;
  phone: string;
};

const EMPTY: FormState = {
  name: "",
  taxNumber: "",
  jurisdiction: "",
  taxRegime: "",
  isPdvObveznik: false,
  pdvNumber: "",
  address: "",
  city: "",
  email: "",
  phone: "",
};

export function ProfilTab() {
  const me = usePkOfficeMe();
  const activeOrgId = me.data?.activeOrganization?.id ?? me.data?.organizations?.[0]?.id ?? null;
  const settings = useOrganizationSettings(activeOrgId);
  const update = useUpdateOrganizationSettings(activeOrgId ?? 0);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings.data) {
      const o = settings.data;
      setForm({
        name: o.name ?? "",
        taxNumber: o.taxNumber ?? "",
        jurisdiction: o.jurisdiction ?? "",
        taxRegime: o.taxRegime ?? "",
        isPdvObveznik: !!o.isPdvObveznik,
        pdvNumber: o.pdvNumber ?? "",
        address: o.address ?? "",
        city: o.city ?? "",
        email: o.email ?? "",
        phone: o.phone ?? "",
      });
    }
  }, [settings.data]);

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    setSavedAt(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId) return;

    const payload: OrgSettingsPayload = {
      name: form.name.trim(),
      jurisdiction: form.jurisdiction || null,
      taxRegime: form.taxRegime || null,
      isPdvObveznik: form.isPdvObveznik,
      pdvNumber: form.isPdvObveznik ? form.pdvNumber.trim() : "",
      address: form.address.trim(),
      city: form.city.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    };

    try {
      await update.mutateAsync(payload);
      setSavedAt(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri snimanju");
    }
  }

  if (me.isLoading || settings.isLoading) {
    return <div className="text-[13px] text-text-secondary">Učitavanje...</div>;
  }

  if (!activeOrgId) {
    return (
      <div className="text-[13px] text-text-secondary">
        Nemate aktivan obrt. Kreirajte ga iz sidebar org switcher-a.
      </div>
    );
  }

  const canEdit = settings.data?.memberRole === "OWNER" || settings.data?.memberRole === "ADMIN";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* ── Podaci obrta ── */}
      <SectionCard icon={IconBuildingStore} title="Podaci obrta">
        <Grid2>
          <Field label="Naziv obrta" required>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              disabled={!canEdit}
              placeholder="Naziv obrta"
              className={inputCls}
            />
          </Field>
          <Field label="JIB / Porezni broj">
            <input
              type="text"
              value={form.taxNumber}
              disabled
              placeholder="XXXXXXXXXXXXX"
              className={inputCls + " opacity-60"}
            />
          </Field>
          <Field label="Adresa">
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              disabled={!canEdit}
              placeholder="Ulica i broj"
              className={inputCls}
            />
          </Field>
          <Field label="Grad">
            <input
              type="text"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              disabled={!canEdit}
              placeholder="Grad"
              className={inputCls}
            />
          </Field>
        </Grid2>
      </SectionCard>

      {/* ── Vrsta obrta ── */}
      <SectionCard icon={IconCategory} title="Vrsta obrta">
        <Grid2>
          <Field label="Entitet">
            <select
              value={form.jurisdiction}
              onChange={(e) =>
                handleChange("jurisdiction", e.target.value as FormState["jurisdiction"])
              }
              disabled={!canEdit}
              className={selectCls}
            >
              <option value="">– odaberite –</option>
              {JURISDICTIONS.map((j) => (
                <option key={j.value} value={j.value}>{j.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Porezni režim">
            <select
              value={form.taxRegime}
              onChange={(e) =>
                handleChange("taxRegime", e.target.value as FormState["taxRegime"])
              }
              disabled={!canEdit}
              className={selectCls}
            >
              <option value="">– odaberite –</option>
              {TAX_REGIMES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </Grid2>
      </SectionCard>

      {/* ── PDV ── */}
      <SectionCard icon={IconReceiptTax} title="PDV">
        <div className="flex flex-col gap-4">
          <Field label="U sistemu PDV-a">
            <div className="flex gap-2">
              <RadioPill
                checked={!form.isPdvObveznik}
                onClick={() => handleChange("isPdvObveznik", false)}
                disabled={!canEdit}
                label="Ne"
              />
              <RadioPill
                checked={form.isPdvObveznik}
                onClick={() => handleChange("isPdvObveznik", true)}
                disabled={!canEdit}
                label="Da"
              />
            </div>
          </Field>
          {form.isPdvObveznik && (
            <Field label="PDV broj" hint="12 cifara">
              <input
                type="text"
                value={form.pdvNumber}
                onChange={(e) => handleChange("pdvNumber", e.target.value)}
                disabled={!canEdit}
                placeholder="XXXXXXXXXXXX"
                pattern="\d{12}"
                maxLength={12}
                className={inputCls + " max-w-xs"}
              />
            </Field>
          )}
        </div>
      </SectionCard>

      {/* ── Kontakt podaci ── */}
      <SectionCard icon={IconMail} title="Kontakt podaci obrta">
        <Grid2>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              disabled={!canEdit}
              placeholder="firma@email.ba"
              className={inputCls}
            />
          </Field>
          <Field label="Telefon">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              disabled={!canEdit}
              placeholder="+387 33 000 000"
              className={inputCls}
            />
          </Field>
        </Grid2>
      </SectionCard>

      {error && (
        <div className="text-[13px] text-warning bg-warning-bg border border-warning/20 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {canEdit ? (
        <div className="flex items-center justify-end gap-3">
          {savedAt && (
            <span className="text-[12.5px] text-success font-medium mr-auto">
              Snimljeno ✓
            </span>
          )}
          <button
            type="submit"
            disabled={update.isPending}
            className="px-6 py-2.5 bg-brand-600 hover:opacity-90 text-white text-[13.5px] font-medium rounded-md disabled:opacity-50 transition-opacity"
          >
            {update.isPending ? "Snimanje..." : "Sačuvaj izmjene"}
          </button>
        </div>
      ) : (
        <p className="text-[12.5px] text-text-tertiary">
          Samo vlasnik ili admin može mijenjati podatke.
        </p>
      )}
    </form>
  );
}

// ─── UI primitives ───────────────────────────────────────────────

const inputCls =
  "w-full px-3.5 py-2.5 text-[14px] bg-cream-100 border border-cream-300 rounded-md text-text-primary placeholder:text-text-tertiary/70 focus:outline-none focus:border-brand-600 focus:ring-[3px] focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-cream-50 transition-colors";

const selectCls =
  inputCls +
  " appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22><path fill=%22%237a8a7d%22 d=%22M1 1l5 5 5-5%22/></svg>')] bg-no-repeat pr-10 cursor-pointer";

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-cream-100 border border-cream-300 rounded-xl overflow-hidden">
      <header className="flex items-center gap-2.5 px-6 py-4 border-b border-cream-300">
        <Icon size={18} className="text-text-secondary" />
        <h2 className="text-[14.5px] font-medium text-text-primary">{title}</h2>
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] text-text-tertiary">
          {label}
          {required && <span className="text-warning ml-0.5">*</span>}
        </span>
        {hint && (
          <span className="text-[11px] text-text-tertiary">{hint}</span>
        )}
      </div>
      {children}
    </label>
  );
}

function RadioPill({
  checked,
  onClick,
  disabled,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "px-5 py-2 text-[13px] font-medium rounded-md border transition-colors min-w-[72px]",
        checked
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-cream-100 text-text-secondary border-cream-300 hover:border-text-tertiary/40 hover:text-text-primary",
        disabled ? "opacity-60 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
