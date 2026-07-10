"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconBuildingStore,
  IconBuildingBank,
  IconCategory,
  IconCoins,
  IconPhoto,
  IconReceiptTax,
  IconMail,
  IconPlus,
  IconTrash,
  IconUserCircle,
} from "@tabler/icons-react";
import {
  backendUrl,
  removeOrganizationLogo,
  uploadOrganizationLogo,
} from "src/api/invoices";
import { usePkOfficeMe, useActivateOrganization } from "src/hooks/usePkOfficeMe";
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "src/hooks/useOrganizationSettings";
import {
  createOrganization,
  SALARY_TYPE_LABELS,
  SALARY_TYPE_DESCRIPTIONS,
  type Jurisdiction,
  type OrgPayload,
  type OrgSettingsPayload,
  type SalaryType,
  type TaxCategory,
  type TaxRegime,
} from "src/api/profile";
import { aktivirajObrtUPkOffice } from "src/api/pkOffice";
import CitySelect from "src/components/CitySelect/CitySelect";
import { useCityLookup } from "src/hooks/useCities";
import { PkDateInput } from "src/components/app-shell/PkDateInput";
import { parseDateInput } from "src/lib/dateInput";
import { PkSelect } from "src/components/app-shell/PkSelect";
import { PkAmountInput } from "src/components/app-shell/PkAmountInput";
import ShifraCombobox from "src/components/ShifraCombobox/ShifraCombobox";
import { formatBankAccount } from "src/lib/bankCodes";
import { formatKm, parseKm } from "src/lib/amountInput";

const TAX_REGIMES: { value: TaxRegime; label: string }[] = [
  { value: "STVARNI_DOHODAK", label: "Stvarni dohodak (poslovne knjige)" },
  { value: "PAUSALNI", label: "Paušalni" },
  { value: "OSTALI", label: "Ostali obveznici" },
];

// Kategorije djelatnosti po režimu (osnovice, isto kao na marketing formi)
const TAX_CATEGORIES: Record<string, { value: TaxCategory; label: string }[]> = {
  STVARNI_DOHODAK: [
    { value: "SLOBODNA_ZANIMANJA", label: "Slobodna zanimanja (2.710 KM)" },
    { value: "OBRT_SRODNE", label: "Obrt i srodne djelatnosti (1.602 KM)" },
    { value: "POLJOPRIVREDA_SUMARSTVO", label: "Poljoprivreda i šumarstvo (715 KM)" },
    { value: "TRGOVAC_POJEDINAC", label: "Trgovac pojedinac (715 KM)" },
  ],
  PAUSALNI: [
    { value: "OBRT_SRODNE", label: "Obrt i srodne djelatnosti (1.355 KM)" },
    { value: "ESNAFSKI_ZANATI", label: "Niskoakumulativni esnafski zanati (616 KM)" },
    { value: "POLJOPRIVREDA_SUMARSTVO", label: "Poljoprivreda i šumarstvo (616 KM)" },
    { value: "TAXI", label: "Taxi prijevoz (616 KM)" },
    { value: "TRGOVAC_POJEDINAC", label: "Trgovac pojedinac (715 KM)" },
  ],
};

type FormState = {
  name: string;
  taxNumber: string;
  jurisdiction: Jurisdiction | "";
  taxRegime: TaxRegime | "";
  taxCategory: string;
  isPdvObveznik: boolean;
  pdvNumber: string;
  address: string;
  city: string;
  email: string;
  phone: string;
  activityCode: string;
  activityName: string;
  defaultSalaryType: SalaryType;
  mealAllowancePerDay: string;
  /** Svi žiro računi; prvi je glavni (maskirani XXX-XXX-XXXXXXXX-XX). */
  bankAccounts: string[];
};

const EMPTY: FormState = {
  name: "",
  taxNumber: "",
  jurisdiction: "",
  taxRegime: "",
  taxCategory: "",
  isPdvObveznik: false,
  pdvNumber: "",
  address: "",
  city: "",
  email: "",
  phone: "",
  activityCode: "",
  activityName: "",
  defaultSalaryType: "NETO_ISPLATA",
  mealAllowancePerDay: "",
  bankAccounts: [""],
};

// createMode: ista forma, ali prazna i "Snimi" KREIRA obrt (umjesto update):
// izbor moj obrt / obrt klijenta, kreiranje, aktivacija u PK Office slot i
// prebacivanje na novi obrt. Jedan izvor istine za polja i validacije.
export function ProfilTab({ createMode = false }: { createMode?: boolean }) {
  const me = usePkOfficeMe();
  const router = useRouter();
  const qc = useQueryClient();
  const activateOrg = useActivateOrganization();
  const activeOrgId = me.data?.activeOrganization?.id ?? me.data?.organizations?.[0]?.id ?? null;
  const settings = useOrganizationSettings(createMode ? null : activeOrgId);
  const update = useUpdateOrganizationSettings(activeOrgId ?? 0);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // create mode: vlasništvo + podaci vlasnika klijentskog obrta
  const [vlasnistvo, setVlasnistvo] = useState<"moj" | "klijent">("moj");
  const [owner, setOwner] = useState({
    firstName: "",
    lastName: "",
    jmbg: "",
    city: "",
    prijavaDate: "",
  });
  const [creating, setCreating] = useState(false);
  // latch: id već kreiranog obrta. Ako post-koraci (slot/aktivacija) padnu,
  // ponovni "Kreiraj" NE pravi duplikat, nego samo dovrši preostale korake.
  const [createdOrgId, setCreatedOrgId] = useState<number | null>(null);
  const [createdOrgName, setCreatedOrgName] = useState("");
  // gradovi moraju biti sa liste: iz njih se izvode kanton/općina za doprinose
  const { findByName } = useCityLookup();

  useEffect(() => {
    if (createMode) return;
    if (settings.data) {
      const o = settings.data;
      const accounts =
        o.bankAccounts && o.bankAccounts.length > 0
          ? o.bankAccounts
          : o.bankAccount
            ? [o.bankAccount]
            : [];
      setForm({
        name: o.name ?? "",
        taxNumber: o.taxNumber ?? "",
        jurisdiction: o.jurisdiction ?? "",
        taxRegime: o.taxRegime ?? "",
        taxCategory: o.taxCategory ?? "",
        isPdvObveznik: !!o.isPdvObveznik,
        pdvNumber: o.pdvNumber ?? "",
        address: o.address ?? "",
        city: o.city ?? "",
        email: o.email ?? "",
        phone: o.phone ?? "",
        activityCode: o.activityCode ?? "",
        activityName: o.activityName ?? "",
        defaultSalaryType: o.defaultSalaryType ?? "NETO_ISPLATA",
        mealAllowancePerDay:
          o.mealAllowancePerDay != null && Number(o.mealAllowancePerDay) > 0
            ? formatKm(Number(o.mealAllowancePerDay))
            : "",
        bankAccounts: accounts.length
          ? accounts.map(formatBankAccount)
          : [""],
      });
    }
  }, [createMode, settings.data]);

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    setSavedAt(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (createMode) {
      await handleCreate();
      return;
    }
    if (!activeOrgId) return;

    const payload: OrgSettingsPayload = {
      name: form.name.trim(),
      // entitet se u PK Office-u ne bira: sjedište obrta je u FBiH
      // (postojeća vrijednost se ne dira ako je već postavljena)
      jurisdiction: form.jurisdiction || "FBIH",
      taxRegime: form.taxRegime || null,
      // taxCategory šaljemo samo uz izabran režim; bez režima ga izostavljamo
      // (ne šaljemo null) da ne pregazimo postojeću vrijednost pri nevezanom
      // snimanju (npr. samo naziv)
      ...(form.taxRegime
        ? {
            taxCategory: (form.taxCategory ||
              null) as OrgSettingsPayload["taxCategory"],
          }
        : {}),
      isPdvObveznik: form.isPdvObveznik,
      pdvNumber: form.isPdvObveznik ? form.pdvNumber.trim() : "",
      address: form.address.trim(),
      city: form.city.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      activityCode: form.activityCode.trim() || undefined,
      activityName: form.activityName.trim() || undefined,
      defaultSalaryType: form.defaultSalaryType,
      mealAllowancePerDay: form.mealAllowancePerDay.trim()
        ? parseKm(form.mealAllowancePerDay)
        : null,
      // prvi račun iz liste backend tretira kao glavni (bankAccount)
      bankAccounts: form.bankAccounts
        .map((a) => a.replace(/\D/g, ""))
        .filter(Boolean),
    };

    try {
      await update.mutateAsync(payload);
      setSavedAt(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri snimanju");
    }
  }

  // Kreiranje novog obrta (create mode): POST /api/organizations, pa aktivacija
  // u PK Office slot i prebacivanje na novi obrt. Ako su slotovi puni, obrt je
  // kreiran ali ostajemo ovdje sa jasnom porukom (ne prebacujemo se na obrt
  // koji app switcher ne nudi).
  async function handleCreate() {
    setError(null);

    // validacije prije slanja: gradovi sa liste (kanton/općina za uplatnice
    // i doprinose), datum prijave u formatu DD.MM.GGGG.
    if (!findByName(form.city.trim())) {
      setError(
        "Grad obrta odaberi sa liste: iz njega se određuju kanton i općina za uplatnice.",
      );
      return;
    }
    if (vlasnistvo === "klijent") {
      if (!findByName(owner.city.trim())) {
        setError(
          "Grad vlasnika odaberi sa liste, potreban je za obračun doprinosa.",
        );
        return;
      }
      if (owner.prijavaDate.trim() && !parseDateInput(owner.prijavaDate)) {
        setError("Datum prijave vlasnika nije ispravan (DD.MM.GGGG.).");
        return;
      }
    }

    setCreating(true);
    try {
      // Ako je obrt već kreiran u prethodnom pokušaju (latch), preskoči kreiranje
      // i samo dovrši preostale korake, da resubmit ne napravi duplikat.
      let orgId = createdOrgId;
      let orgName = createdOrgName;
      if (orgId == null) {
        const payload: OrgPayload = {
          name: form.name.trim(),
          type: "BUSINESS",
          taxNumber: form.taxNumber.trim() || undefined,
          jurisdiction: "FBIH",
          taxRegime: form.taxRegime || null,
          ...(form.taxRegime
            ? {
                taxCategory: (form.taxCategory ||
                  null) as OrgPayload["taxCategory"],
              }
            : {}),
          isPdvObveznik: form.isPdvObveznik,
          pdvNumber: form.isPdvObveznik ? form.pdvNumber.trim() : "",
          address: form.address.trim(),
          city: form.city.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          activityCode: form.activityCode.trim() || undefined,
          activityName: form.activityName.trim() || undefined,
          defaultSalaryType: form.defaultSalaryType,
          mealAllowancePerDay: form.mealAllowancePerDay.trim()
            ? parseKm(form.mealAllowancePerDay)
            : null,
          bankAccounts: form.bankAccounts
            .map((a) => a.replace(/\D/g, ""))
            .filter(Boolean),
          ...(vlasnistvo === "klijent"
            ? {
                ownerData: {
                  firstName: owner.firstName.trim(),
                  lastName: owner.lastName.trim(),
                  jmbg: owner.jmbg.trim(),
                  city: owner.city.trim(),
                  // sa datumom vlasnik postaje PRIJAVLJEN radnik; bez njega
                  // ostaje DRAFT (prijava kasnije kroz JS3100 ili profil)
                  ...(owner.prijavaDate.trim()
                    ? { prijavaDate: parseDateInput(owner.prijavaDate) }
                    : {}),
                },
              }
            : {}),
        };

        const res = await createOrganization(payload);
        if (!res.ok) {
          setError(mapCreateError(res.error ?? "Greška pri kreiranju obrta."));
          return;
        }
        orgId = res.data.id;
        orgName = res.data.name;
        // latch odmah nakon uspješnog kreiranja
        setCreatedOrgId(orgId);
        setCreatedOrgName(orgName);
      }

      // aktivacija u PK Office slot; kad naplata nije uključena bezopasno je
      const slot = await aktivirajObrtUPkOffice(orgId);
      await qc.invalidateQueries({ queryKey: ["pk-office"] });
      await qc.invalidateQueries({ queryKey: ["organizations"] });
      if (!slot.ok && slot.error === "LIMIT_PAKETA") {
        setError(
          `Obrt "${orgName}" je kreiran, ali su svi slotovi paketa popunjeni pa nije aktiviran u PK Office. Oslobodi slot na stranici Organizacije ili nadogradi paket.`,
        );
        return;
      }

      // prebaci se na novi obrt i otvori njegove postavke
      await activateOrg.mutateAsync(orgId);
      router.replace("/app/postavke?tab=profil");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri kreiranju obrta.");
    } finally {
      setCreating(false);
    }
  }

  if (!createMode && (me.isLoading || settings.isLoading)) {
    return <div className="text-[13px] text-text-secondary">Učitavanje...</div>;
  }

  if (!createMode && !activeOrgId) {
    // prazno stanje u PK stilu: kartica + primarno dugme, ne goli tekst-link
    return (
      <div className="rounded-xl bg-cream-100 border border-cream-300 px-6 py-10 flex flex-col items-center text-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-brand-100 text-brand-700 inline-flex items-center justify-center">
          <IconBuildingStore size={22} />
        </span>
        <div>
          <div className="font-serif-display text-[19px] text-text-primary mb-1">
            Još nemate nijedan obrt
          </div>
          <p className="text-[13px] leading-6 text-text-tertiary max-w-[400px]">
            Sve u PK Office (izvodi, fakture, KPR, plate) vodi se po obrtu.
            Dodajte svoj obrt ili obrt klijenta kojem vodite knjige.
          </p>
        </div>
        <Link
          href="/app/postavke?tab=nova-organizacija"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <IconPlus size={15} />
          Dodaj novi obrt
        </Link>
      </div>
    );
  }

  const canEdit =
    createMode ||
    settings.data?.memberRole === "OWNER" ||
    settings.data?.memberRole === "ADMIN";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* ── Vlasništvo (samo pri kreiranju) ── */}
      {createMode && (
        <SectionCard icon={IconUserCircle} title="Novi obrt">
          <div className="flex flex-col gap-4">
            <Field label="Čiji je obrt?">
              <div className="flex gap-2">
                <RadioPill
                  checked={vlasnistvo === "moj"}
                  onClick={() => setVlasnistvo("moj")}
                  label="Moj obrt"
                />
                <RadioPill
                  checked={vlasnistvo === "klijent"}
                  onClick={() => setVlasnistvo("klijent")}
                  label="Obrt klijenta"
                />
              </div>
            </Field>
            {vlasnistvo === "klijent" && (
              <Grid2>
                <Field label="Ime vlasnika" required>
                  <input
                    type="text"
                    required
                    value={owner.firstName}
                    onChange={(e) =>
                      setOwner((s) => ({ ...s, firstName: e.target.value }))
                    }
                    placeholder="Ime"
                    className={inputCls}
                  />
                </Field>
                <Field label="Prezime vlasnika" required>
                  <input
                    type="text"
                    required
                    value={owner.lastName}
                    onChange={(e) =>
                      setOwner((s) => ({ ...s, lastName: e.target.value }))
                    }
                    placeholder="Prezime"
                    className={inputCls}
                  />
                </Field>
                <Field label="JMBG vlasnika" required hint="13 cifara">
                  <input
                    type="text"
                    required
                    value={owner.jmbg}
                    onChange={(e) =>
                      setOwner((s) => ({
                        ...s,
                        jmbg: e.target.value.replace(/\D/g, "").slice(0, 13),
                      }))
                    }
                    pattern="\d{13}"
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="XXXXXXXXXXXXX"
                    className={inputCls}
                  />
                </Field>
                <Field
                  label="Grad vlasnika (prebivalište)"
                  required
                  hint="sa liste: za obračun doprinosa"
                >
                  <CitySelect
                    value={owner.city}
                    onChange={(v) => setOwner((s) => ({ ...s, city: v }))}
                    className={inputCls}
                    strict
                    required
                  />
                </Field>
                <Field
                  label="Datum prijave vlasnika"
                  hint="bez datuma ostaje neprijavljen"
                >
                  <PkDateInput
                    value={owner.prijavaDate}
                    onChange={(v) =>
                      setOwner((s) => ({ ...s, prijavaDate: v }))
                    }
                    ariaLabel="Datum prijave vlasnika"
                  />
                  <p className="text-[11.5px] text-text-tertiary mt-1">
                    Sa datumom se vlasnik odmah vodi kao prijavljen (ulazi u
                    obračun doprinosa vlasnika); bez datuma se prijava radi
                    kasnije kroz JS3100 ili u profilu radnika.
                  </p>
                </Field>
              </Grid2>
            )}
            <p className="text-[12px] text-text-tertiary">
              {vlasnistvo === "moj"
                ? "Vlasnik obrta si ti: podaci vlasnika se povlače iz tvog profila."
                : "Vlasnik klijentskog obrta se vodi kao prijavljeni radnik (za obračun doprinosa vlasnika), zato treba JMBG. Ostali podaci se dopunjavaju kasnije."}
            </p>
          </div>
        </SectionCard>
      )}

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
          <Field
            label="JIB / Porezni broj"
            hint={createMode ? "13 cifara, može i kasnije" : undefined}
          >
            <input
              type="text"
              value={form.taxNumber}
              onChange={
                createMode
                  ? (e) =>
                      handleChange(
                        "taxNumber",
                        e.target.value.replace(/\D/g, "").slice(0, 13),
                      )
                  : undefined
              }
              disabled={!createMode}
              inputMode={createMode ? "numeric" : undefined}
              maxLength={13}
              placeholder="XXXXXXXXXXXXX"
              className={inputCls + (createMode ? "" : " opacity-60")}
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
          <Field
            label="Grad"
            required={createMode}
            hint="sa liste: određuje kanton i općinu za uplatnice"
          >
            {canEdit ? (
              <CitySelect
                value={form.city}
                onChange={(v) => handleChange("city", v)}
                className={inputCls}
                strict={createMode}
                required={createMode}
              />
            ) : (
              <input
                type="text"
                value={form.city}
                disabled
                placeholder="Grad"
                className={inputCls}
              />
            )}
          </Field>
          <div className="md:col-span-2">
            {/* šifrarnik KD BiH sa pretragom po šifri ili nazivu */}
            <ShifraCombobox
              code={form.activityCode}
              name={form.activityName}
              onChange={(code, name) => {
                setForm((s) => ({
                  ...s,
                  activityCode: code,
                  activityName: name,
                }));
                setSavedAt(null);
                setError(null);
              }}
              inputClassName={inputCls}
            />
          </div>
        </Grid2>
      </SectionCard>

      {/* ── Vrsta obrta ── */}
      {/* Entitet se ne bira: sjedište obrta je uvijek u FBiH (radnici mogu
          biti iz cijele BiH, to se vodi na radniku) */}
      <SectionCard icon={IconCategory} title="Vrsta obrta">
        <Grid2>
          <Field label="Porezni režim">
            <PkSelect
              ariaLabel="Porezni režim"
              value={form.taxRegime}
              onChange={(v) => {
                const regime = String(v ?? "") as FormState["taxRegime"];
                setForm((s) => ({ ...s, taxRegime: regime, taxCategory: "" }));
                setSavedAt(null);
                setError(null);
              }}
              disabled={!canEdit}
              placeholder="– odaberite –"
              options={[
                { value: "", label: "– odaberite –" },
                ...TAX_REGIMES.map((t) => ({ value: t.value, label: t.label })),
              ]}
              wrapStyle={{ width: "100%" }}
            />
          </Field>
          {(TAX_CATEGORIES[form.taxRegime] ?? []).length > 0 && (
            <Field label="Kategorija djelatnosti">
              <PkSelect
                ariaLabel="Kategorija djelatnosti"
                value={form.taxCategory}
                onChange={(v) => handleChange("taxCategory", String(v ?? ""))}
                disabled={!canEdit}
                placeholder="– odaberite –"
                options={[
                  { value: "", label: "– odaberite –" },
                  ...(TAX_CATEGORIES[form.taxRegime] ?? []).map((c) => ({
                    value: c.value,
                    label: c.label,
                  })),
                ]}
                wrapStyle={{ width: "100%" }}
              />
            </Field>
          )}
        </Grid2>
      </SectionCard>

      {/* ── Žiro računi ── */}
      <SectionCard icon={IconBuildingBank} title="Žiro računi">
        <div className="flex flex-col gap-2.5 max-w-md">
          {form.bankAccounts.map((acc, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={acc}
                onChange={(e) => {
                  const next = [...form.bankAccounts];
                  next[i] = formatBankAccount(e.target.value);
                  handleChange("bankAccounts", next);
                }}
                disabled={!canEdit}
                placeholder="XXX-XXX-XXXXXXXX-XX"
                inputMode="numeric"
                className={inputCls}
              />
              {i === 0 ? (
                <span className="text-[11.5px] font-medium text-brand-700 bg-brand-100 rounded-full px-2.5 py-1 shrink-0">
                  glavni
                </span>
              ) : (
                canEdit && (
                  <button
                    type="button"
                    aria-label="Ukloni račun"
                    onClick={() =>
                      handleChange(
                        "bankAccounts",
                        form.bankAccounts.filter((_, j) => j !== i),
                      )
                    }
                    className="w-9 h-9 shrink-0 rounded-md border border-cream-300 text-text-tertiary hover:text-danger hover:border-danger/40 inline-flex items-center justify-center transition-colors"
                  >
                    <IconTrash size={15} />
                  </button>
                )
              )}
            </div>
          ))}
          {canEdit && (
            <button
              type="button"
              onClick={() =>
                handleChange("bankAccounts", [...form.bankAccounts, ""])
              }
              className="self-start inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:text-brand-600"
            >
              <IconPlus size={15} />
              Dodaj račun
            </button>
          )}
          <p className="text-[12px] text-text-tertiary">
            Prvi račun je glavni: koristi se na fakturama i uplatnicama. Novi
            računi sa učitanih bankovnih izvoda dodaju se automatski.
          </p>
        </div>
      </SectionCard>

      {/* ── Plate i obračun ── */}
      <SectionCard icon={IconCoins} title="Plate i obračun">
        <Grid2>
          <Field label="Default tip plate (za nove radnike)">
            <PkSelect
              ariaLabel="Default tip plate"
              value={form.defaultSalaryType}
              onChange={(v) =>
                handleChange(
                  "defaultSalaryType",
                  String(v ?? "NETO_ISPLATA") as SalaryType,
                )
              }
              disabled={!canEdit}
              options={(["NETO_ISPLATA", "NETO_UGOVOR", "BRUTO"] as const).map(
                (t) => ({ value: t, label: SALARY_TYPE_LABELS[t] }),
              )}
              wrapStyle={{ width: "100%" }}
            />
            <p className="text-[11.5px] text-text-tertiary mt-1">
              {SALARY_TYPE_DESCRIPTIONS[form.defaultSalaryType]} Postojeći
              radnici ostaju onakvi kakvi su.
            </p>
          </Field>
          <Field
            label="Topli obrok po danu (KM)"
            hint="prazno = bez auto-stope"
          >
            <PkAmountInput
              value={form.mealAllowancePerDay}
              onChange={(v) => handleChange("mealAllowancePerDay", v)}
              disabled={!canEdit}
              ariaLabel="Topli obrok po danu"
            />
            <p className="text-[11.5px] text-text-tertiary mt-1">
              Obračun je množi sa brojem radnih dana iz šihterice. Pojedinom
              radniku se može postaviti druga stopa u njegovom profilu.
            </p>
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
        <p className="text-[12px] text-text-tertiary mt-3">
          Ako su upisani, telefon i e-mail se ispisuju u zaglavlju faktura i
          predračuna, uz naziv i adresu obrta.
        </p>
      </SectionCard>

      {/* ── Logo (tek nakon kreiranja: upload traži postojeći obrt) ── */}
      {!createMode && activeOrgId && (
        <SectionCard icon={IconPhoto} title="Logo">
          <LogoSection
            orgId={activeOrgId}
            logoUrl={settings.data?.logoUrl ?? null}
            canEdit={canEdit}
          />
        </SectionCard>
      )}

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
            disabled={update.isPending || creating}
            className="px-6 py-2.5 bg-brand-600 hover:opacity-90 text-white text-[13.5px] font-medium rounded-md disabled:opacity-50 transition-opacity"
          >
            {createMode
              ? creating
                ? "Kreiranje..."
                : "Kreiraj obrt"
              : update.isPending
                ? "Snimanje..."
                : "Sačuvaj izmjene"}
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

// Logo obrta: upload/uklanjanje odmah (van submit toka forme), prikazuje se
// u zaglavlju faktura i predračuna. Koristi postojeći /api/organizations/:id/logo.
function LogoSection({
  orgId,
  logoUrl,
  canEdit,
}: {
  orgId: number;
  logoUrl: string | null;
  canEdit: boolean;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["organization", "settings", orgId] });
    qc.invalidateQueries({ queryKey: ["organizations"] });
  }

  async function handleFile(file: File) {
    setErr(null);
    setBusy(true);
    try {
      const res = await uploadOrganizationLogo(orgId, file);
      if (!res.ok) {
        setErr(
          res.error === "INVALID_IMAGE_TYPE"
            ? "Dozvoljeni formati: PNG, JPG, WEBP."
            : res.error || "Greška pri uploadu.",
        );
        return;
      }
      invalidate();
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setErr(null);
    setBusy(true);
    try {
      const res = await removeOrganizationLogo(orgId);
      if (!res.ok) {
        setErr(res.error || "Greška pri brisanju.");
        return;
      }
      invalidate();
    } finally {
      setBusy(false);
    }
  }

  const fullUrl = logoUrl ? `${backendUrl()}${logoUrl}` : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {fullUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fullUrl}
            alt="Logo obrta"
            className="h-12 w-auto rounded-md border border-cream-300 bg-white"
          />
        ) : (
          <span className="text-[12.5px] text-text-tertiary italic">
            nije postavljen
          </span>
        )}
        {canEdit && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                if (inputRef.current) inputRef.current.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="px-3.5 py-2 rounded-md border border-cream-300 bg-cream-100 text-[13px] text-text-primary hover:bg-cream-200 transition-colors disabled:opacity-50"
            >
              {busy ? "Snimanje..." : fullUrl ? "Promijeni" : "Otpremi logo"}
            </button>
            {fullUrl && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                className="px-3.5 py-2 rounded-md border border-cream-300 text-[13px] text-text-tertiary hover:text-accent-500 hover:border-accent-500/40 transition-colors disabled:opacity-50"
              >
                Ukloni
              </button>
            )}
          </>
        )}
      </div>
      {err && <p className="text-[12.5px] text-accent-500">{err}</p>}
      <p className="text-[12px] text-text-tertiary">
        Maks. 2 MB, PNG / JPG / WEBP. Logo se ispisuje u zaglavlju faktura i
        predračuna.
      </p>
    </div>
  );
}

// Poruke grešaka kreiranja obrta (backend kodovi → tekst za korisnika)
function mapCreateError(e: string): string {
  switch (e) {
    case "FORBIDDEN":
      return "Dodavanje klijentskih obrta zahtijeva Pro/Business ili PK Office pretplatu.";
    case "CLIENT_ORG_LIMIT_REACHED":
      return "Dostignut je limit klijentskih organizacija za tvoj paket.";
    case "ALREADY_HAS_OWN_ORG_LIMIT":
      return "Dostignut je limit vlastitih organizacija za tvoj paket.";
    case "OFFICE_START_LIMIT":
      return "Office Start paket pokriva ukupno 2 obrta. Za više obrta nadogradi na Office Tim ili veći paket.";
    default:
      return e;
  }
}

// ─── UI primitives ───────────────────────────────────────────────

const inputCls =
  "w-full px-3.5 py-2.5 text-[14px] bg-cream-100 border border-cream-300 rounded-md text-text-primary placeholder:text-text-tertiary/70 focus:outline-none focus:border-brand-600 focus:ring-[3px] focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-cream-50 transition-colors";

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
    // Bez overflow-hidden: dropdown šifrarnika djelatnosti (apsolutno
    // pozicioniran) mora moći viriti van kartice.
    <section className="bg-cream-100 border border-cream-300 rounded-xl">
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
