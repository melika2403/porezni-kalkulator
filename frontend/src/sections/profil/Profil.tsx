"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./profil.module.css";
import { formatMoneyLive, formatMoneyBlur } from "src/lib/format";
import { KD_BIH, type KdBihEntry } from "src/data/kd-bih";
import {
  me,
  unwrap,
  changePassword,
  resendVerification,
  type AuthUser,
} from "src/api/auth";
import {
  LuPencil,
  LuSquareArrowUpRight,
  LuUser,
  LuUsers,
  LuFileDown,
  LuHistory,
  LuBuilding,
  LuShield,
  LuCreditCard,
  LuSettings,
  LuLayoutDashboard,
  LuCheck,
  LuPlus,
  LuChevronRight,
  LuCalculator,
  LuFileText,
  LuClock,
  LuReceipt,
  LuArrowRight,
  LuWallet,
} from "react-icons/lu";
import {
  updateProfile,
  getOrganizations,
  getClientOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  updateWorker,
  getForms,
  getAllMyWorkers,
  getMyStats,
  type MyStats,
  getPersonClients,
  createPersonClient,
  updatePersonClient,
  deletePersonClient,
  SALARY_TYPE_DESCRIPTIONS,
  SALARY_TYPE_LABELS,
  type Organization,
  type OrgPayload,
  type OrgOwnerPayload,
  type OwnerType,
  type DirectorEngagement,
  type FormRecord,
  type FormType,
  type PersonClient,
  type PersonClientPayload,
  type SalaryType,
} from "src/api/profile";
import RoleGuard from "src/components/RoleGuard/RoleGuard";
import OrganizationLogoUpload from "./OrganizationLogoUpload";
import CitySelect from "src/components/CitySelect/CitySelect";
import DateInput from "src/components/DateInput/DateInput";
import { useRole } from "src/hooks/useRole";
import Link from "next/link";
import {
  getAmortizacijaYears,
  getAmortizacija,
  deleteAmortizacija,
} from "src/api/amortizacija";
import { getDocument, deleteDocument } from "src/api/documents";
import {
  fillPldiTemplate,
  type PldiData,
} from "src/sections/amortizacija/fillPldi";
import {
  createPredracun,
  type Plan as PredracunPlan,
  type BillingCycle,
} from "src/api/backend/predracun/predracun";
import { PLAN_PRICING, formatKm } from "src/data/pricing";
import { fillAmsTemplate, type AmsData } from "src/sections/ams/fillAms";
import { fillSprTemplate, type SprData } from "src/sections/spr/fillSpr";
import { fillZo3Template, type Zo3Data } from "src/sections/zo3/fillZo3";
import { fillGpdTemplate, type GpdData } from "src/sections/gpd/fillGpd";
import {
  fillSihterica,
  type DayEntry as SihDayEntry,
} from "src/sections/sihterica/fillSihterica";
import {
  fillJs3100Template,
  type Js3100Data,
} from "src/sections/prijave-radnika/fillJs3100";
import {
  calcRow,
  parseDec,
  isoToDisplay,
  r2,
  VIJEK_STOPA,
  type ObveznikData,
  type AssetRow,
} from "src/sections/amortizacija/Amortizacija";

// ─── Labels ───────────────────────────────────────────────────────────────────

const ORG_TYPE_LABELS: Record<string, string> = {
  COMPANY: "Privredno društvo (d.o.o. / d.d.)",
  BUSINESS: "Obrt / Samostalna djelatnost",
};

const FORM_TYPE_LABELS: Record<FormType, string> = {
  GPD: "GPD",
  SPR: "SPR",
  ZO3: "ZO3",
  UGOVOR: "Ugovor",
  UOD: "Ugovor o djelu",
  SIH: "Šihterica",
  PLDI: "PLDI",
  AMS: "AMS",
  JS3100: "JS3100",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Nacrt",
  GENERATED: "Generisan",
  SUBMITTED: "Predat",
  ARCHIVED: "Arhiviran",
};

const MONTHS = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Maj",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dec",
];

function initials(u: AuthUser) {
  return `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase();
}

function typeBadgeClass(type: FormType, s: Record<string, string>) {
  const map: Record<FormType, string> = {
    GPD: s.badgeGpd,
    SPR: s.badgeSpr,
    ZO3: s.badgeZo3,
    UGOVOR: s.badgeUgovor,
    UOD: s.badgeUod ?? s.badgeUgovor,
    SIH: s.badgeSih ?? s.badgeUgovor,
    PLDI: s.badgePldi,
    AMS: s.badgeAms ?? s.badgeUgovor,
    JS3100: s.badgeJs3100 ?? s.badgeUgovor,
  };
  return `${s.formTypeBadge} ${map[type] ?? ""}`;
}

function statusClass(status: string, s: Record<string, string>) {
  const map: Record<string, string> = {
    DRAFT: s.statusDraft,
    GENERATED: s.statusGenerated,
    SUBMITTED: s.statusSubmitted,
    ARCHIVED: s.statusArchived,
  };
  return `${s.formStatus} ${map[status] ?? ""}`;
}

type Tab =
  | "pregled"
  | "profil"
  | "djelatnosti"
  | "klijenti"
  | "historija"
  | "sigurnost"
  | "pretplata"
  | "admin";

// ─── Moja djelatnost i primanja (vlastite org) ────────────────────────────────
// Za vlastite organizacije ne unosimo "podatke vlasnika" (vlasnik smo mi).
// Umjesto toga, ovdje na profilu biramo u kojoj smo svojoj org prijavljeni i,
// ovisno o tipu, postavljamo režim oporezivanja (obrt) ili svoju platu (d.o.o.).
function MyEmploymentCard({ ownOrgs }: { ownOrgs: Organization[] }) {
  const queryClient = useQueryClient();
  // Stvarno mjesto prijave = org gdje je vlasnik PRIJAVLJEN (može biti samo jedno).
  const employedOrg =
    ownOrgs.find((o) => o.owner?.employmentStatus === "PRIJAVLJEN") ?? null;
  const [selId, setSelId] = useState<number | null>(
    employedOrg?.id ?? ownOrgs[0]?.id ?? null,
  );
  const selected = ownOrgs.find((o) => o.id === selId) ?? null;
  const isObrt = selected?.type === "BUSINESS";

  const [regime, setRegime] = useState<OrgFormState["taxRegime"]>("");
  const [category, setCategory] = useState("");
  const [bruto, setBruto] = useState("");
  const [neto, setNeto] = useState("");
  const [saved, setSaved] = useState(false);

  const fmtMoney = (n: number) =>
    n.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Učitaj trenutne vrijednosti odabrane org kad se promijeni izbor.
  useEffect(() => {
    if (!selected) return;
    setRegime(selected.taxRegime ?? "");
    setCategory(selected.taxCategory ?? "");
    const ow = selected.owner;
    setBruto(ow?.salaryBruto != null ? fmtMoney(ow.salaryBruto) : "");
    setNeto(ow?.salaryNeto != null ? fmtMoney(ow.salaryNeto) : "");
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, selected?.taxRegime, selected?.taxCategory, selected?.owner?.id]);

  const flash = () => {
    queryClient.invalidateQueries({ queryKey: ["organizations"] });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const todayIso = () => new Date().toISOString().slice(0, 10);

  // Prijava je isključiva: u svojim organizacijama si zaposlen samo na jednom
  // mjestu. Kad sačuvaš izabranu, u ostalim svojim d.o.o. vlasnik se odjavi
  // (ODJAVLJEN, bez plate/prijave) pa ga ta firma ne vodi u obračunu/JS3100.
  // Forward-only: postojeći obračuni se NE diraju. Direktorski status (potpisnik)
  // ostaje, mijenja se samo radni odnos.
  const saveMut = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      if (isObrt) {
        await unwrap(
          updateOrganization(selected.id, {
            name: selected.name,
            type: selected.type,
            taxRegime: (regime || null) as OrgPayload["taxRegime"],
            taxCategory:
              regime && regime !== "OSTALI"
                ? ((category || null) as OrgPayload["taxCategory"])
                : null,
          }),
        );
        // Obrt-vlasnik (obrtnik) se vodi kao prijavljen radnik u ovoj org, pa
        // se prikazuje u radnicima samo ovdje.
        if (selected.owner?.id) {
          await unwrap(
            updateWorker(selected.id, selected.owner.id, {
              employmentStatus: "PRIJAVLJEN",
              ...(selected.owner.prijavaDate ? {} : { prijavaDate: todayIso() }),
            }),
          );
        }
      } else if (selected.owner?.id) {
        const b = parseMoney(bruto);
        const n = parseMoney(neto);
        const salaryType =
          n != null ? "NETO_ISPLATA" : b != null ? "BRUTO" : undefined;
        await unwrap(
          updateWorker(selected.id, selected.owner.id, {
            salaryBruto: b,
            salaryNeto: n,
            ...(salaryType && { salaryType }),
            // Ako je vlasnik ranije bio odjavljen (jer je prijava bila u drugoj
            // org-i), ponovo ga prijavljujemo ovdje.
            employmentStatus: "PRIJAVLJEN",
            ...(selected.owner.prijavaDate ? {} : { prijavaDate: todayIso() }),
          }),
        );
      }
      // Isključivost: odjavi vlasnika u SVIM ostalim svojim org (obrt i d.o.o.),
      // pa se prikazuješ kao radnik/vlasnik samo tamo gdje si prijavljen.
      const others = ownOrgs.filter(
        (o) => o.id !== selected.id && o.owner?.id,
      );
      for (const o of others) {
        const wid = o.owner?.id;
        if (!wid) continue;
        await unwrap(
          updateWorker(o.id, wid, {
            salaryBruto: null,
            salaryNeto: null,
            prijavaDate: null,
            employmentStatus: "ODJAVLJEN",
          }),
        );
      }
    },
    onSuccess: flash,
  });

  if (ownOrgs.length === 0) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMut.mutate();
  };

  const pending = saveMut.isPending;
  const error = saveMut.error;

  return (
    <div className={styles.card} style={{ marginTop: "1.5rem" }}>
      <div className={styles.cardHeader}>
        <p className={styles.cardTitle}>Moja djelatnost i primanja</p>
      </div>
      <div className={styles.infoCallout}>
        <LuShield size={16} />
        <span>
          Postavi svoje porezne obaveze kao vlasnik. Za obrt biraš režim
          oporezivanja, za d.o.o. upisuješ svoju platu, na osnovu toga se računa
          tvoj mjesečni obračun.
        </span>
      </div>

      <div
        style={{
          fontSize: 13,
          margin: "0.5rem 0 0.2rem",
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "#7a8a7d" }}>Trenutno prijavljen:</span>
        <strong style={{ color: "#3a5c42" }}>
          {employedOrg
            ? `${employedOrg.name} (${ORG_TYPE_LABELS[employedOrg.type] ?? employedOrg.type})`
            : "nigdje, izaberi i sačuvaj"}
        </strong>
      </div>

      <form className={styles.form} onSubmit={handleSave}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Prijavljen sam u</label>
          <select
            className={styles.select}
            value={selId ?? ""}
            onChange={(e) => setSelId(Number(e.target.value))}
          >
            {ownOrgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({ORG_TYPE_LABELS[o.type] ?? o.type})
              </option>
            ))}
          </select>
          <p
            className={styles.fieldHint}
            style={{ fontSize: 12, color: "#666", marginTop: "0.3rem" }}
          >
            Prijava je isključiva: kad sačuvaš, u ostalim svojim firmama (obrt i
            d.o.o.) se NE vodiš kao radnik/vlasnik (odjavljen, bez plate i
            doprinosa), prikazuješ se samo ovdje. Postojeći obračuni se ne mijenjaju.
          </p>
        </div>

        {selected && isObrt && (
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Režim oporezivanja</label>
              <select
                className={styles.select}
                value={regime}
                onChange={(e) => {
                  setRegime(e.target.value as OrgFormState["taxRegime"]);
                  setCategory("");
                }}
              >
                <option value="">– Odaberi –</option>
                <option value="STVARNI_DOHODAK">
                  Stvarni dohodak (poslovne knjige, čl. 19)
                </option>
                <option value="PAUSALNI">Paušalni iznos (čl. 31)</option>
                <option value="OSTALI">Ostali obveznici (čl. 6 t.10)</option>
              </select>
            </div>
            {regime && regime !== "OSTALI" && (
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Kategorija djelatnosti
                </label>
                <select
                  className={styles.select}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">– Odaberi –</option>
                  {regime === "STVARNI_DOHODAK" && (
                    <>
                      <option value="SLOBODNA_ZANIMANJA">
                        Slobodna zanimanja (2.710 KM)
                      </option>
                      <option value="OBRT_SRODNE">
                        Obrt i srodne djelatnosti (1.602 KM)
                      </option>
                      <option value="POLJOPRIVREDA_SUMARSTVO">
                        Poljoprivreda i šumarstvo (715 KM)
                      </option>
                      <option value="TRGOVAC_POJEDINAC">
                        Trgovac pojedinac (715 KM)
                      </option>
                    </>
                  )}
                  {regime === "PAUSALNI" && (
                    <>
                      <option value="OBRT_SRODNE">
                        Obrt i srodne djelatnosti (1.355 KM)
                      </option>
                      <option value="ESNAFSKI_ZANATI">
                        Niskoakumulativni esnafski zanati (616 KM)
                      </option>
                      <option value="POLJOPRIVREDA_SUMARSTVO">
                        Poljoprivreda i šumarstvo (616 KM)
                      </option>
                      <option value="TAXI">Taxi prijevoz (616 KM)</option>
                      <option value="TRGOVAC_POJEDINAC">
                        Trgovac pojedinac (715 KM)
                      </option>
                    </>
                  )}
                </select>
              </div>
            )}
          </div>
        )}

        {selected && !isObrt && selected.owner?.id && (
          <>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Bruto plata (KM)</label>
                <input
                  className={styles.input}
                  value={bruto}
                  onChange={(e) => setBruto(formatMoneyLive(e.target.value))}
                  onBlur={(e) => setBruto(formatMoneyBlur(e.target.value))}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Neto plata (KM)</label>
                <input
                  className={styles.input}
                  value={neto}
                  onChange={(e) => setNeto(formatMoneyLive(e.target.value))}
                  onBlur={(e) => setNeto(formatMoneyBlur(e.target.value))}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
            </div>
            <p
              className={styles.fieldHint}
              style={{ marginTop: "-0.3rem", fontSize: 12, color: "#666" }}
            >
              Upiši bruto ili neto (ili oba). Neto je ciljni iznos na ruke i vodi
              obračun.
            </p>
          </>
        )}

        {selected && !isObrt && !selected.owner?.id && (
          <p
            className={styles.fieldHint}
            style={{ fontSize: 13, color: "#666" }}
          >
            Vlasnik nije zaposlen u ovoj firmi (nije direktor po ugovoru o radu),
            pa nema plate ni mjesečnog obračuna. Model vlasništva se mijenja u
            postavkama firme.
          </p>
        )}

        {error && <div className={styles.errorMsg}>{error.message}</div>}
        {saved && <div className={styles.successMsg}>Sačuvano.</div>}
        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={pending || !selected || (!isObrt && !selected.owner?.id)}
          >
            {pending ? "Snimanje..." : "Sačuvaj"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Mali search u zaglavlju liste: input + X za reset. Filtrira već učitanu listu
// (client-side), bez novih poziva.
function HeaderSearch({
  value,
  onChange,
  placeholder = "Pretraži...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ position: "relative", width: 210, maxWidth: "55%" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "0.45rem 1.9rem 0.45rem 0.7rem",
          border: "1px solid var(--border)",
          borderRadius: 8,
          fontSize: 13,
          fontFamily: "inherit",
          background: "var(--white)",
          color: "var(--ink)",
          outline: "none",
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Očisti pretragu"
          title="Očisti"
          style={{
            position: "absolute",
            right: 4,
            top: "50%",
            transform: "translateY(-50%)",
            width: 22,
            height: 22,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "none",
            color: "var(--mid)",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            borderRadius: "50%",
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// Filter org liste po nazivu / JIB-u (client-side).
function filterOrgs<T extends { name?: string | null; taxNumber?: string | null }>(
  list: T[],
  q: string,
): T[] {
  const s = q.trim().toLowerCase();
  if (!s) return list;
  return list.filter((o) =>
    `${o.name ?? ""} ${o.taxNumber ?? ""}`.toLowerCase().includes(s),
  );
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfilTab({
  user,
  requestedEditOrgId,
  section = "all",
}: {
  user: AuthUser;
  requestedEditOrgId?: number | null;
  // "licni" = samo lični podaci (Profil tab), "djelatnost" = samo Moja
  // djelatnost (Moje Djelatnosti tab), "all" = oboje (back-compat).
  section?: "all" | "licni" | "djelatnost";
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  // own orgs
  const { data: orgs = [] } = useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
  });
  const ownOrgs = orgs.filter((o) => o.memberRole === "OWNER");
  const isSubscriber = user.role === "PRO" || user.role === "BUSINESS";
  // Limit vlastitih djelatnosti po planu: USER=1, PRO=2, BUSINESS/ADMIN=neograničeno.
  const ownOrgLimit =
    user.role === "BUSINESS" || user.role === "ADMIN"
      ? Infinity
      : user.role === "PRO"
        ? 2
        : 1;
  const canAddOwnOrg = ownOrgs.length < ownOrgLimit;

  const [editOwnId, setEditOwnId] = useState<number | null>(null);
  const [ownFilter, setOwnFilter] = useState("");
  const [editOwnOrg, setEditOwnOrg] = useState<OrgFormState>(emptyOrgForm);
  // Dodavanje nove djelatnosti ide kroz QuickCreateOrgModal (brzi wizard).
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const updateOwnOrgMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OrgPayload }) =>
      unwrap(updateOrganization(id, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setEditOwnId(null);
    },
  });

  const deleteOwnOrgMutation = useMutation({
    mutationFn: (id: number) => unwrap(deleteOrganization(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setEditOwnId(null);
      setConfirmDeleteId(null);
    },
  });

  const startEditOwnOrg = (org: Organization) => {
    setEditOwnId(org.id);
    setConfirmDeleteId(null);
    setEditOwnOrg({
      name: org.name,
      type: org.type,
      taxNumber: org.taxNumber ?? "",
      pdvNumber: org.pdvNumber ?? "",
      activityCode: org.activityCode ?? "",
      activityName: org.activityName ?? "",
      email: org.email ?? "",
      phone: org.phone ?? "",
      address: org.address ?? "",
      city: org.city ?? "",
      bankAccount: org.bankAccount ?? "",
      taxRegime: org.taxRegime ?? "",
      taxCategory: org.taxCategory ?? "",
      defaultSalaryType: org.defaultSalaryType ?? "NETO_ISPLATA",
      mealAllowancePerDay:
        org.mealAllowancePerDay != null ? String(org.mealAllowancePerDay) : "",
    });
    updateOwnOrgMutation.reset();
  };

  // Ako je iz URL-a stigao ?editOrg=X (npr. iz /organizacije Edit dugmeta),
  // automatski otvori edit formu za tu organizaciju kad se orgs lista učita.
  useEffect(() => {
    if (!requestedEditOrgId) return;
    const target = ownOrgs.find((o) => o.id === requestedEditOrgId);
    if (target && editOwnId !== target.id) {
      startEditOwnOrg(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedEditOrgId, ownOrgs.length]);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [jmbg, setJmbg] = useState(user.jmbg ?? "");
  const [idCardNumber, setIdCardNumber] = useState(user.idCardNumber ?? "");
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateProfile>[1]) =>
      unwrap(updateProfile(user.id, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    mutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      ...(jmbg.trim() && { jmbg: jmbg.trim() }),
      idCardNumber: idCardNumber.trim() || null,
    });
  };

  const handleCancel = () => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone ?? "");
    setAddress(user.address ?? "");
    setCity(user.city ?? "");
    setJmbg(user.jmbg ?? "");
    setIdCardNumber(user.idCardNumber ?? "");
    mutation.reset();
    setEditing(false);
  };

  const errorMsg = mutation.error
    ? mutation.error.message === "jmbg must be exactly 13 digits"
      ? "JMBG mora imati tačno 13 cifara."
      : mutation.error.message === "DUPLICATE_VALUE"
        ? "JMBG je već u upotrebi."
        : "Greška pri snimanju. Pokušajte ponovo."
    : null;

  // Postotak popunjenosti ličnih podataka (za prsten napretka).
  const personalDone = [
    !!(user.firstName && user.lastName),
    !!user.email,
    !!user.phone,
    !!user.jmbg,
    !!user.address,
    !!user.city,
    !!user.idCardNumber,
  ];
  const personalPct = Math.round(
    (personalDone.filter(Boolean).length / personalDone.length) * 100,
  );

  return (
    <div className={styles.panel}>
      {section !== "djelatnost" && (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardTitle}>Lični podaci</p>
          {!editing && (
            <button
              className={styles.btnEditInline}
              onClick={() => setEditing(true)}
            >
              <LuPencil size={14} /> Izmijeni
            </button>
          )}
        </div>

        {success && (
          <div className={styles.successMsg}>Profil uspješno sačuvan.</div>
        )}

        {!editing ? (
          <>
            <div className={styles.profileHead}>
              <div className={styles.profileAvatar}>{initials(user)}</div>
              <div className={styles.profileHeadInfo}>
                <div className={styles.profileHeadName}>
                  {user.firstName} {user.lastName}
                </div>
                {user.email && (
                  <div className={styles.profileHeadEmail}>{user.email}</div>
                )}
                <span
                  className={`${styles.roleChip} ${user.role === "PRO" ? styles.roleChipPro : user.role === "BUSINESS" ? styles.roleChipBusiness : user.role === "ADMIN" ? styles.roleChipAdmin : ""}`}
                >
                  {user.role}
                </span>
              </div>
              <button
                type="button"
                className={styles.progressChip}
                onClick={() => setEditing(true)}
                title="Dovrši podatke profila"
              >
                <ProgressRing pct={personalPct} />
                <span>
                  <span className={styles.progressVal}>Profil {personalPct}%</span>
                  <span className={styles.progressSub}>Dovrši podatke</span>
                </span>
              </button>
            </div>

            <div className={styles.detailGroup}>
              <div className={styles.detailGroupTitle}>Osnovni podaci</div>
              <ProfileDetailRow
                label="Ime i prezime"
                value={`${user.firstName} ${user.lastName}`}
              />
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>JMBG</span>
                <span className={styles.detailValue}>
                  {user.jmbg ? (
                    <span className={styles.jmbgBadge}>
                      🔒 Pohranjen i kriptiran
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={styles.addLink}
                      onClick={() => setEditing(true)}
                    >
                      Dodaj
                    </button>
                  )}
                </span>
              </div>
              <ProfileDetailRow
                label="Broj lične karte"
                value={user.idCardNumber}
                onAdd={() => setEditing(true)}
                last
              />
            </div>

            <div className={styles.infoCallout}>
              <LuShield size={16} />
              <span>
                JMBG je uvijek zaštićen kao lozinka i vidljiv samo Vama, ni
                administrator sistema nema pristup ovom podatku.
              </span>
            </div>

            <div className={styles.detailGroup}>
              <div className={styles.detailGroupTitle}>Kontakt</div>
              <ProfileDetailRow label="Email" value={user.email} />
              <ProfileDetailRow
                label="Telefon"
                value={user.phone}
                onAdd={() => setEditing(true)}
                last
              />
            </div>

            <div className={styles.detailGroup}>
              <div className={styles.detailGroupTitle}>Adresa</div>
              <ProfileDetailRow
                label="Adresa"
                value={user.address}
                onAdd={() => setEditing(true)}
              />
              <ProfileDetailRow
                label="Grad"
                value={user.city}
                onAdd={() => setEditing(true)}
                last
              />
            </div>
          </>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="firstName">
                  Ime
                </label>
                <input
                  id="firstName"
                  className={styles.input}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="lastName">
                  Prezime
                </label>
                <input
                  id="lastName"
                  className={styles.input}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Email</label>
              <input
                className={`${styles.input} ${styles.inputReadonly}`}
                value={user.email ?? "–"}
                readOnly
                tabIndex={-1}
              />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="phone">
                  Telefon
                </label>
                <input
                  id="phone"
                  className={styles.input}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+387 61 000 000"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="jmbg">
                  JMBG
                </label>
                <input
                  id="jmbg"
                  className={styles.input}
                  value={jmbg}
                  onChange={(e) => setJmbg(e.target.value)}
                  placeholder="1234567890123"
                  maxLength={13}
                />
                <span className={styles.secureHint}>
                  JMBG se kriptira i nikad nije vidljiv drugima.
                </span>
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="address">
                  Adresa
                </label>
                <input
                  id="address"
                  className={styles.input}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ulica i broj"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="city">
                  Grad
                </label>
                <CitySelect
                  id="city"
                  value={city}
                  onChange={setCity}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="idCardNumber">
                Broj lične karte
              </label>
              <input
                id="idCardNumber"
                className={styles.input}
                value={idCardNumber}
                onChange={(e) => setIdCardNumber(e.target.value)}
                placeholder="AB123456"
                maxLength={9}
              />
            </div>
            {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={handleCancel}
              >
                Odustani
              </button>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Snimanje..." : "Sačuvaj izmjene"}
              </button>
            </div>
          </form>
        )}
      </div>
      )}

      {section !== "djelatnost" && ownOrgs.length > 0 && (
        <MyEmploymentCard ownOrgs={ownOrgs} />
      )}

      {section !== "licni" && (
      <div className={styles.card} style={section === "all" ? { marginTop: "1.5rem" } : undefined}>
        <div className={styles.cardHeader}>
          <p className={styles.cardTitle}>Moja djelatnost</p>
          {ownOrgs.length > 1 && (
            <HeaderSearch
              value={ownFilter}
              onChange={(v) => {
                setOwnFilter(v);
                // zatvori eventualni otvoreni edit da ne ispadne iz filtera
                setEditOwnId(null);
              }}
              placeholder="Pretraži djelatnost..."
            />
          )}
        </div>

        {ownFilter.trim() && filterOrgs(ownOrgs, ownFilter).length === 0 && (
          <div className={styles.empty} style={{ padding: "1rem 0" }}>
            <div className={styles.emptyText}>Nema rezultata za pretragu.</div>
          </div>
        )}

        {filterOrgs(ownOrgs, ownFilter).map((org) => (
          <div key={org.id} className={styles.ownOrgItem}>
            {editOwnId === org.id ? (
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  updateOwnOrgMutation.mutate({
                    id: org.id,
                    payload: orgFormToPayload(editOwnOrg, null),
                  });
                }}
              >
                <OrgFormFields value={editOwnOrg} onChange={setEditOwnOrg} />
                {updateOwnOrgMutation.error && (
                  <div className={styles.errorMsg}>
                    {updateOwnOrgMutation.error.message}
                  </div>
                )}
                <RoleGuard roles={["PRO", "BUSINESS", "ADMIN"]} mode="hide">
                  <OrganizationLogoUpload orgId={org.id} logoUrl={org.logoUrl} />
                </RoleGuard>
                {deleteOwnOrgMutation.error && confirmDeleteId === org.id && (
                  <div className={styles.errorMsg}>
                    Greška pri brisanju. Pokušajte ponovo.
                  </div>
                )}
                {confirmDeleteId === org.id ? (
                  <div className={styles.deleteConfirm}>
                    <span className={styles.deleteConfirmText}>
                      Sigurno želite obrisati djelatnost? Ova akcija se ne može
                      poništiti.
                    </span>
                    <div className={styles.deleteConfirmActions}>
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Odustani
                      </button>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        onClick={() => deleteOwnOrgMutation.mutate(org.id)}
                        disabled={deleteOwnOrgMutation.isPending}
                      >
                        {deleteOwnOrgMutation.isPending
                          ? "Brisanje..."
                          : "Da, obriši"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.formActionsWithDelete}>
                    <button
                      type="button"
                      className={styles.btnDanger}
                      onClick={() => setConfirmDeleteId(org.id)}
                    >
                      Obriši djelatnost
                    </button>
                    <div className={styles.formActions} style={{ margin: 0 }}>
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => setEditOwnId(null)}
                      >
                        Odustani
                      </button>
                      <button
                        type="submit"
                        className={styles.btnPrimary}
                        disabled={updateOwnOrgMutation.isPending}
                      >
                        {updateOwnOrgMutation.isPending
                          ? "Snimanje..."
                          : "Sačuvaj"}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <button
                type="button"
                className={styles.bizCard}
                onClick={() => startEditOwnOrg(org)}
              >
                <span className={styles.bizAvatar}>{initials2(org.name)}</span>
                <span className={styles.bizInfo}>
                  <span className={styles.bizName}>{org.name}</span>
                  <span className={styles.bizSub}>
                    {ORG_TYPE_LABELS[org.type] ?? org.type}
                    {org.taxNumber ? ` · JIB: ${org.taxNumber}` : ""}
                  </span>
                </span>
                <LuChevronRight size={17} className={styles.bizChevron} />
              </button>
            )}
          </div>
        ))}

        {/* Dugme se vidi dok korisnik nije dosegao limit vlastitih djelatnosti
            za svoj plan (USER=1, PRO=2, BUSINESS/ADMIN=neograničeno). */}
        {!showAddOrg && editOwnId === null && canAddOwnOrg && (
          <button
            className={styles.addOrgToggle}
            onClick={() => setShowAddOrg(true)}
          >
            <span>+</span> Dodaj{" "}
            {ownOrgs.length > 0
              ? "još jednu djelatnost"
              : "svoju firmu ili obrt"}
          </button>
        )}

        {/* Upsell kad je korisnik na limitu (USER ili PRO). BUSINESS/ADMIN nemaju
            limit pa ne vide ovo. */}
        {!showAddOrg &&
          editOwnId === null &&
          !canAddOwnOrg &&
          user.role !== "BUSINESS" &&
          user.role !== "ADMIN" && (
            <div className={styles.lockedFeature}>
              <span>🔒</span>
              <span>
                {user.role === "USER" ? (
                  <>
                    Više djelatnosti dostupno uz pretplatu na{" "}
                    <strong>PRO ili BUSINESS plan</strong>.
                  </>
                ) : (
                  <>
                    Neograničen broj djelatnosti dostupan uz{" "}
                    <strong>BUSINESS plan</strong>.
                  </>
                )}
              </span>
            </div>
          )}

        {/* Dodavanje djelatnosti ide kroz isti brzi wizard kao na Pregledu. */}
        {showAddOrg && (
          <QuickCreateOrgModal
            onClose={() => setShowAddOrg(false)}
            onCreated={() => setShowAddOrg(false)}
          />
        )}
      </div>
      )}
    </div>
  );
}

// ─── Owner fields sub-form ────────────────────────────────────────────────────

// Opcija vlasništva (vidi 4-opcijski radio). Za obrt je uvijek "1".
type OwnerOption = "1" | "2" | "3" | "4";

// Stabilan klijentski kljuc za React liste (persons nemaju id); sprjecava
// pomjeranje fokusa/inputa kad se ukloni red iz sredine. Ne salje se na backend
// (payload se gradi eksplicitnim mapiranjem polja).
let _personUidSeq = 0;
const newPersonUid = () => `person-${_personUidSeq++}`;

type OwnerPersonFormState = {
  _uid: string;
  firstName: string;
  lastName: string;
  jmbg: string;
  idDoc: string;
};

type OwnerFormState = {
  // Model vlasništva (d.o.o.):
  ownerOption: OwnerOption;
  // Pod-tip za opciju 2 (firma/više lica/fizičko) i opciju 3 (domaće/strano).
  ownerType: OwnerType;
  firstName: string;
  lastName: string;
  jmbg: string;
  idDoc: string; // strani ID / pasoš (fizicko_strano)
  name: string; // naziv firme (pravno_lice) ili zbirni naziv (vise_lica)
  jib: string; // JIB (pravno_lice)
  persons: OwnerPersonFormState[];
  email: string;
  phone: string;
  address: string;
  city: string;
  idCardNumber: string;
  prijavaDate: string;
  salaryBruto: string;
  salaryNeto: string;
  taxCoefficient: string;
};

const emptyOwner: OwnerFormState = {
  ownerOption: "1",
  ownerType: "fizicko_domace",
  firstName: "",
  lastName: "",
  jmbg: "",
  idDoc: "",
  name: "",
  jib: "",
  persons: [],
  email: "",
  phone: "",
  address: "",
  city: "",
  idCardNumber: "",
  prijavaDate: "",
  salaryBruto: "",
  salaryNeto: "",
  taxCoefficient: "1.0",
};

const parseMoney = (s: string): number | null =>
  s.trim() ? Number(s.replace(/\./g, "").replace(",", ".")) : null;

// Iz opcije izvodi org-polja modela vlasništva.
function ownerModelFields(o: OwnerFormState): {
  ownerType: OwnerType;
  ownerIsDirector: boolean;
  directorEngagement: DirectorEngagement;
} {
  switch (o.ownerOption) {
    case "2":
      return {
        ownerType: o.ownerType,
        ownerIsDirector: false,
        directorEngagement: "ugovor_o_radu",
      };
    case "3":
      return {
        ownerType:
          o.ownerType === "fizicko_strano"
            ? "fizicko_strano"
            : "fizicko_domace",
        ownerIsDirector: true,
        directorEngagement: "menadzerski",
      };
    case "4":
      return {
        ownerType: "fizicko_strano",
        ownerIsDirector: false,
        directorEngagement: "ugovor_o_radu",
      };
    case "1":
    default:
      return {
        ownerType: "fizicko_domace",
        ownerIsDirector: true,
        directorEngagement: "ugovor_o_radu",
      };
  }
}

// Iz org-a izvodi koju opciju radio treba prikazati.
function deriveOwnerOption(org: Organization): OwnerOption {
  const isDir = org.ownerIsDirector ?? true;
  const eng = org.directorEngagement ?? "ugovor_o_radu";
  const t = org.ownerType ?? "fizicko_domace";
  if (isDir && eng === "menadzerski") return "3";
  if (!isDir) return t === "fizicko_strano" ? "4" : "2";
  return "1";
}

function ownerToPayload(o: OwnerFormState): OrgOwnerPayload {
  const { ownerType } = ownerModelFields(o);
  const isPerson =
    ownerType === "fizicko_domace" || ownerType === "fizicko_strano";
  const isLegal = ownerType === "pravno_lice";
  const isMulti = ownerType === "vise_lica";
  // Plata/prijava su relevantni samo za opciju 1 (vlasnik = prijavljen radnik).
  const isEmployed = o.ownerOption === "1";

  const bruto = parseMoney(o.salaryBruto);
  const neto = parseMoney(o.salaryNeto);
  const salaryType =
    neto != null ? "NETO_ISPLATA" : bruto != null ? "BRUTO" : undefined;
  const coef = Number(o.taxCoefficient.replace(",", "."));

  const payload: OrgOwnerPayload = {
    ...(o.email.trim() && { email: o.email.trim() }),
    ...(o.phone.trim() && { phone: o.phone.trim() }),
    ...(o.address.trim() && { address: o.address.trim() }),
    ...(o.city.trim() && { city: o.city.trim() }),
  };

  if (isPerson) {
    payload.firstName = o.firstName.trim();
    payload.lastName = o.lastName.trim();
    if (o.jmbg.trim()) payload.jmbg = o.jmbg.trim();
    if (o.idDoc.trim()) payload.idDoc = o.idDoc.trim();
    if (o.idCardNumber.trim()) payload.idCardNumber = o.idCardNumber.trim();
  } else if (isLegal) {
    payload.name = o.name.trim();
    if (o.jib.trim()) payload.jib = o.jib.trim();
  } else if (isMulti) {
    if (o.name.trim()) payload.name = o.name.trim();
    const persons = o.persons
      .filter((p) => p.firstName.trim() || p.lastName.trim())
      .map((p) => ({
        firstName: p.firstName.trim(),
        lastName: p.lastName.trim(),
        ...(p.jmbg.trim() && { jmbg: p.jmbg.trim() }),
        ...(p.idDoc.trim() && { idDoc: p.idDoc.trim() }),
      }));
    if (persons.length) payload.persons = persons;
  }

  if (isEmployed) {
    payload.prijavaDate = o.prijavaDate || null;
    payload.salaryBruto = bruto;
    payload.salaryNeto = neto;
    if (salaryType) payload.salaryType = salaryType;
    payload.taxCoefficient = Number.isFinite(coef) && coef >= 0 ? coef : 1.0;
  }

  return payload;
}

const OWNER_OPTIONS: { value: OwnerOption; title: string; desc: string }[] = [
  {
    value: "1",
    title: "Vlasnik je direktor i prijavljen (ugovor o radu)",
    desc: "Vlasnik je ujedno uposlenik i potpisnik. Ulazi u obračun plata.",
  },
  {
    value: "2",
    title: "Vlasnik nije prijavljen, samo evidencija",
    desc: "Vlasnik može biti druga firma ili više lica. Direktora i potpisnika označavate na jednom radniku.",
  },
  {
    value: "3",
    title: "Vlasnik je direktor po menadžerskom ugovoru",
    desc: "Vlasnik zastupa firmu kao direktor i potpisnik, ali nije prijavljen (bez plate i doprinosa).",
  },
  {
    value: "4",
    title: "Vlasnik je strano lice, nije prijavljen",
    desc: "Direktora i potpisnika označavate na jednom radniku.",
  },
];

function OwnerFields({
  value,
  onChange,
  requireJmbg = true,
  orgType = "COMPANY",
}: {
  value: OwnerFormState;
  onChange: (v: OwnerFormState) => void;
  requireJmbg?: boolean;
  // Obrt (BUSINESS): vlasnik je obrtnik (uvijek "opcija 1", bez radia).
  // d.o.o. (COMPANY): 4 opcije vlasništva (vidi OWNER_OPTIONS).
  orgType?: "COMPANY" | "BUSINESS";
}) {
  const isObrt = orgType === "BUSINESS";
  const set =
    (field: keyof OwnerFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [field]: e.target.value });

  const option: OwnerOption = isObrt ? "1" : value.ownerOption;
  const ownerType: OwnerType = isObrt ? "fizicko_domace" : value.ownerType;
  const isPerson =
    ownerType === "fizicko_domace" || ownerType === "fizicko_strano";
  const isLegal = ownerType === "pravno_lice";
  const isMulti = ownerType === "vise_lica";
  const isEmployed = option === "1"; // vlasnik = prijavljen radnik
  const jmbgRequired =
    isEmployed && requireJmbg && ownerType === "fizicko_domace";

  const setOption = (opt: OwnerOption) => {
    let ot = value.ownerType;
    if (opt === "1") ot = "fizicko_domace";
    else if (opt === "4") ot = "fizicko_strano";
    else if (
      opt === "2" &&
      !["pravno_lice", "vise_lica", "fizicko_domace"].includes(ot)
    )
      ot = "pravno_lice";
    else if (opt === "3" && !["fizicko_domace", "fizicko_strano"].includes(ot))
      ot = "fizicko_domace";
    onChange({ ...value, ownerOption: opt, ownerType: ot });
  };

  const addPerson = () =>
    onChange({
      ...value,
      persons: [
        ...value.persons,
        { _uid: newPersonUid(), firstName: "", lastName: "", jmbg: "", idDoc: "" },
      ],
    });
  const updatePerson = (i: number, patch: Partial<OwnerPersonFormState>) =>
    onChange({
      ...value,
      persons: value.persons.map((p, idx) =>
        idx === i ? { ...p, ...patch } : p,
      ),
    });
  const removePerson = (i: number) =>
    onChange({
      ...value,
      persons: value.persons.filter((_, idx) => idx !== i),
    });

  return (
    <div className={styles.ownerSection}>
      <p className={styles.ownerSectionTitle}>Podaci vlasnika</p>

      {/* 4-opcijski izbor modela vlasništva (samo d.o.o.) */}
      {!isObrt && (
        <div style={{ display: "grid", gap: "0.4rem", marginBottom: "0.9rem" }}>
          {OWNER_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex",
                gap: "0.6rem",
                alignItems: "flex-start",
                padding: "0.6rem 0.7rem",
                border:
                  option === opt.value
                    ? "1.5px solid var(--sage, #3a5c42)"
                    : "1px solid #d4cfc4",
                borderRadius: 10,
                cursor: "pointer",
                background: option === opt.value ? "#f3f7f3" : "transparent",
              }}
            >
              <input
                type="radio"
                name="ownerOption"
                checked={option === opt.value}
                onChange={() => setOption(opt.value)}
                style={{ marginTop: 3 }}
              />
              <span>
                <strong style={{ fontSize: 13 }}>{opt.title}</strong>
                <br />
                <span style={{ fontSize: 12, color: "#666" }}>{opt.desc}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Pod-tip vlasnika za opciju 2 */}
      {!isObrt && option === "2" && (
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tip vlasnika</label>
            <select
              className={styles.input}
              value={value.ownerType}
              onChange={(e) =>
                onChange({ ...value, ownerType: e.target.value as OwnerType })
              }
            >
              <option value="pravno_lice">Pravno lice (firma)</option>
              <option value="vise_lica">Više lica</option>
              <option value="fizicko_domace">Fizičko lice (domaće)</option>
            </select>
          </div>
          <div className={styles.field} />
        </div>
      )}
      {/* Pod-tip vlasnika za opciju 3 (domaće/strano) */}
      {!isObrt && option === "3" && (
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Tip vlasnika</label>
            <select
              className={styles.input}
              value={value.ownerType}
              onChange={(e) =>
                onChange({ ...value, ownerType: e.target.value as OwnerType })
              }
            >
              <option value="fizicko_domace">Domaće fizičko lice</option>
              <option value="fizicko_strano">Strano fizičko lice</option>
            </select>
          </div>
          <div className={styles.field} />
        </div>
      )}

      {/* IDENTITET - fizičko lice */}
      {isPerson && (
        <>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Ime vlasnika *</label>
              <input
                className={styles.input}
                value={value.firstName}
                onChange={set("firstName")}
                placeholder="Ime"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Prezime vlasnika *</label>
              <input
                className={styles.input}
                value={value.lastName}
                onChange={set("lastName")}
                placeholder="Prezime"
                required
              />
            </div>
          </div>
          <div className={styles.row}>
            {ownerType === "fizicko_domace" ? (
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  JMBG vlasnika {jmbgRequired ? "*" : "(opciono)"}
                </label>
                <input
                  className={styles.input}
                  value={value.jmbg}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      jmbg: e.target.value.replace(/\D/g, "").slice(0, 13),
                    })
                  }
                  placeholder="1234567890123"
                  inputMode="numeric"
                  maxLength={13}
                  required={jmbgRequired}
                />
                <span className={styles.secureHint}>
                  🔒 JMBG se kriptira i nikad nije vidljiv drugima
                </span>
              </div>
            ) : (
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Broj pasoša / strani ID (opciono)
                </label>
                <input
                  className={styles.input}
                  value={value.idDoc}
                  onChange={set("idDoc")}
                  placeholder="Npr. broj pasoša"
                />
              </div>
            )}
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Email vlasnika</label>
              <input
                className={styles.input}
                type="email"
                value={value.email}
                onChange={set("email")}
                placeholder="vlasnik@email.ba"
              />
            </div>
          </div>
        </>
      )}

      {/* IDENTITET - pravno lice (firma) */}
      {isLegal && (
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Naziv vlasnika (firme) *</label>
            <input
              className={styles.input}
              value={value.name}
              onChange={set("name")}
              placeholder="Naziv firme"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>JIB vlasnika (opciono)</label>
            <input
              className={styles.input}
              value={value.jib}
              onChange={(e) =>
                onChange({
                  ...value,
                  jib: e.target.value.replace(/\D/g, "").slice(0, 13),
                })
              }
              placeholder="13 cifara"
              inputMode="numeric"
              maxLength={13}
            />
          </div>
        </div>
      )}

      {/* IDENTITET - više lica */}
      {isMulti && (
        <>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Naziv (opciono)</label>
              <input
                className={styles.input}
                value={value.name}
                onChange={set("name")}
                placeholder="Npr. Suvlasnici ABC"
              />
            </div>
            <div className={styles.field} />
          </div>
          {value.persons.map((p, i) => (
            <div className={styles.row} key={p._uid}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Ime lica {i + 1}</label>
                <input
                  className={styles.input}
                  value={p.firstName}
                  onChange={(e) =>
                    updatePerson(i, { firstName: e.target.value })
                  }
                  placeholder="Ime"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Prezime lica {i + 1}
                  <button
                    type="button"
                    onClick={() => removePerson(i)}
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      color: "#b3261e",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    ukloni
                  </button>
                </label>
                <input
                  className={styles.input}
                  value={p.lastName}
                  onChange={(e) => updatePerson(i, { lastName: e.target.value })}
                  placeholder="Prezime"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addPerson}
            style={{
              fontSize: 12,
              color: "var(--sage, #3a5c42)",
              background: "none",
              border: "1px dashed #b9c4ba",
              borderRadius: 8,
              padding: "0.4rem 0.7rem",
              cursor: "pointer",
              marginBottom: "0.6rem",
            }}
          >
            + Dodaj lice
          </button>
        </>
      )}

      {/* KONTAKT - telefon + lična karta (lk samo za fizičko lice) */}
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Telefon vlasnika</label>
          <input
            className={styles.input}
            value={value.phone}
            onChange={set("phone")}
            placeholder="+387 61 000 000"
          />
        </div>
        {isPerson ? (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Broj lične karte (opciono)
            </label>
            <input
              className={styles.input}
              value={value.idCardNumber}
              onChange={set("idCardNumber")}
              placeholder="AB123456"
              maxLength={9}
            />
          </div>
        ) : (
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Email vlasnika</label>
            <input
              className={styles.input}
              type="email"
              value={value.email}
              onChange={set("email")}
              placeholder="vlasnik@email.ba"
            />
          </div>
        )}
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Adresa vlasnika</label>
          <input
            className={styles.input}
            value={value.address}
            onChange={set("address")}
            placeholder="Ulica i broj"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Grad / sjedište vlasnika</label>
          <CitySelect
            value={value.city}
            onChange={(v) => onChange({ ...value, city: v })}
            className={styles.input}
          />
        </div>
      </div>

      {/* Napomena: direktor/potpisnik se bira na radniku (opcije 2 i 4) */}
      {!isObrt && (option === "2" || option === "4") && (
        <p
          className={styles.fieldHint}
          style={{ fontSize: 12, color: "#666", marginTop: "0.2rem" }}
        >
          Direktora i potpisnika označite na kartici jednog radnika (stranica
          organizacije, uredi radnika). On potpisuje dokumente firme.
        </p>
      )}

      {/* ZAPOSLENJE - samo opcija 1 (vlasnik = prijavljen) i obrt */}
      {isEmployed && (
        <>
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Datum prijave (opciono),{" "}
                <span
                  style={{ color: "var(--mid)", fontWeight: 400, fontSize: 11 }}
                >
                  ako se unese, vlasnik se odmah računa kao prijavljen
                </span>
              </label>
              <DateInput
                className={styles.input}
                value={value.prijavaDate}
                onValueChange={(iso) =>
                  onChange({ ...value, prijavaDate: iso })
                }
              />
            </div>
            {!isObrt && (
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Bruto plata vlasnika (KM)
                </label>
                <input
                  className={styles.input}
                  value={value.salaryBruto}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      salaryBruto: formatMoneyLive(e.target.value),
                    })
                  }
                  onBlur={(e) =>
                    onChange({
                      ...value,
                      salaryBruto: formatMoneyBlur(e.target.value),
                    })
                  }
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>
            )}
          </div>
          {!isObrt && (
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Neto plata vlasnika (KM)
                </label>
                <input
                  className={styles.input}
                  value={value.salaryNeto}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      salaryNeto: formatMoneyLive(e.target.value),
                    })
                  }
                  onBlur={(e) =>
                    onChange({
                      ...value,
                      salaryNeto: formatMoneyBlur(e.target.value),
                    })
                  }
                  placeholder="0,00"
                  inputMode="decimal"
                />
                <span
                  className={styles.fieldHint}
                  style={{ marginTop: "0.3rem", fontSize: 12, color: "#666" }}
                >
                  Upiši bruto ili neto (ili oba). Neto je ciljni iznos na ruke i
                  vodi obračun.
                </span>
              </div>
              <div className={styles.field} />
            </div>
          )}
          {isObrt && (
            <p
              className={styles.fieldHint}
              style={{ marginTop: "-0.2rem", fontSize: 12, color: "#666" }}
            >
              Vlasnik obrta nema platu, doprinosi se računaju po režimu
              oporezivanja odabranom iznad.
            </p>
          )}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Porezni koeficijent,{" "}
                <span
                  style={{ color: "var(--mid)", fontWeight: 400, fontSize: 11 }}
                >
                  1.0 = 300 KM mjesečnog odbitka. Za obrt vlasnika koristi se
                  samo u godišnjem GPD-1051 obračunu.
                </span>
              </label>
              <input
                className={styles.input}
                value={value.taxCoefficient}
                onChange={set("taxCoefficient")}
                inputMode="decimal"
                placeholder="1.0"
              />
            </div>
            <div className={styles.field} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Org form state helpers ───────────────────────────────────────────────────

type OrgFormState = {
  name: string;
  type: "COMPANY" | "BUSINESS";
  taxNumber: string;
  pdvNumber: string;
  activityCode: string;
  activityName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  bankAccount: string;
  taxRegime: "" | "STVARNI_DOHODAK" | "PAUSALNI" | "OSTALI";
  taxCategory: string;
  defaultSalaryType: SalaryType;
  mealAllowancePerDay: string;
};

const emptyOrgForm: OrgFormState = {
  name: "",
  type: "COMPANY",
  taxNumber: "",
  pdvNumber: "",
  activityCode: "",
  activityName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  bankAccount: "",
  taxRegime: "",
  taxCategory: "",
  defaultSalaryType: "NETO_ISPLATA",
  mealAllowancePerDay: "",
};

function orgFormToPayload(
  f: OrgFormState,
  owner: OwnerFormState | null,
): OrgPayload {
  return {
    name: f.name.trim(),
    type: f.type,
    ...(f.taxNumber.trim() && { taxNumber: f.taxNumber.trim() }),
    ...(f.pdvNumber.trim() && { pdvNumber: f.pdvNumber.trim() }),
    activityCode: f.activityCode.trim() || undefined,
    activityName: f.activityName.trim() || undefined,
    ...(f.email.trim() && { email: f.email.trim() }),
    ...(f.phone.trim() && { phone: f.phone.trim() }),
    ...(f.address.trim() && { address: f.address.trim() }),
    ...(f.city.trim() && { city: f.city.trim() }),
    ...(f.bankAccount.trim() && { bankAccount: f.bankAccount.trim() }),
    // Režim i kategorija (samo za BUSINESS / obrt)
    taxRegime: f.type === "BUSINESS" ? (f.taxRegime || null) : null,
    taxCategory:
      f.type === "BUSINESS" && f.taxCategory
        ? (f.taxCategory as OrgPayload["taxCategory"])
        : null,
    defaultSalaryType: f.defaultSalaryType,
    mealAllowancePerDay: f.mealAllowancePerDay.trim()
      ? Number(f.mealAllowancePerDay.replace(",", "."))
      : null,
    // Model vlasništva ide na nivo organizacije. Za obrt je uvijek "opcija 1"
    // (vlasnik = obrtnik); backend ga svejedno tretira kao Worker VLASNIK.
    ...(owner &&
      f.type === "COMPANY" && {
        ...ownerModelFields(owner),
      }),
    ...(owner && { ownerData: ownerToPayload(owner) }),
  };
}

function ActivityCombobox({
  taxNumber,
  onTaxNumberChange,
  activityCode,
  activityName,
  onChange,
}: {
  taxNumber: string;
  onTaxNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  activityCode: string;
  activityName: string;
  onChange: (code: string, name: string) => void;
}) {
  const [codeVal, setCodeVal] = useState(activityCode);
  const [nameVal, setNameVal] = useState(activityName);
  const [active, setActive] = useState<"code" | "name" | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCodeVal(activityCode);
  }, [activityCode]);
  useEffect(() => {
    setNameVal(activityName);
  }, [activityName]);

  const query = active === "code" ? codeVal : active === "name" ? nameVal : "";

  const results = useMemo<KdBihEntry[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return KD_BIH.filter(
      (e) => e.code.startsWith(q) || e.name.toLowerCase().includes(q),
    ).slice(0, 60);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setActive(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (e: KdBihEntry) => {
    onChange(e.code, e.name);
    setCodeVal(e.code);
    setNameVal(e.name);
    setActive(null);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Porezni broj (JIB)</label>
          <input
            className={styles.input}
            value={taxNumber}
            onChange={onTaxNumberChange}
            placeholder="XXXXXXXXXXXXX"
            maxLength={13}
            inputMode="numeric"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Šifra djelatnosti</label>
          <input
            className={styles.input}
            value={codeVal}
            autoComplete="off"
            placeholder="47.11"
            maxLength={10}
            onFocus={() => setActive("code")}
            onChange={(ev) => {
              setCodeVal(ev.target.value);
              setActive("code");
              if (!ev.target.value) onChange("", "");
            }}
          />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Naziv djelatnosti</label>
        <input
          className={styles.input}
          value={nameVal}
          autoComplete="off"
          placeholder="Trgovina na malo..."
          onFocus={() => setActive("name")}
          onChange={(ev) => {
            setNameVal(ev.target.value);
            setActive("name");
            if (!ev.target.value) onChange("", "");
          }}
        />
      </div>
      {active && results.length > 0 && (
        <div className={styles.activityDropdown}>
          {results.map((e) => (
            <button
              key={e.code}
              type="button"
              className={styles.activityOption}
              onMouseDown={(ev) => {
                ev.preventDefault();
                select(e);
              }}
            >
              <span className={styles.activityCode}>{e.code}</span>
              <span className={styles.activityName}>{e.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OrgFormFields({
  value,
  onChange,
}: {
  value: OrgFormState;
  onChange: (v: OrgFormState) => void;
}) {
  const set =
    (field: keyof OrgFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...value, [field]: e.target.value });

  return (
    <>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Naziv *</label>
          <input
            className={styles.input}
            value={value.name}
            onChange={set("name")}
            placeholder="Naziv firme ili obrta"
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Tip *</label>
          <select
            className={styles.select}
            value={value.type}
            onChange={set("type")}
          >
            <option value="COMPANY">Privredno društvo (d.o.o. / d.d.)</option>
            <option value="BUSINESS">Obrt / Samostalna djelatnost</option>
          </select>
        </div>
      </div>
      <ActivityCombobox
        taxNumber={value.taxNumber}
        onTaxNumberChange={(e) =>
          onChange({ ...value, taxNumber: e.target.value.replace(/\D/g, "").slice(0, 13) })
        }
        activityCode={value.activityCode}
        activityName={value.activityName}
        onChange={(code, name) =>
          onChange({ ...value, activityCode: code, activityName: name })
        }
      />
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>PDV broj</label>
          <input
            className={styles.input}
            value={value.pdvNumber}
            onChange={(e) => onChange({ ...value, pdvNumber: e.target.value.replace(/\D/g, "").slice(0, 12) })}
            placeholder="XXXXXXXXXXXX"
            maxLength={12}
            inputMode="numeric"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Email</label>
          <input
            className={styles.input}
            type="email"
            value={value.email}
            onChange={set("email")}
            placeholder="firma@email.ba"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Telefon</label>
          <input
            className={styles.input}
            value={value.phone}
            onChange={set("phone")}
            placeholder="+387 33 000 000"
            maxLength={11}
          />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Adresa</label>
          <input
            className={styles.input}
            value={value.address}
            onChange={set("address")}
            placeholder="Ulica i broj"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Grad</label>
          <CitySelect
            value={value.city}
            onChange={(v) => onChange({ ...value, city: v })}
            className={styles.input}
          />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Žiro račun</label>
          <input
            className={styles.input}
            value={value.bankAccount}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 16);
              const parts = [
                d.slice(0, 3),
                d.slice(3, 6),
                d.slice(6, 14),
                d.slice(14, 16),
              ].filter(Boolean);
              onChange({ ...value, bankAccount: parts.join("-") });
            }}
            placeholder="XXX-XXX-XXXXXXXX-XX"
            inputMode="numeric"
          />
        </div>
      </div>
      {value.type === "BUSINESS" && (
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Režim oporezivanja vlasnika
            </label>
            <select
              className={styles.select}
              value={value.taxRegime}
              onChange={(e) =>
                onChange({
                  ...value,
                  taxRegime: e.target.value as OrgFormState["taxRegime"],
                  // Resetuj kategoriju jer su validne vrijednosti zavisne od režima
                  taxCategory: "",
                })
              }
            >
              <option value="">– Odaberi –</option>
              <option value="STVARNI_DOHODAK">
                Stvarni dohodak (poslovne knjige, čl. 19)
              </option>
              <option value="PAUSALNI">Paušalni iznos (čl. 31)</option>
              <option value="OSTALI">Ostali obveznici (čl. 6 t.10)</option>
            </select>
          </div>
          {value.taxRegime && value.taxRegime !== "OSTALI" && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Kategorija djelatnosti</label>
              <select
                className={styles.select}
                value={value.taxCategory}
                onChange={set("taxCategory")}
              >
                <option value="">– Odaberi –</option>
                {value.taxRegime === "STVARNI_DOHODAK" && (
                  <>
                    <option value="SLOBODNA_ZANIMANJA">
                      Slobodna zanimanja (2.710 KM)
                    </option>
                    <option value="OBRT_SRODNE">
                      Obrt i srodne djelatnosti (1.602 KM)
                    </option>
                    <option value="POLJOPRIVREDA_SUMARSTVO">
                      Poljoprivreda i šumarstvo (715 KM)
                    </option>
                    <option value="TRGOVAC_POJEDINAC">
                      Trgovac pojedinac (715 KM)
                    </option>
                  </>
                )}
                {value.taxRegime === "PAUSALNI" && (
                  <>
                    <option value="OBRT_SRODNE">
                      Obrt i srodne djelatnosti (1.355 KM)
                    </option>
                    <option value="ESNAFSKI_ZANATI">
                      Niskoakumulativni esnafski zanati (616 KM)
                    </option>
                    <option value="POLJOPRIVREDA_SUMARSTVO">
                      Poljoprivreda i šumarstvo (616 KM)
                    </option>
                    <option value="TAXI">Taxi prijevoz (616 KM)</option>
                    <option value="TRGOVAC_POJEDINAC">
                      Trgovac pojedinac (715 KM)
                    </option>
                  </>
                )}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Default tip plate za nove radnike u ovoj org-i. Knjigovođa može imati
          klijente sa različitim stilom (svi na minimalcu = NETO_ISPLATA;
          drugi sa ugovornim bruto-platama = BRUTO). */}
      <div className={styles.field} style={{ marginTop: "1rem" }}>
        <label className={styles.fieldLabel}>
          Default tip plate (za nove radnike)
        </label>
        <select
          className={styles.input}
          value={value.defaultSalaryType}
          onChange={(e) =>
            onChange({
              ...value,
              defaultSalaryType: e.target.value as SalaryType,
            })
          }
        >
          <option value="NETO_ISPLATA">
            {SALARY_TYPE_LABELS.NETO_ISPLATA}
          </option>
          <option value="NETO_UGOVOR">
            {SALARY_TYPE_LABELS.NETO_UGOVOR}
          </option>
          <option value="BRUTO">{SALARY_TYPE_LABELS.BRUTO}</option>
        </select>
        <p
          className={styles.fieldHint}
          style={{ marginTop: "0.3rem", fontSize: 12, color: "#666" }}
        >
          {SALARY_TYPE_DESCRIPTIONS[value.defaultSalaryType]} Postojeći
          radnici ostaju onakvi kakvi su.
        </p>
      </div>

      {/* Dnevna stopa toplog obroka: obračun je množi sa brojem radnih dana
          iz šihterice i sam popuni topli obrok. Pojedinom radniku se može
          postaviti druga stopa u njegovom profilu. */}
      <div className={styles.field} style={{ marginTop: "1rem" }}>
        <label className={styles.fieldLabel}>
          Topli obrok po danu (KM)
        </label>
        <input
          className={styles.input}
          type="text"
          inputMode="decimal"
          placeholder="npr. 16"
          value={value.mealAllowancePerDay}
          onChange={(e) =>
            onChange({
              ...value,
              mealAllowancePerDay: e.target.value.replace(/[^\d.,]/g, ""),
            })
          }
        />
        <p
          className={styles.fieldHint}
          style={{ marginTop: "0.3rem", fontSize: 12, color: "#666" }}
        >
          Obračun sam množi ovu stopu sa brojem radnih dana iz šihterice i
          popuni topli obrok. Ostavite prazno da unosite ručno. Neoporezivo do
          oko 17 KM/dan (2026).
        </p>
      </div>
    </>
  );
}

// ─── Person client form state helpers ────────────────────────────────────────

type PersonFormState = {
  firstName: string;
  lastName: string;
  jmbg: string;
  taxNumber: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  idCardNumber: string;
};

const emptyPersonForm: PersonFormState = {
  firstName: "",
  lastName: "",
  jmbg: "",
  taxNumber: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  idCardNumber: "",
};

function personFormToPayload(f: PersonFormState): PersonClientPayload {
  return {
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim(),
    ...(f.jmbg.trim() && { jmbg: f.jmbg.trim() }),
    ...(f.taxNumber.trim() && { taxNumber: f.taxNumber.trim() }),
    ...(f.email.trim() && { email: f.email.trim() }),
    ...(f.phone.trim() && { phone: f.phone.trim() }),
    ...(f.address.trim() && { address: f.address.trim() }),
    ...(f.city.trim() && { city: f.city.trim() }),
    ...(f.idCardNumber.trim() && { idCardNumber: f.idCardNumber.trim() }),
  };
}

function PersonFormFields({
  value,
  onChange,
  requireName = true,
}: {
  value: PersonFormState;
  onChange: (v: PersonFormState) => void;
  requireName?: boolean;
}) {
  const set =
    (field: keyof PersonFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [field]: e.target.value });

  return (
    <>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Ime *</label>
          <input
            className={styles.input}
            value={value.firstName}
            onChange={set("firstName")}
            placeholder="Ime"
            required={requireName}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Prezime *</label>
          <input
            className={styles.input}
            value={value.lastName}
            onChange={set("lastName")}
            placeholder="Prezime"
            required={requireName}
          />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>JMBG (opciono)</label>
          <input
            className={styles.input}
            value={value.jmbg}
            onChange={set("jmbg")}
            placeholder="XXXXXXXXXXXXX"
            maxLength={13}
            inputMode="numeric"
          />
          <span className={styles.secureHint}>
            🔒 JMBG se kriptira i nikad nije vidljiv drugima
          </span>
        </div>
        {/*
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Porezni broj (JMB/JMBG)</label>
          <input
            className={styles.input}
            value={value.taxNumber}
            onChange={set("taxNumber")}
            placeholder="1234567890"
            maxLength={13}
          />
        </div>
        */}
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Email</label>
          <input
            className={styles.input}
            type="email"
            value={value.email}
            onChange={set("email")}
            placeholder="klijent@email.ba"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Telefon</label>
          <input
            className={styles.input}
            value={value.phone}
            onChange={set("phone")}
            placeholder="+387 61 000 000"
            maxLength={11}
          />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Adresa</label>
          <input
            className={styles.input}
            value={value.address}
            onChange={set("address")}
            placeholder="Ulica i broj"
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Grad</label>
          <CitySelect
            value={value.city}
            onChange={(v) => onChange({ ...value, city: v })}
            className={styles.input}
          />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Broj lične karte (opciono)</label>
        <input
          className={styles.input}
          value={value.idCardNumber}
          onChange={set("idCardNumber")}
          placeholder="AB123456"
          maxLength={9}
        />
      </div>
    </>
  );
}

// ─── Klijenti tab ────────────────────────────────────────────────────────────

type AddMode = "client-org" | "person";

const PRO_CLIENT_LIMIT = 20;

function DjelatnostTab({
  requestedEditOrgId,
}: {
  requestedEditOrgId?: number | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { role } = useRole();
  const isPro = role === "PRO";

  const { data: clientOrgs = [], isLoading: orgsLoading } = useQuery<
    Organization[]
  >({
    queryKey: ["clientOrganizations"],
    queryFn: () => unwrap(getClientOrganizations()),
  });
  const [clientFilter, setClientFilter] = useState("");

  const { data: persons = [], isLoading: personsLoading } = useQuery<
    PersonClient[]
  >({
    queryKey: ["personClients"],
    queryFn: () => unwrap(getPersonClients()),
  });

  const personLimitReached = isPro && persons.length >= PRO_CLIENT_LIMIT;

  // add form state
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("client-org");
  const [addOrg, setAddOrg] = useState<OrgFormState>(emptyOrgForm);
  const [addOwner, setAddOwner] = useState<OwnerFormState>(emptyOwner);
  const [addPerson, setAddPerson] = useState<PersonFormState>(emptyPersonForm);

  // edit org state
  const [editId, setEditId] = useState<number | null>(null);
  const [editOrg, setEditOrg] = useState<OrgFormState>(emptyOrgForm);
  const [editOwner, setEditOwner] = useState<OwnerFormState>(emptyOwner);
  const [editHasOwner, setEditHasOwner] = useState(false);

  // edit person state
  const [editPersonId, setEditPersonId] = useState<number | null>(null);
  const [editPerson, setEditPerson] =
    useState<PersonFormState>(emptyPersonForm);

  // delete confirm state
  const [confirmDeleteOrgId, setConfirmDeleteOrgId] = useState<number | null>(
    null,
  );
  const [confirmDeletePersonId, setConfirmDeletePersonId] = useState<
    number | null
  >(null);

  const createOrgMutation = useMutation({
    mutationFn: (payload: OrgPayload) => unwrap(createOrganization(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientOrganizations"] });
      resetAddForm();
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OrgPayload }) =>
      unwrap(updateOrganization(id, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientOrganizations"] });
      setEditId(null);
    },
  });

  const createPersonMutation = useMutation({
    mutationFn: (payload: PersonClientPayload) =>
      unwrap(createPersonClient(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personClients"] });
      resetAddForm();
    },
  });

  const updatePersonMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<PersonClientPayload>;
    }) => unwrap(updatePersonClient(id, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personClients"] });
      setEditPersonId(null);
    },
  });

  const deleteClientOrgMutation = useMutation({
    mutationFn: (id: number) => unwrap(deleteOrganization(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientOrganizations"] });
      setConfirmDeleteOrgId(null);
      setEditId(null);
    },
  });

  const deletePersonMutation = useMutation({
    mutationFn: (id: number) => unwrap(deletePersonClient(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personClients"] });
      setConfirmDeletePersonId(null);
      setEditPersonId(null);
    },
  });

  const resetAddForm = () => {
    setShowAdd(false);
    setAddMode("client-org");
    setAddOrg(emptyOrgForm);
    setAddOwner(emptyOwner);
    setAddPerson(emptyPersonForm);
    createOrgMutation.reset();
    createPersonMutation.reset();
  };

  const startEditOrg = (org: Organization) => {
    setEditPersonId(null);
    setEditId(org.id);
    setEditOrg({
      name: org.name,
      type: org.type,
      taxNumber: org.taxNumber ?? "",
      pdvNumber: org.pdvNumber ?? "",
      activityCode: org.activityCode ?? "",
      activityName: org.activityName ?? "",
      email: org.email ?? "",
      phone: org.phone ?? "",
      address: org.address ?? "",
      city: org.city ?? "",
      bankAccount: org.bankAccount ?? "",
      taxRegime: org.taxRegime ?? "",
      taxCategory: org.taxCategory ?? "",
      defaultSalaryType: org.defaultSalaryType ?? "NETO_ISPLATA",
      mealAllowancePerDay:
        org.mealAllowancePerDay != null ? String(org.mealAllowancePerDay) : "",
    });
    const ow = org.owner;
    setEditHasOwner(!!ow);
    setEditOwner(
      ow
        ? {
            ownerOption: deriveOwnerOption(org),
            ownerType: ow.type ?? org.ownerType ?? "fizicko_domace",
            firstName: ow.firstName ?? "",
            lastName: ow.lastName ?? "",
            jmbg: ow.jmbg ?? "",
            idDoc: ow.idDoc ?? "",
            name: ow.name ?? "",
            jib: ow.jib ?? "",
            persons: (ow.persons ?? []).map((p) => ({
              _uid: newPersonUid(),
              firstName: p.firstName ?? "",
              lastName: p.lastName ?? "",
              jmbg: p.jmbg ?? "",
              idDoc: p.idDoc ?? "",
            })),
            email: ow.email ?? "",
            phone: ow.phone ?? "",
            address: ow.address ?? "",
            city: ow.city ?? "",
            idCardNumber: ow.idCardNumber ?? "",
            prijavaDate: ow.prijavaDate ?? "",
            salaryBruto:
              ow.salaryBruto != null
                ? ow.salaryBruto.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "",
            salaryNeto:
              ow.salaryNeto != null
                ? ow.salaryNeto.toLocaleString("de-DE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "",
            taxCoefficient:
              ow.taxCoefficient != null ? String(ow.taxCoefficient) : "1.0",
          }
        : emptyOwner,
    );
    updateOrgMutation.reset();
  };

  // Ako je iz URL-a stigao ?editOrg=X (npr. iz /organizacije Edit dugmeta),
  // automatski otvori edit formu za tu klijentsku organizaciju.
  useEffect(() => {
    if (!requestedEditOrgId) return;
    const target = clientOrgs.find((o) => o.id === requestedEditOrgId);
    if (target && editId !== target.id) {
      startEditOrg(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedEditOrgId, clientOrgs.length]);

  const startEditPerson = (p: PersonClient) => {
    setEditId(null);
    setEditPersonId(p.id);
    setEditPerson({
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      jmbg: p.jmbg ?? "",
      taxNumber: p.taxNumber ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      address: p.address ?? "",
      city: p.city ?? "",
      idCardNumber: p.idCardNumber ?? "",
    });
    updatePersonMutation.reset();
  };

  const isLoading = orgsLoading || personsLoading;

  if (isLoading) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <div className={styles.emptyText}>Učitavanje...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {/* ── Organizations ── */}
      <div className={styles.card} style={{ marginBottom: "1.5rem" }}>
        <div className={styles.cardHeader}>
          <p className={styles.cardTitle}>Klijentske organizacije</p>
          {clientOrgs.length > 1 && (
            <HeaderSearch
              value={clientFilter}
              onChange={(v) => {
                setClientFilter(v);
                // zatvori eventualni otvoreni edit da ne ispadne iz filtera
                setEditId(null);
              }}
              placeholder="Pretraži klijenta..."
            />
          )}
        </div>

        {clientOrgs.length === 0 && (
          <div className={styles.empty} style={{ padding: "1.5rem 0" }}>
            <div className={styles.emptyIcon}>
              <LuBuilding />
            </div>
            <div className={styles.emptyText}>
              Nema dodanih klijentskih organizacija.
            </div>
          </div>
        )}

        {clientOrgs.length > 0 &&
          clientFilter.trim() &&
          filterOrgs(clientOrgs, clientFilter).length === 0 && (
            <div className={styles.empty} style={{ padding: "1rem 0" }}>
              <div className={styles.emptyText}>Nema rezultata za pretragu.</div>
            </div>
          )}

        {clientOrgs.length > 0 && (
          <div className={styles.orgList}>
            {filterOrgs(clientOrgs, clientFilter).map((org) =>
              editId === org.id ? (
                <form
                  key={org.id}
                  className={styles.form}
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateOrgMutation.mutate({
                      id: org.id,
                      payload: orgFormToPayload(
                        editOrg,
                        editHasOwner ? editOwner : null,
                      ),
                    });
                  }}
                >
                  <OrgFormFields value={editOrg} onChange={setEditOrg} />
                  {org.memberRole !== "OWNER" && (
                    <label className={styles.ownerToggle}>
                      <input
                        type="checkbox"
                        checked={editHasOwner}
                        onChange={(e) => setEditHasOwner(e.target.checked)}
                      />
                      Uredi podatke vlasnika
                    </label>
                  )}
                  {editHasOwner && (
                    <OwnerFields
                      value={editOwner}
                      onChange={setEditOwner}
                      requireJmbg={false}
                      orgType={editOrg.type}
                    />
                  )}
                  {updateOrgMutation.error && (
                    <div className={styles.errorMsg}>
                      {updateOrgMutation.error.message}
                    </div>
                  )}
                  {(org.memberRole === "OWNER" || org.memberRole === "ADMIN") && (
                    <OrganizationLogoUpload orgId={org.id} logoUrl={org.logoUrl} />
                  )}
                  {confirmDeleteOrgId === org.id ? (
                    <div className={styles.deleteConfirm}>
                      <span className={styles.deleteConfirmText}>
                        Brisanjem se brišu i svi sačuvani obrasci ovog klijenta.
                        Sigurni ste?
                      </span>
                      <div className={styles.deleteConfirmActions}>
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => setConfirmDeleteOrgId(null)}
                        >
                          Odustani
                        </button>
                        <button
                          type="button"
                          className={styles.btnDanger}
                          disabled={deleteClientOrgMutation.isPending}
                          onClick={() => deleteClientOrgMutation.mutate(org.id)}
                        >
                          {deleteClientOrgMutation.isPending
                            ? "Brisanje..."
                            : "Obriši"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.formActions}>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        onClick={() => setConfirmDeleteOrgId(org.id)}
                      >
                        Obriši klijenta
                      </button>
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => setEditId(null)}
                      >
                        Odustani
                      </button>
                      <button
                        type="submit"
                        className={styles.btnPrimary}
                        disabled={updateOrgMutation.isPending}
                      >
                        {updateOrgMutation.isPending
                          ? "Snimanje..."
                          : "Sačuvaj"}
                      </button>
                    </div>
                  )}
                </form>
              ) : (
                <button
                  key={org.id}
                  type="button"
                  className={styles.bizCard}
                  onClick={() =>
                    org.memberRole === "OWNER" || org.memberRole === "ADMIN"
                      ? startEditOrg(org)
                      : router.push(`/organizacija/${org.id}`)
                  }
                >
                  <span className={`${styles.bizAvatar} ${styles.bizAvatarAccent}`}>
                    {initials2(org.name)}
                  </span>
                  <span className={styles.bizInfo}>
                    <span className={styles.bizName}>{org.name}</span>
                    <span className={styles.bizSub}>
                      {ORG_TYPE_LABELS[org.type] ?? org.type}
                      {org.taxNumber ? ` · JIB: ${org.taxNumber}` : ""}
                    </span>
                  </span>
                  <LuChevronRight size={17} className={styles.bizChevron} />
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {/* ── Person clients ── */}
      <div className={styles.card} style={{ marginBottom: "1.5rem" }}>
        <div className={styles.cardHeader}>
          <p className={styles.cardTitle}>Fizička lica (klijenti)</p>
        </div>
        <RoleGuard roles={["PRO", "BUSINESS", "ADMIN"]}>
          <>
            {persons.length === 0 && (
              <div className={styles.empty} style={{ padding: "1.5rem 0" }}>
                <div className={styles.emptyIcon}>
                  <LuUser />
                </div>
                <div className={styles.emptyText}>
                  Nema dodanih fizičkih lica.
                </div>
              </div>
            )}

            {persons.length > 0 && (
              <div className={styles.orgList}>
                {persons.map((p) =>
                  editPersonId === p.id ? (
                    <form
                      key={p.id}
                      className={styles.form}
                      onSubmit={(e) => {
                        e.preventDefault();
                        updatePersonMutation.mutate({
                          id: p.id,
                          payload: personFormToPayload(editPerson),
                        });
                      }}
                    >
                      <PersonFormFields
                        value={editPerson}
                        onChange={setEditPerson}
                      />
                      {updatePersonMutation.error && (
                        <div className={styles.errorMsg}>
                          {updatePersonMutation.error.message}
                        </div>
                      )}
                      {confirmDeletePersonId === p.id ? (
                        <div className={styles.deleteConfirm}>
                          <span className={styles.deleteConfirmText}>
                            Brisanjem se brišu i svi sačuvani obrasci ovog
                            klijenta. Sigurni ste?
                          </span>
                          <div className={styles.deleteConfirmActions}>
                            <button
                              type="button"
                              className={styles.btnGhost}
                              onClick={() => setConfirmDeletePersonId(null)}
                            >
                              Odustani
                            </button>
                            <button
                              type="button"
                              className={styles.btnDanger}
                              disabled={deletePersonMutation.isPending}
                              onClick={() => deletePersonMutation.mutate(p.id)}
                            >
                              {deletePersonMutation.isPending
                                ? "Brisanje..."
                                : "Obriši"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.formActions}>
                          <button
                            type="button"
                            className={styles.btnDanger}
                            onClick={() => setConfirmDeletePersonId(p.id)}
                          >
                            Obriši klijenta
                          </button>
                          <button
                            type="button"
                            className={styles.btnGhost}
                            onClick={() => setEditPersonId(null)}
                          >
                            Odustani
                          </button>
                          <button
                            type="submit"
                            className={styles.btnPrimary}
                            disabled={updatePersonMutation.isPending}
                          >
                            {updatePersonMutation.isPending
                              ? "Snimanje..."
                              : "Sačuvaj"}
                          </button>
                        </div>
                      )}
                    </form>
                  ) : (
                    <button
                      key={p.id}
                      type="button"
                      className={styles.bizCard}
                      onClick={() => startEditPerson(p)}
                    >
                      <span className={`${styles.bizAvatar} ${styles.bizAvatarAccent}`}>
                        {initials2(`${p.firstName ?? ""} ${p.lastName ?? ""}`)}
                      </span>
                      <span className={styles.bizInfo}>
                        <span className={styles.bizName}>
                          {p.firstName} {p.lastName}
                        </span>
                        <span className={styles.bizSub}>
                          Fizičko lice
                          {p.taxNumber ? ` · ${p.taxNumber}` : ""}
                        </span>
                      </span>
                      <LuChevronRight size={17} className={styles.bizChevron} />
                    </button>
                  ),
                )}
              </div>
            )}
          </>
        </RoleGuard>
      </div>

      {/* ── Add form ── */}
      <div className={styles.card}>
        {!showAdd ? (
          <button
            type="button"
            className={styles.addOrgToggle}
            onClick={() => {
              setShowAdd(true);
              setAddMode("client-org");
            }}
          >
            <span>+</span> Dodaj klijenta
          </button>
        ) : (
          <div className={styles.addOrgForm}>
            <p className={styles.addOrgTitle}>Šta želite dodati?</p>

            <div className={styles.orgTypeRadios}>
              <RoleGuard roles={["PRO", "BUSINESS", "ADMIN"]}>
                <label
                  className={`${styles.orgTypeRadio} ${addMode === "client-org" ? styles.orgTypeRadioActive : ""}`}
                >
                  <input
                    type="radio"
                    name="addMode"
                    checked={addMode === "client-org"}
                    onChange={() => setAddMode("client-org")}
                  />
                  <span className={styles.orgTypeRadioIcon}>
                    <LuUsers />
                  </span>
                  <div>
                    <div className={styles.orgTypeRadioLabel}>
                      Djelatnost klijenta
                    </div>
                    <div className={styles.orgTypeRadioDesc}>
                      Firma/obrt klijenta
                    </div>
                  </div>
                </label>
              </RoleGuard>

              <RoleGuard roles={["PRO", "BUSINESS", "ADMIN"]}>
                <label
                  className={`${styles.orgTypeRadio} ${addMode === "person" ? styles.orgTypeRadioActive : ""}`}
                >
                  <input
                    type="radio"
                    name="addMode"
                    checked={addMode === "person"}
                    onChange={() => setAddMode("person")}
                  />
                  <span className={styles.orgTypeRadioIcon}>
                    <LuUser />
                  </span>
                  <div>
                    <div className={styles.orgTypeRadioLabel}>Fizičko lice</div>
                    <div className={styles.orgTypeRadioDesc}>
                      Klijent bez firme
                    </div>
                  </div>
                </label>
              </RoleGuard>
            </div>

            {addMode === "person" ? (
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (personLimitReached) return;
                  createPersonMutation.mutate(personFormToPayload(addPerson));
                }}
              >
                <PersonFormFields value={addPerson} onChange={setAddPerson} />
                {personLimitReached && (
                  <div className={styles.upgradeNotice}>
                    <strong>
                      Dosegli ste limit od {PRO_CLIENT_LIMIT} fizičkih lica
                    </strong>{" "}
                    na Pro pretplati. Ako želite dodati više klijenata,
                    nadogradite pretplatu na Business.
                    <Link
                      href="/profil#pretplata"
                      className={styles.upgradeLink}
                    >
                      Nadogradi na Business →
                    </Link>
                  </div>
                )}
                {createPersonMutation.error && !personLimitReached && (
                  <div className={styles.errorMsg}>
                    {createPersonMutation.error.message === "PRO_LIMIT_REACHED"
                      ? `Dosegli ste limit od ${PRO_CLIENT_LIMIT} fizičkih lica. Nadogradite na Business.`
                      : createPersonMutation.error.message}
                  </div>
                )}
                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={resetAddForm}
                  >
                    Odustani
                  </button>
                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={
                      createPersonMutation.isPending || personLimitReached
                    }
                  >
                    {createPersonMutation.isPending ? "Dodavanje..." : "Dodaj"}
                  </button>
                </div>
              </form>
            ) : (
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  createOrgMutation.mutate(orgFormToPayload(addOrg, addOwner));
                }}
              >
                <OrgFormFields value={addOrg} onChange={setAddOrg} />
                {addMode === "client-org" && (
                  <OwnerFields
                    value={addOwner}
                    onChange={setAddOwner}
                    orgType={addOrg.type}
                  />
                )}
                {createOrgMutation.error && (
                  <div className={styles.errorMsg}>
                    {createOrgMutation.error.message === "ALREADY_HAS_OWN_ORG"
                      ? "Možete imati samo jednu vlastitu organizaciju."
                      : createOrgMutation.error.message ===
                          "ACCOUNTANT_CANNOT_OWN_ORG"
                        ? "Računovođe ne mogu imati vlastitu organizaciju."
                        : createOrgMutation.error.message ===
                            "CLIENT_ORG_LIMIT_REACHED"
                          ? "Dosegli ste limit klijentskih organizacija za vaš plan (PRO: 20). Nadogradite na Business za neograničeno."
                          : createOrgMutation.error.message}
                  </div>
                )}
                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={resetAddForm}
                  >
                    Odustani
                  </button>
                  <RoleGuard roles={["PRO", "BUSINESS", "ADMIN"]} mode="hide">
                    <button
                      type="submit"
                      className={styles.btnPrimary}
                      disabled={createOrgMutation.isPending}
                    >
                      {createOrgMutation.isPending ? "Dodavanje..." : "Dodaj"}
                    </button>
                  </RoleGuard>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Historija tab ────────────────────────────────────────────────────────────

type HistorijaFilter = FormType | "ALL" | "PLDI";

const FILTER_OPTIONS: Array<{ label: string; value: HistorijaFilter }> = [
  { label: "Sve", value: "ALL" },
  { label: "AMS", value: "AMS" },
  { label: "GPD", value: "GPD" },
  { label: "SPR", value: "SPR" },
  { label: "ZO3", value: "ZO3" },
  { label: "Ugovor o pozajmici", value: "UGOVOR" },
  { label: "Ugovor o djelu", value: "UOD" },
  { label: "Šihterica", value: "SIH" },
  { label: "JS3100", value: "JS3100" },
  { label: "Stalna sredstva (PLDI)", value: "PLDI" },
];

async function regenerateAndDownload(form: FormRecord) {
  const res = await getDocument(form.id);
  if (!res.ok || !res.data?.data) return;
  const raw = res.data.data as unknown;
  let bytes: Uint8Array | null = null;
  let filename = `${form.type}_${form.year}.pdf`;
  if (form.type === "AMS") {
    bytes = await fillAmsTemplate(raw as AmsData);
    filename = `AMS-1035_${form.month ? String(form.month).padStart(2, "0") : "XX"}_${form.year}.pdf`;
  } else if (form.type === "SPR") {
    bytes = await fillSprTemplate(raw as SprData);
    filename = `SPR-1053_${form.year}.pdf`;
  } else if (form.type === "ZO3") {
    bytes = await fillZo3Template(raw as Zo3Data);
    filename = `ZO3_${form.year}.pdf`;
  } else if (form.type === "GPD") {
    bytes = await fillGpdTemplate(raw as GpdData);
    filename = `GPD-1051_${form.year}.pdf`;
  } else if (form.type === "PLDI") {
    const { obveznik, rows } = raw as {
      obveznik: ObveznikData;
      rows: AssetRow[];
    };
    const odISO = obveznik.periodOd || `${form.year}-01-01`;
    const doISO = obveznik.periodDo || `${form.year}-12-31`;
    let nabavna = 0,
      kv = 0,
      iznos = 0,
      kvKraj = 0;
    const pldiRows = rows.map((row) => {
      const calc = calcRow(row, odISO, doISO);
      if (!row.prodano) {
        nabavna += parseDec(row.nabavnaVrijednost) ?? 0;
        kv += parseDec(row.kvPocetak) ?? 0;
        kvKraj += calc.kvKraj ?? 0;
      }
      iznos += calc.iznos ?? 0;
      return {
        naziv: row.naziv,
        datumNabavke: isoToDisplay(row.datumNabavke),
        brojDokumenta: row.brojDokumenta,
        nabavnaVrijednost: parseDec(row.nabavnaVrijednost),
        kvPocetak: parseDec(row.kvPocetak),
        vijekTrajanja: row.vijekTrajanja,
        stopa: calc.stopa,
        iznos: calc.iznos,
        kvKraj: calc.kvKraj,
        napomena: row.napomena ?? "",
        prodanoText: row.prodano
          ? `PR.${row.datumProdaje ? ` ${isoToDisplay(row.datumProdaje)}` : ""}`
          : undefined,
      };
    });
    const pldiData: PldiData = {
      jmb: obveznik.jmb,
      imeIPrezime: obveznik.imeIPrezime,
      adresa: obveznik.adresa,
      jib: obveznik.jib,
      naziv: obveznik.naziv,
      adresaDjelatnosti: obveznik.adresaDjelatnosti,
      vrstaSifra: obveznik.vrstaSifra,
      vrstaNaziv: obveznik.vrstaNaziv,
      godina: String(form.year),
      periodOd: isoToDisplay(odISO),
      periodDo: isoToDisplay(doISO),
      rows: pldiRows,
      totalNabavna: r2(nabavna),
      totalKv: r2(kv),
      totalIznos: r2(iznos),
      totalKvKraj: r2(kvKraj),
    };
    bytes = await fillPldiTemplate(pldiData);
    filename = `PLDI-1043_${form.year}.pdf`;
  } else if (form.type === "JS3100") {
    bytes = await fillJs3100Template(raw as Js3100Data);
    const safeTitle = (form.title ?? "JS3100")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .slice(0, 80);
    filename = `${safeTitle || "JS3100"}.pdf`;
  } else if (form.type === "SIH") {
    // Šihterica: re-render iz snimljenih sati + meta (ime radnika, org,
    // slobodni dani). Stari zapisi bez meta koriste sigurne defaulte.
    const sih = raw as {
      days?: (SihDayEntry | null)[];
      meta?: {
        workerName?: string;
        orgName?: string;
        orgAddress?: string;
        orgCity?: string;
        orgTaxNumber?: string;
        weeklyDaysOff?: number[];
        countAbsenceCodes?: string[];
      };
    };
    const m = sih.meta ?? {};
    bytes = await fillSihterica({
      workerName: m.workerName ?? "",
      month: form.month ?? 1,
      year: form.year,
      days: sih.days ?? [],
      orgName: m.orgName ?? form.organization?.name ?? "",
      orgAddress: m.orgAddress ?? "",
      orgCity: m.orgCity ?? "",
      orgTaxNumber: m.orgTaxNumber ?? "",
      weeklyDaysOff: m.weeklyDaysOff ?? [0, 6],
      countAbsenceCodes: m.countAbsenceCodes,
    });
    const wName = m.workerName ? `_${m.workerName.replace(/\s+/g, "_")}` : "";
    filename = `Sihterica${wName}_${
      form.month ? String(form.month).padStart(2, "0") : "XX"
    }_${form.year}.pdf`;
  }
  if (!bytes) return;
  const ab =
    bytes.buffer instanceof ArrayBuffer
      ? bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        )
      : Uint8Array.from(bytes).buffer;
  const blob = new Blob([ab], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function FormDownloadButton({
  form,
  s,
}: {
  form: FormRecord;
  s: Record<string, string>;
}) {
  const [loading, setLoading] = useState(false);
  const supported =
    form.type === "AMS" ||
    form.type === "SPR" ||
    form.type === "ZO3" ||
    form.type === "GPD" ||
    form.type === "PLDI" ||
    form.type === "JS3100" ||
    form.type === "SIH";
  if (!supported) return null;
  return (
    <button
      className={s.btnGhost}
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await regenerateAndDownload(form);
        } finally {
          setLoading(false);
        }
      }}
      style={{ fontSize: 12 }}
    >
      <LuFileDown
        size={14}
        style={{ marginRight: 4, verticalAlign: "middle" }}
      />
      {loading ? "Generišem…" : "Preuzmi PDF"}
    </button>
  );
}

function AmortizacijaFormItem({
  year,
  name,
  onDelete,
  deleteLoading,
}: {
  year: number;
  name: string;
  onDelete: () => void;
  deleteLoading: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await getAmortizacija(String(year));
      if (!res.ok || !res.data) return;
      const { obveznik, rows } = res.data;
      const odISO = obveznik.periodOd || `${year}-01-01`;
      const doISO = obveznik.periodDo || `${year}-12-31`;
      let nabavna = 0,
        kv = 0,
        iznos = 0,
        kvKraj = 0;
      const pldiRows = rows.map((row) => {
        const calc = calcRow(row, odISO, doISO);
        if (!row.prodano) {
          nabavna += parseDec(row.nabavnaVrijednost) ?? 0;
          kv += parseDec(row.kvPocetak) ?? 0;
          kvKraj += calc.kvKraj ?? 0;
        }
        iznos += calc.iznos ?? 0;
        return {
          naziv: row.naziv,
          datumNabavke: isoToDisplay(row.datumNabavke),
          brojDokumenta: row.brojDokumenta,
          nabavnaVrijednost: parseDec(row.nabavnaVrijednost),
          kvPocetak: parseDec(row.kvPocetak),
          vijekTrajanja: row.vijekTrajanja,
          stopa: calc.stopa,
          iznos: calc.iznos,
          kvKraj: calc.kvKraj,
          napomena: row.napomena ?? "",
          prodanoText: row.prodano
            ? `PR.${row.datumProdaje ? ` ${isoToDisplay(row.datumProdaje)}` : ""}`
            : undefined,
        };
      });
      const data: PldiData = {
        jmb: obveznik.jmb,
        imeIPrezime: obveznik.imeIPrezime,
        adresa: obveznik.adresa,
        jib: obveznik.jib,
        naziv: obveznik.naziv,
        adresaDjelatnosti: obveznik.adresaDjelatnosti,
        vrstaSifra: obveznik.vrstaSifra,
        vrstaNaziv: obveznik.vrstaNaziv,
        godina: String(year),
        periodOd: isoToDisplay(odISO),
        periodDo: isoToDisplay(doISO),
        rows: pldiRows,
        totalNabavna: r2(nabavna),
        totalKv: r2(kv),
        totalIznos: r2(iznos),
        totalKvKraj: r2(kvKraj),
      };
      const bytes = await fillPldiTemplate(data);
      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PLDI-1043-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  const title = name ? `PLDI-1043 · ${name} · ${year}` : `PLDI-1043 · ${year}`;

  return (
    <div className={styles.formItem}>
      <span className={`${styles.formTypeBadge} ${styles.badgePldi}`}>
        PLDI
      </span>
      <div className={styles.formDetails}>
        <div className={styles.formTitle}>{title}</div>
        <div className={styles.formMeta}>Obrazac PLDI-1043</div>
      </div>
      <button
        className={styles.btnGhost}
        onClick={handleDownload}
        disabled={loading}
        style={{ fontSize: 12 }}
      >
        <LuFileDown
          size={14}
          style={{ marginRight: 4, verticalAlign: "middle" }}
        />
        {loading ? "Generišem…" : "Preuzmi PDF"}
      </button>
      {confirmDelete ? (
        <div className={styles.deleteConfirm}>
          <span className={styles.deleteConfirmText}>
            Sigurno želite obrisati?
          </span>
          <div className={styles.deleteConfirmActions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => setConfirmDelete(false)}
            >
              Odustani
            </button>
            <button
              type="button"
              className={styles.btnDanger}
              disabled={deleteLoading}
              onClick={onDelete}
            >
              {deleteLoading ? "Brisanje..." : "Da, obriši"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.btnGhost}
          style={{ fontSize: 12, color: "var(--color-danger, #e53e3e)" }}
          onClick={() => setConfirmDelete(true)}
        >
          Obriši
        </button>
      )}
    </div>
  );
}

const PAGE_SIZE = 5;

function HistorijaTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<HistorijaFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [nameByYear, setNameByYear] = useState<Record<number, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Faza 3B: dohvati moj userId radi prikaza "Tim" indikatora na team-shared
  // formama koje je kreirao neko drugi član iz iste org-e.
  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });
  const myUserId = meData?.id ?? null;

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      deleteDocument(id).then((res) => {
        if (!res.ok) throw new Error(res.error);
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms"] });
      setConfirmDeleteId(null);
    },
  });

  const [deletingAmortYear, setDeletingAmortYear] = useState<number | null>(
    null,
  );
  const deleteAmortMutation = useMutation({
    mutationFn: (year: number) =>
      deleteAmortizacija(String(year)).then((res) => {
        if (!res.ok) throw new Error(res.error);
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amortizacijaYears"] });
      setDeletingAmortYear(null);
    },
  });

  const showAmortizacija = filter === "ALL" || filter === "PLDI";

  useEffect(() => {
    setPage(0);
  }, [filter, search]);

  const { data: amortYears = [] } = useQuery<number[]>({
    queryKey: ["amortizacijaYears"],
    queryFn: () => unwrap(getAmortizacijaYears()),
    enabled: showAmortizacija,
  });

  useEffect(() => {
    if (amortYears.length === 0) return;
    Promise.all(
      amortYears.map((yr) =>
        getAmortizacija(String(yr)).then((res) => ({
          yr,
          name:
            res.ok && res.data?.obveznik
              ? res.data.obveznik.naziv || res.data.obveznik.imeIPrezime || ""
              : "",
        })),
      ),
    ).then((results) => {
      const map: Record<number, string> = {};
      results.forEach(({ yr, name }) => {
        map[yr] = name;
      });
      setNameByYear(map);
    });
  }, [amortYears]);

  const { data: formsRaw = [], isLoading } = useQuery<FormRecord[]>({
    queryKey: ["forms", filter],
    queryFn: () =>
      unwrap(getForms(filter === "ALL" ? undefined : (filter as FormType))),
  });

  const displayTitle = (f: FormRecord) => {
    if (f.title) return f.title;
    const period = f.month ? `${MONTHS[f.month]} ${f.year}` : String(f.year);
    return `${FORM_TYPE_LABELS[f.type]} · ${period}`;
  };

  const recipientLabel = (f: FormRecord) =>
    f.organization
      ? `${f.organization.name} · `
      : f.client
        ? `${[f.client.firstName, f.client.lastName].filter(Boolean).join(" ") || f.client.companyName || "Klijent"} · `
        : "Ostali · ";

  const q = search.toLowerCase().trim();

  const filteredAmort = showAmortizacija
    ? [...amortYears]
        .sort((a, b) => b - a)
        .filter((yr) => {
          if (!q) return true;
          const name = (nameByYear[yr] || "").toLowerCase();
          return String(yr).includes(q) || name.includes(q);
        })
    : [];

  const filteredForms = formsRaw.filter((f) => {
    if (!q) return true;
    const title = displayTitle(f).toLowerCase();
    const cli = f.client
      ? [f.client.firstName, f.client.lastName, f.client.companyName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      : "";
    const org = f.organization?.name.toLowerCase() ?? "";
    return (
      title.includes(q) ||
      cli.includes(q) ||
      org.includes(q) ||
      String(f.year).includes(q)
    );
  });

  const totalItems = filteredAmort.length + filteredForms.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  const pagedAmort = filteredAmort.slice(
    start,
    Math.min(end, filteredAmort.length),
  );
  const formsStart = Math.max(0, start - filteredAmort.length);
  const formsEnd = Math.max(0, end - filteredAmort.length);
  const pagedForms = filteredForms.slice(formsStart, formsEnd);

  return (
    <div className={styles.panel}>
      <div className={styles.historyFilterRow}>
        <select
          className={styles.filterSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value as HistorijaFilter)}
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Pretraži po imenu, godini…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className={styles.empty}>
          <div className={styles.emptyText}>Učitavanje...</div>
        </div>
      )}

      {!isLoading && totalItems === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📄</div>
          <div className={styles.emptyText}>Nema pronađenih obrazaca.</div>
        </div>
      )}

      {!isLoading && totalItems > 0 && (
        <>
          <div className={styles.formList}>
            {pagedAmort.map((year) => (
              <AmortizacijaFormItem
                key={`amort-${year}`}
                year={year}
                name={nameByYear[year] || ""}
                onDelete={() => {
                  setDeletingAmortYear(year);
                  deleteAmortMutation.mutate(year);
                }}
                deleteLoading={
                  deleteAmortMutation.isPending && deletingAmortYear === year
                }
              />
            ))}
            {pagedForms.map((f) => (
              <div key={f.id} className={styles.formItem}>
                <span className={typeBadgeClass(f.type, styles)}>
                  {FORM_TYPE_LABELS[f.type]}
                </span>
                <div className={styles.formDetails}>
                  <div className={styles.formTitle}>
                    {displayTitle(f)}
                    {/* Faza 3B: team marker za forme koje je kreirao drugi član iz iste org-e */}
                    {f.organization && f.createdById !== null && myUserId !== null && f.createdById !== myUserId && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--color-bg-subtle, #f0f0f0)",
                          color: "var(--color-text-muted, #666)",
                        }}
                        title="Dokument kreiran od strane drugog člana organizacije"
                      >
                        Tim
                      </span>
                    )}
                  </div>
                  <div className={styles.formMeta}>
                    {recipientLabel(f)}
                    {(() => {
                      const d = new Date(f.createdAt);
                      return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}.`;
                    })()}
                  </div>
                </div>
                <span className={statusClass(f.status, styles)}>
                  {STATUS_LABELS[f.status] ?? f.status}
                </span>
                <FormDownloadButton form={f} s={styles} />
                {f.pdfUrl && (
                  <a
                    href={f.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.btnGhost}
                    style={{ textDecoration: "none", fontSize: 12 }}
                  >
                    PDF
                  </a>
                )}
                {confirmDeleteId === f.id ? (
                  <div className={styles.deleteConfirm}>
                    <span className={styles.deleteConfirmText}>
                      Sigurno želite obrisati dokument?
                    </span>
                    <div className={styles.deleteConfirmActions}>
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Odustani
                      </button>
                      <button
                        type="button"
                        className={styles.btnDanger}
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(f.id)}
                      >
                        {deleteMutation.isPending
                          ? "Brisanje..."
                          : "Da, obriši"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.btnGhost}
                    style={{
                      fontSize: 12,
                      color: "var(--color-danger, #e53e3e)",
                    }}
                    onClick={() => {
                      deleteMutation.reset();
                      setConfirmDeleteId(f.id);
                    }}
                  >
                    Obriši
                  </button>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                ←
              </button>
              <span className={styles.pageInfo}>
                {page + 1} / {totalPages}
              </span>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sigurnost tab ────────────────────────────────────────────────────────────

function SigurnostTab({ user }: { user: AuthUser }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [resentEmail, setResentEmail] = useState(false);

  const changePwMutation = useMutation({
    mutationFn: () =>
      changePassword(currentPw, newPw).then((r) => {
        if (!r.ok) throw new Error(r.error);
      }),
    onSuccess: () => {
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 4000);
    },
  });

  const resendMutation = useMutation({
    mutationFn: () => {
      if (!user.email) throw new Error("No email");
      return resendVerification(user.email).then((r) => {
        if (!r.ok) throw new Error(r.error);
      });
    },
    onSuccess: () => setResentEmail(true),
  });

  const pwMismatch = confirmPw.length > 0 && newPw !== confirmPw;
  const pwTooShort = newPw.length > 0 && newPw.length < 6;

  const changePwError = changePwMutation.error
    ? changePwMutation.error.message === "WRONG_PASSWORD"
      ? "Trenutna lozinka nije ispravna."
      : changePwMutation.error.message === "PASSWORD_TOO_SHORT"
        ? "Nova lozinka mora imati najmanje 6 znakova."
        : "Greška. Pokušajte ponovo."
    : null;

  return (
    <div className={styles.panel}>
      {/* Email */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardTitle}>Email adresa</p>
        </div>
        <div className={styles.infoList}>
          <div className={styles.infoRow} style={{ borderBottom: "none" }}>
            <span className={styles.infoLabel}>Email</span>
            <span
              className={styles.infoValue}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {user.email ?? "–"}
              {user.isEmailVerified ? (
                <span className={styles.verifiedBadge}>✓ Verificiran</span>
              ) : (
                <span className={styles.unverifiedBadge}>Nije verificiran</span>
              )}
            </span>
          </div>
        </div>
        {!user.isEmailVerified && user.email && (
          <div className={styles.verifyActions}>
            <p className={styles.verifyHint}>
              Niste verificirali email adresu. Možete ponovo poslati
              verifikacijski email.
            </p>
            {resentEmail ? (
              <p className={styles.successMsg}>
                Email je poslan. Provjerite inbox.
              </p>
            ) : (
              <button
                className={styles.btnPrimary}
                disabled={resendMutation.isPending}
                onClick={() => resendMutation.mutate()}
              >
                {resendMutation.isPending
                  ? "Šalje se…"
                  : "Ponovo pošalji verifikacijski email"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Google */}
      {user.isGoogleUser && (
        <div className={styles.card} style={{ marginTop: "1.5rem" }}>
          <div className={styles.cardHeader}>
            <p className={styles.cardTitle}>Google nalog</p>
          </div>
          <div className={styles.googleInfo}>
            <svg
              viewBox="0 0 48 48"
              width="22"
              height="22"
              style={{ flexShrink: 0 }}
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            <p className={styles.googleInfoText}>
              Vaš nalog je vezan za Google. Prijava se vrši putem Google dugmeta,
              lokalna lozinka nije potrebna.
            </p>
          </div>
        </div>
      )}

      {/* Change password */}
      {user.hasPassword && (
        <div className={styles.card} style={{ marginTop: "1.5rem" }}>
          <div className={styles.cardHeader}>
            <p className={styles.cardTitle}>Promjena lozinke</p>
            <button
              type="button"
              className={styles.btnEditInline}
              onClick={() => setShowPw((v) => !v)}
            >
              {showPw ? "Sakrij lozinke" : "Prikaži lozinke"}
            </button>
          </div>
          {pwSuccess && (
            <div className={styles.successMsg}>
              Lozinka je uspješno promijenjena.
            </div>
          )}
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              if (!pwMismatch && !pwTooShort) changePwMutation.mutate();
            }}
          >
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Trenutna lozinka</label>
              <input
                type={showPw ? "text" : "password"}
                className={styles.input}
                value={currentPw}
                onChange={(e) => {
                  setCurrentPw(e.target.value);
                  changePwMutation.reset();
                }}
                autoComplete="current-password"
                required
              />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nova lozinka</label>
                <input
                  type={showPw ? "text" : "password"}
                  className={styles.input}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {pwTooShort && (
                  <span className={styles.fieldError}>Minimalno 6 znakova</span>
                )}
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  Potvrdi novu lozinku
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  className={`${styles.input}${pwMismatch ? ` ${styles.inputError}` : ""}`}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                {pwMismatch && (
                  <span className={styles.fieldError}>
                    Lozinke se ne podudaraju
                  </span>
                )}
              </div>
            </div>
            {changePwError && (
              <div className={styles.errorMsg}>{changePwError}</div>
            )}
            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={
                  changePwMutation.isPending ||
                  pwMismatch ||
                  pwTooShort ||
                  !currentPw ||
                  !newPw ||
                  !confirmPw
                }
              >
                {changePwMutation.isPending ? "Mijenjam…" : "Promijeni lozinku"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Pretplata tab ────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  USER: "Besplatan",
  PRO: "Pro",
  BUSINESS: "Business",
  ADMIN: "Admin",
};

const PLAN_FEATURES: Record<string, string[]> = {
  USER: [
    "SPR-1053 i GPD-1051 obrazac",
    "izrada i automatska popuna ZO3 obrazca",
    "AMS-1035 generator zajedno sa uplatnicama",
    "Stalna sredstva i amortizacija kroz godine",
    "Historija svih dokumenata po godinama ili obrascima",
    "Pohrana podataka obrta u svim dokumentima",
    "Izvoz u Docx / PDF",
  ],
  PRO: [
    "Sve iz besplatnog plana",
    "Šihterica, Evidencija radnog vremena",
    "Generator članskih kartica",
    "Fakture/računi i predračuni/ponude za vaše djelatnosti ili vaše klijente",
    "Mogućnost dodavanja do 20 klijenata i fizičkih lica",
    "Maksimalno 5 radnika po organizaciji/klijentu",
    "Prijave/odjave radnika, izrada JS3000 obrasca",
    "Obračun plata i doprinosa za vlasnika obrta i zaposlene",
    "Generisanje uplatnica za plate i doprinose",
  ],
  BUSINESS: [
    "Sve iz Pro plana",
    "Upravljanje neograničenim brojem klijenata i fizičkih lica",
    "Neograničen broj radnika po organizaciji/klijentu",
    "Višekorisnički pristup (tim)",
    "Ugovori o djelu i automatski obračun poreza i doprinosa",
    "Automatsko generisanje AUG-1031 obrasca uz ugovor o djelu",
    "Ugovor o radu i mogućnost prilagođavanja ugovora po Vašim potrebama",
    "Prioritetna podrška",
  ],
  ADMIN: ["Puni administratorski pristup"],
};

function fmtDate(iso: string) {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}.`;
}

// Broj dana do isteka (negativno = isteklo). Računa se iz endDate jer rola/
// isActive mogu biti spušteni lazy-expiry-jem nakon isteka.
function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const parts = iso.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const end = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end - today) / 86400000);
}

// Dan nakon isteka (YYYY-MM-DD) — prvi dan nove pretplate (kontinuitet).
function dayAfterIso(iso: string): string {
  const parts = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

// Kraj perioda nove pretplate (start + 1 mjesec/godina - 1 dan).
function periodEndFrom(startIso: string, cycle: BillingCycle): string {
  const parts = startIso.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (cycle === "monthly") dt.setUTCMonth(dt.getUTCMonth() + 1);
  else dt.setUTCFullYear(dt.getUTCFullYear() + 1);
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

// Plan za obnovu: subscription.plan (ako je PRO/BUSINESS), inače rola, inače PRO.
function renewalPlan(user: AuthUser): PredracunPlan {
  const sp = user.subscription?.plan;
  if (sp === "PRO" || sp === "BUSINESS") return sp;
  if (user.role === "PRO" || user.role === "BUSINESS") return user.role;
  return "PRO";
}

function SubscriptionRenewal({
  user,
  daysLeft,
}: {
  user: AuthUser;
  daysLeft: number;
}) {
  const sub = user.subscription!;
  const plan = renewalPlan(user);
  const cycle: BillingCycle = sub.billingCycle === "monthly" ? "monthly" : "yearly";
  // Kontinuitet: dan nakon isteka. Ali ako je već isteklo, ne idemo unazad —
  // počinjemo od danas (max(endDate+1, danas)). ISO datumi se porede leksički.
  const todayIso = new Date().toISOString().slice(0, 10);
  const afterExpiry = dayAfterIso(sub.endDate);
  const periodStart = afterExpiry > todayIso ? afterExpiry : todayIso;
  const periodEnd = periodEndFrom(periodStart, cycle);
  const cycleLabel = cycle === "monthly" ? "mjesečna" : "godišnja";
  const planLabel = PLAN_LABELS[plan] ?? plan;
  const expired = daysLeft < 0;

  const [done, setDone] = useState<{ number: string; url: string } | null>(null);

  const gen = useMutation({
    mutationFn: async () => {
      if (!user.email) throw new Error("Vaš profil nema email adresu.");
      const res = await createPredracun(
        plan,
        cycle,
        {
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          email: user.email,
          address: user.address ?? undefined,
          city: user.city ?? undefined,
          phone: user.phone ?? undefined,
        },
        periodStart,
      );
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onSuccess: (res) => {
      setDone({ number: res.fullNumber, url: res.pdfUrl });
      if (typeof window !== "undefined") window.open(res.pdfUrl, "_blank");
    },
  });

  return (
    <div className={styles.renewalBox}>
      <p className={styles.renewalTitle}>
        {expired ? "Obnovite pretplatu" : "Pretplata uskoro ističe"}
      </p>
      <p className={styles.renewalDesc}>
        Generišite novi predračun za obnovu. Nova pretplata:{" "}
        <strong>
          {planLabel}, {cycleLabel}
        </strong>,{" "}
        period {fmtDate(periodStart)} do {fmtDate(periodEnd)}{" "}
        {expired
          ? "(počinje danas)."
          : "(počinje dan nakon isteka tekuće, bez prekida)."}
      </p>

      {done ? (
        <div className={styles.renewalDone}>
          <p>
            Predračun <strong>{done.number}</strong> je generisan i poslan na{" "}
            <strong>{user.email}</strong>.
          </p>
          <a
            href={done.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.planLink}
          >
            Ponovo otvori PDF
          </a>
        </div>
      ) : (
        <>
          <button
            className={styles.btnPrimary}
            onClick={() => gen.mutate()}
            disabled={gen.isPending || !user.email}
          >
            {gen.isPending ? "Generišem…" : "Generiši predračun za obnovu"}
          </button>
          {!user.email && (
            <p className={styles.renewalHint}>
              Dodajte email adresu u profilu da generišete predračun.
            </p>
          )}
          {gen.isError && (
            <p className={styles.renewalError}>
              {(gen.error as Error).message}
            </p>
          )}
        </>
      )}

      <p className={styles.renewalHint}>
        Želite drugi plan ili način plaćanja (mjesečno/godišnje)?{" "}
        <Link
          href={`/pretplate?plan=${plan}&cycle=${cycle}`}
          className={styles.planLink}
        >
          Promijeni pretplatu
        </Link>
        .
      </p>

      <p className={styles.renewalHint}>
        Ako želite produžiti, možete i odgovoriti na email podsjetnik ili nas
        kontaktirati putem{" "}
        <a href="/kontakt" className={styles.planLink}>
          kontakt forme
        </a>
        .
      </p>
    </div>
  );
}

function PretplataTab({ user }: { user: AuthUser }) {
  const plan = user.role in PLAN_LABELS ? user.role : "USER";
  const isPaid = plan === "PRO" || plan === "BUSINESS";
  const isAdmin = plan === "ADMIN";
  const sub = user.subscription;
  const isActive = isAdmin || (sub?.isActive ?? false);
  const isExpired = !isAdmin && sub && !sub.isActive;
  // Obnova: pred istek (≤7 dana) ili već isteklo. Računamo iz endDate.
  const daysLeft = !isAdmin && sub ? daysUntil(sub.endDate) : null;
  const showRenewal = daysLeft !== null && daysLeft <= 7;

  return (
    <div className={styles.panel}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardTitle}>Moja pretplata</p>
        </div>

        <div className={styles.planCard}>
          <div
            className={`${styles.planBadge} ${plan === "PRO" ? styles.planBadgePro : plan === "BUSINESS" ? styles.planBadgeBusiness : plan === "ADMIN" ? styles.planBadgeAdmin : ""}`}
          >
            {PLAN_LABELS[plan] ?? plan}
          </div>
          <p className={styles.planDesc}>
            {isAdmin
              ? "Puni administratorski pristup, uvijek aktivan."
              : isPaid && isActive
                ? "Imate aktivan plaćeni plan."
                : isPaid && isExpired
                  ? "Vaša pretplata je istekla."
                  : "Trenutno koristite besplatan plan."}
          </p>
          <ul className={styles.planFeatures}>
            {(PLAN_FEATURES[plan] ?? []).map((f) => (
              <li key={f} className={styles.planFeatureItem}>
                <span className={styles.planCheck}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {sub && (
          <div className={styles.subInfo}>
            <div className={styles.subDates}>
              <div className={styles.subDateItem}>
                <span className={styles.subDateLabel}>Vrijedi od</span>
                <span className={styles.subDateValue}>
                  {fmtDate(sub.startDate)}
                </span>
              </div>
              <div className={styles.subDateItem}>
                <span className={styles.subDateLabel}>Vrijedi do</span>
                <span className={styles.subDateValue}>
                  {fmtDate(sub.endDate)}
                </span>
              </div>
            </div>
            <div className={styles.subStatusRow}>
              {isActive ? (
                <span className={styles.subActive}>● Aktivna</span>
              ) : (
                <span className={styles.subExpired}>● Istekla</span>
              )}
              {isExpired && !showRenewal && (
                <span className={styles.subStatusNote}>
                  Za obnovu kontaktirajte nas putem{" "}
                  <a href="/kontakt" className={styles.planLink}>
                    kontakt forme
                  </a>
                  .
                </span>
              )}
            </div>
          </div>
        )}

        {showRenewal && (
          <SubscriptionRenewal user={user} daysLeft={daysLeft as number} />
        )}

        {!isPaid && !showRenewal && (
          <div className={styles.planUpgrade}>
            <p className={styles.planUpgradeText}>
              Nadogradite na <strong>Pro</strong> ili <strong>Business</strong>{" "}
              plan za pristup svim funkcionalnostima.
            </p>
            <Link className={styles.btnPrimary} href="/pretplate">
              Nadogradi
            </Link>
            <p className={styles.planComingSoon}>
              Na stranici za pretplatu generišete predračun i platite po
              uplatnici. Nakon evidentiranja uplate aktiviramo vaš plan. Za
              pomoć nas kontaktirajte putem{" "}
              <a href="/kontakt" className={styles.planLink}>
                kontakt forme
              </a>
              .
            </p>
          </div>
        )}

        {plan === "PRO" && (
          <div className={styles.planUpgrade}>
            <p className={styles.planUpgradeText}>
              Nadogradite na <strong>Business</strong> plan za pristup
              neograničenom broju klijenata, višekorisničkom pristupu i
              prioritetnoj podršci.
            </p>
            <Link
              className={styles.btnPrimary}
              href="/pretplate?plan=BUSINESS"
            >
              Nadogradi na Business
            </Link>
          </div>
        )}
      </div>

      <PlanComparison currentPlan={plan} />
    </div>
  );
}

function PlanComparison({ currentPlan }: { currentPlan: string }) {
  const plans = [
    {
      key: "USER",
      title: "Besplatan",
      price: "0 KM",
      note: "Osnovni alati, bez obaveza",
      features: PLAN_FEATURES.USER,
      href: null as string | null,
      recommended: false,
    },
    {
      key: "PRO",
      title: "Pro",
      price: `${formatKm(PLAN_PRICING.PRO.yearly)} KM`,
      note: `godišnje · ili ${formatKm(PLAN_PRICING.PRO.monthly)} KM mjesečno`,
      features: PLAN_FEATURES.PRO,
      href: "/pretplate?plan=PRO",
      recommended: true,
    },
    {
      key: "BUSINESS",
      title: "Business",
      price: `${formatKm(PLAN_PRICING.BUSINESS.yearly)} KM`,
      note: `godišnje · ili ${formatKm(PLAN_PRICING.BUSINESS.monthly)} KM mjesečno`,
      features: PLAN_FEATURES.BUSINESS,
      href: "/pretplate?plan=BUSINESS",
      recommended: false,
    },
  ];

  return (
    <div className={styles.card} style={{ marginTop: "1.5rem" }}>
      <div className={styles.cardHeader}>
        <p className={styles.cardTitle}>Planovi i cijene</p>
      </div>
      <div className={styles.planCompareGrid}>
        {plans.map((p) => {
          const isCurrent = currentPlan === p.key;
          return (
            <div
              key={p.key}
              className={`${styles.planCompareCard} ${p.recommended ? styles.planCompareRec : ""}`}
            >
              {p.recommended && (
                <span className={styles.planCompareRecBadge}>Preporučeno</span>
              )}
              <div className={styles.planCompareTitle}>{p.title}</div>
              <div className={styles.planComparePrice}>{p.price}</div>
              <div className={styles.planCompareNote}>{p.note}</div>
              <ul className={styles.planCompareFeatures}>
                {p.features.map((f) => (
                  <li key={f}>
                    <span className={styles.planCheck}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className={styles.planCompareCurrent}>Trenutni plan</span>
              ) : p.href ? (
                <Link
                  href={p.href}
                  className={p.recommended ? styles.btnPrimary : styles.btnGhost}
                >
                  Izaberi {p.title}
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Profil() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // URL params (?tab=klijenti&editOrg=12) — koriste se iz /organizacije Edit
  // dugmeta da auto-otvori edit formu za specifičnu organizaciju.
  // ?novaOrg=1 (sa bilo koje "Dodaj djelatnost" tačke) → otvori brzi wizard.
  const wantNovaOrg = searchParams.get("novaOrg") === "1";
  const initialTab: Tab = (() => {
    const t = searchParams.get("tab");
    if (
      t === "pregled" ||
      t === "profil" ||
      t === "djelatnosti" ||
      t === "klijenti" ||
      t === "historija" ||
      t === "sigurnost" ||
      t === "pretplata" ||
      t === "admin"
    ) {
      return t;
    }
    // Stari ?tab=djelatnost i sl. padaju na Pregled (novi landing).
    return "pregled";
  })();
  const requestedEditOrgId = (() => {
    const v = searchParams.get("editOrg");
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  })();
  const [tab, setTab] = useState<Tab>(initialTab);

  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery<AuthUser>({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });

  useEffect(() => {
    if (isError && (error as Error)?.message === "UNAUTHENTICATED") {
      router.replace("/prijava");
    }
  }, [isError, error, router]);

  // Sinhronizuj aktivni tab kad se promijeni ?tab= u URL-u (npr. klik na karticu
  // djelatnosti/klijenta sa Pregleda → router.push(?tab=djelatnosti&editOrg=ID)).
  useEffect(() => {
    const t = searchParams.get("tab") as Tab | null;
    const valid: Tab[] = [
      "pregled", "profil", "djelatnosti", "klijenti",
      "historija", "sigurnost", "pretplata", "admin",
    ];
    if (t && valid.includes(t)) setTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <div className={styles.emptyText}>Učitavanje profila...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const NAV_ITEMS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "pregled", label: "Pregled", icon: <LuLayoutDashboard size={19} /> },
    { key: "profil", label: "Profil", icon: <LuUser size={19} /> },
    { key: "djelatnosti", label: "Moje Djelatnosti", icon: <LuBuilding size={19} /> },
    { key: "klijenti", label: "Klijenti", icon: <LuUsers size={19} /> },
    { key: "historija", label: "Dokumenti", icon: <LuHistory size={19} /> },
    { key: "sigurnost", label: "Sigurnost", icon: <LuShield size={19} /> },
    { key: "pretplata", label: "Pretplata", icon: <LuCreditCard size={19} /> },
    { key: "admin", label: "Admin", icon: <LuSettings size={19} /> },
  ];

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        {/* Brand na vrhu */}
        <div className={styles.brand}>
          <div className={styles.brandMark}>PK</div>
          <span className={styles.brandText}>
            Porezni
            <br />
            Kalkulator
          </span>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.filter((it) => it.key !== "admin").map(({ key, label, icon }) => (
            <button
              key={key}
              className={`${styles.navItem} ${tab === key ? styles.navItemActive : ""}`}
              onClick={() => setTab(key)}
            >
              <span className={styles.navIcon}>{icon}</span>
              {label}
            </button>
          ))}
          {/* Pregled svih organizacija, vodi na /organizacije, uvijek vidljiv. */}
          <button
            className={styles.navItem}
            onClick={() => router.push("/organizacije")}
            title="Pregled svih vlastitih i klijentskih organizacija"
          >
            <span className={styles.navIcon}>
              <LuBuilding size={19} />
            </span>
            Pregled organizacija
          </button>
          {/* Admin, vidljiv samo ADMIN korisnicima. */}
          <RoleGuard roles={["ADMIN"]} mode="hide">
            <button
              className={styles.navItem}
              onClick={() => router.push("/admin/korisnici")}
            >
              <span className={styles.navIcon}>
                <LuSettings size={19} />
              </span>
              Admin
            </button>
          </RoleGuard>
        </nav>

        {/* Mini profil na dnu */}
        <div className={styles.sidebarFoot}>
          <div className={styles.avatarSm}>{initials(user)}</div>
          <div className={styles.sidebarFootInfo}>
            <div className={styles.sidebarFootName}>
              {user.firstName} {user.lastName}
            </div>
            <span
              className={`${styles.roleChip} ${user.role === "PRO" ? styles.roleChipPro : user.role === "BUSINESS" ? styles.roleChipBusiness : user.role === "ADMIN" ? styles.roleChipAdmin : ""}`}
            >
              {user.role}
            </span>
          </div>
        </div>
      </aside>

      <main className={styles.content}>
        {tab === "pregled" && (
          <PregledTab
            user={user}
            openNovaOrg={wantNovaOrg}
            onGoTab={(t) => setTab(t)}
          />
        )}
        {tab === "profil" && (
          <ProfilTab key={user.id} user={user} section="licni" />
        )}
        {tab === "djelatnosti" && (
          <ProfilTab
            key={`dj-${user.id}`}
            user={user}
            section="djelatnost"
            requestedEditOrgId={requestedEditOrgId}
          />
        )}
        {tab === "klijenti" && (
          <DjelatnostTab requestedEditOrgId={requestedEditOrgId} />
        )}
        {tab === "historija" && <HistorijaTab />}
        {tab === "sigurnost" && <SigurnostTab user={user} />}
        {tab === "pretplata" && <PretplataTab user={user} />}
      </main>
    </div>
  );
}

// ─── Pregled tab (landing + onboarding) ─────────────────────────────────────
// Cilj: korisnik nakon registracije lako napravi djelatnost, doda radnike
// (opcionalno) i proba alat. Sve tačke "Dodaj djelatnost" vode ovdje.
const TOOLS = [
  { href: "/aktivni-radnici", title: "Plate i radnici", desc: "Obračun plata po FBiH", icon: <LuWallet size={18} />, hot: true },
  { href: "/sihterica", title: "Šihterica", desc: "Evidencija radnih sati", icon: <LuClock size={18} />, hot: false },
  { href: "/fakture", title: "Fakture", desc: "Izrada i slanje faktura", icon: <LuReceipt size={18} />, hot: false },
  { href: "/amortizacija", title: "Amortizacija", desc: "Obračun amortizacije", icon: <LuFileText size={18} />, hot: false },
];

function PregledTab({
  user,
  openNovaOrg,
  onGoTab,
}: {
  user: AuthUser;
  openNovaOrg: boolean;
  onGoTab: (t: Tab) => void;
}) {
  const router = useRouter();
  const [wizardOpen, setWizardOpen] = useState(openNovaOrg);
  const [workersSkipped, setWorkersSkipped] = useState(false);

  const orgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
  });
  const ownOrgs = orgsQuery.data ?? [];
  const hasOrg = ownOrgs.length > 0;

  const workersQuery = useQuery({
    queryKey: ["allMyWorkers"],
    queryFn: () => unwrap(getAllMyWorkers()),
    enabled: hasOrg,
  });
  const hasWorkers = (workersQuery.data?.length ?? 0) > 0;

  const statsQuery = useQuery<MyStats>({
    queryKey: ["myStats"],
    queryFn: () => unwrap(getMyStats()),
    enabled: hasOrg,
  });
  const clientOrgsQuery = useQuery({
    queryKey: ["clientOrganizations"],
    queryFn: () => unwrap(getClientOrganizations()),
    enabled: hasOrg,
  });
  const personClientsQuery = useQuery({
    queryKey: ["personClients"],
    queryFn: () => unwrap(getPersonClients()),
    enabled: hasOrg,
  });

  const onboardingDone = hasOrg && (hasWorkers || workersSkipped);
  const st = statsQuery.data;

  const ownOrg = ownOrgs[0] ?? null;
  const orgIncomplete =
    !!ownOrg && (!ownOrg.address || !ownOrg.activityCode || !ownOrg.bankAccount);

  // Procenat popunjenosti djelatnosti (za prsten napretka).
  const pFields = ownOrg
    ? [
        ownOrg.name,
        ownOrg.taxNumber,
        ownOrg.address,
        ownOrg.city,
        ownOrg.activityCode,
        ownOrg.bankAccount,
        ownOrg.phone || ownOrg.email,
      ]
    : [];
  const progressPct = pFields.length
    ? Math.round((pFields.filter(Boolean).length / pFields.length) * 100)
    : 0;

  // Lista klijenata (klijentske org-e + fizička lica), prvih 5.
  const clientItems = [
    ...(clientOrgsQuery.data ?? []).map((o) => ({
      key: `org-${o.id}`,
      name: o.name,
      sub: o.activityName || "Klijentska organizacija",
      onClick: () => router.push(`/profil?tab=klijenti&editOrg=${o.id}`),
    })),
    ...(personClientsQuery.data ?? []).map((c) => ({
      key: `pc-${c.id}`,
      name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Klijent",
      sub: "Fizičko lice",
      onClick: () => onGoTab("klijenti"),
    })),
  ].slice(0, 5);

  const danas = new Date();
  const DANI = [
    "Nedjelja",
    "Ponedjeljak",
    "Utorak",
    "Srijeda",
    "Četvrtak",
    "Petak",
    "Subota",
  ];
  const todayLabel = `Danas je ${DANI[danas.getDay()]}, ${String(
    danas.getDate(),
  ).padStart(2, "0")}.${String(danas.getMonth() + 1).padStart(
    2,
    "0",
  )}.${danas.getFullYear()}. godine.`;

  return (
    <div className={styles.panel}>
      <div className={styles.pregledHeader}>
        <div>
          <h1 className={styles.pregledTitle}>
            Dobro došli, <em>{user.firstName}</em>
          </h1>
          <p className={styles.pregledDate}>{todayLabel}</p>
          <p className={styles.pregledLead}>
            {hasOrg
              ? "Sve je spremno za rad."
              : "Postavimo vaš nalog u nekoliko koraka."}
          </p>
        </div>
        {hasOrg && (
          <button
            className={styles.progressChip}
            onClick={() => onGoTab("djelatnosti")}
            title="Dovrši podatke djelatnosti"
          >
            <ProgressRing pct={progressPct} />
            <span>
              <span className={styles.progressVal}>Profil {progressPct}%</span>
              <span className={styles.progressSub}>Dovrši podatke</span>
            </span>
          </button>
        )}
      </div>

      {/* Onboarding (novi korisnik bez djelatnosti / radnika) */}
      {!onboardingDone && (
        <div className={styles.card}>
          <p className={styles.cardTitle}>Pokrenite svoju djelatnost</p>
          <ChecklistStep
            n={1}
            done={hasOrg}
            title="Napravite djelatnost"
            desc="Obrt ili firma. Otključava plate, fakture, radnike i obrasce."
          >
            {!hasOrg && (
              <button className={styles.btnPrimary} onClick={() => setWizardOpen(true)}>
                <LuPlus size={15} /> Napravi djelatnost
              </button>
            )}
          </ChecklistStep>
          <ChecklistStep
            n={2}
            done={hasWorkers}
            dimmed={!hasOrg}
            optional
            title="Dodajte radnike"
            desc="Ako radite sami kao vlasnik, slobodno preskočite."
          >
            {hasOrg && !hasWorkers && !workersSkipped && (
              <>
                <button className={styles.btnPrimary} onClick={() => router.push("/aktivni-radnici")}>
                  Dodaj radnike
                </button>
                <button className={styles.btnGhost} onClick={() => setWorkersSkipped(true)}>
                  Preskoči
                </button>
              </>
            )}
          </ChecklistStep>
          <ChecklistStep
            n={3}
            done={false}
            dimmed={!hasOrg}
            title="Probajte alat"
            desc="Obračun plata, šihterica ili faktura."
          >
            {hasOrg && (
              <div className={styles.pregledShortcuts}>
                <button className={styles.btnGhost} onClick={() => router.push("/aktivni-radnici")}>Obračun plata</button>
                <button className={styles.btnGhost} onClick={() => router.push("/sihterica")}>Šihterica</button>
                <button className={styles.btnGhost} onClick={() => router.push("/fakture")}>Faktura</button>
              </div>
            )}
          </ChecklistStep>
        </div>
      )}

      {/* Dopuna podataka djelatnosti (accent banner) */}
      {hasOrg && orgIncomplete && (
        <div className={styles.onbBanner}>
          <span className={styles.onbBannerText}>
            Dodajte adresu, šifru djelatnosti i žiro račun da fakture i obrasci
            budu potpuni.
          </span>
          <button className={styles.onbBannerBtn} onClick={() => onGoTab("djelatnosti")}>
            Dopuni
          </button>
        </div>
      )}

      {/* Bogati dashboard kad postoji djelatnost */}
      {hasOrg && (
        <>
          <div className={styles.statGrid}>
            <StatCard icon={<LuBuilding size={14} />} label="Djelatnosti" value={st?.djelatnosti} />
            <StatCard icon={<LuUsers size={14} />} label="Klijenti" value={st?.klijenti} />
            <StatCard icon={<LuCalculator size={14} />} label="Obračuna (mj.)" value={st?.obracuniMjesec} delta={st?.obracuniDelta} />
            <StatCard icon={<LuFileText size={14} />} label="Dokumenti" value={st?.dokumenti} />
            <StatCard icon={<LuReceipt size={14} />} label="Fakture" value={st?.fakture} />
            <StatCard icon={<LuUsers size={14} />} label="Radnici" value={st?.radnici} />
          </div>

          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Preporučeni alati</h2>
          </div>
          <div className={styles.toolGrid}>
            {TOOLS.map((t) => (
              <button
                key={t.href}
                className={`${styles.toolCard} ${t.hot ? styles.toolCardHot : ""}`}
                onClick={() => router.push(t.href)}
              >
                <span className={styles.toolIcon}>{t.icon}</span>
                <span className={styles.toolBody}>
                  <span className={styles.toolTitle}>
                    {t.title}
                    {t.hot && <span className={styles.toolBadge}>Najčešće</span>}
                  </span>
                  <span className={styles.toolDesc}>{t.desc}</span>
                </span>
                <LuArrowRight size={15} className={styles.toolArrow} />
              </button>
            ))}
          </div>

          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Moje djelatnosti</h2>
            <button className={styles.sectionAction} onClick={() => onGoTab("djelatnosti")}>
              Upravljaj →
            </button>
          </div>
          <div className={styles.bizList}>
            {ownOrgs.map((o) => (
              <button
                key={o.id}
                className={styles.bizCard}
                onClick={() => router.push(`/profil?tab=djelatnosti&editOrg=${o.id}`)}
              >
                <span className={styles.bizAvatar}>{initials2(o.name)}</span>
                <span className={styles.bizInfo}>
                  <span className={styles.bizName}>{o.name}</span>
                  <span className={styles.bizSub}>
                    {o.type === "BUSINESS" ? "Obrt" : "Firma"}
                    {o.activityName ? ` · ${o.activityName}` : ""}
                  </span>
                </span>
                <LuChevronRight size={17} className={styles.bizChevron} />
              </button>
            ))}
            <button
              className={styles.dashedAdd}
              onClick={() => setWizardOpen(true)}
            >
              + Dodaj djelatnost
            </button>
          </div>

          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Klijenti</h2>
            <button className={styles.sectionAction} onClick={() => onGoTab("klijenti")}>
              Upravljaj →
            </button>
          </div>
          <div className={styles.bizList}>
            {clientItems.map((c) => (
              <button key={c.key} className={styles.bizCard} onClick={c.onClick}>
                <span className={`${styles.bizAvatar} ${styles.bizAvatarAccent}`}>
                  {initials2(c.name)}
                </span>
                <span className={styles.bizInfo}>
                  <span className={styles.bizName}>{c.name}</span>
                  <span className={styles.bizSub}>{c.sub}</span>
                </span>
                <LuChevronRight size={17} className={styles.bizChevron} />
              </button>
            ))}
            <button className={styles.dashedAdd} onClick={() => onGoTab("klijenti")}>
              + Dodaj klijenta
            </button>
          </div>
        </>
      )}

      {wizardOpen && (
        <QuickCreateOrgModal
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            setWizardOpen(false);
            orgsQuery.refetch();
          }}
        />
      )}
    </div>
  );
}

// Inicijali iz naziva (za avatare kartica).
function initials2(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg width={30} height={30} viewBox="0 0 32 32" style={{ flex: "none" }}>
      <circle cx="16" cy="16" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke="var(--sage)"
        strokeWidth="4"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 16 16)"
      />
    </svg>
  );
}

function StatCard({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  delta?: number;
}) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>
        {icon}
        {label}
      </span>
      <span className={styles.statValue}>
        {value ?? "–"}
        {typeof delta === "number" && delta > 0 && (
          <span className={styles.statDelta}> +{delta}</span>
        )}
      </span>
    </div>
  );
}

// Red detalja (label / vrijednost). Prazna vrijednost → "Dodaj" affordance.
function ProfileDetailRow({
  label,
  value,
  onAdd,
  last,
}: {
  label: string;
  value?: string | null;
  onAdd?: () => void;
  last?: boolean;
}) {
  return (
    <div
      className={styles.detailRow}
      style={last ? { borderBottom: "none" } : undefined}
    >
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>
        {value ? (
          value
        ) : onAdd ? (
          <button type="button" className={styles.addLink} onClick={onAdd}>
            Dodaj
          </button>
        ) : (
          <span className={styles.infoEmpty}>–</span>
        )}
      </span>
    </div>
  );
}

function ChecklistStep({
  n,
  done,
  optional,
  dimmed,
  title,
  desc,
  children,
}: {
  n: number;
  done: boolean;
  optional?: boolean;
  dimmed?: boolean;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`${styles.obStep} ${dimmed ? styles.obStepDimmed : ""}`}>
      <div className={`${styles.obNum} ${done ? styles.obNumDone : ""}`}>
        {done ? <LuCheck size={16} /> : n}
      </div>
      <div className={styles.obBody}>
        <div className={styles.obTitle}>
          {title}
          {optional && <span className={styles.obOptional}> · opcionalno</span>}
        </div>
        <div className={styles.obDesc}>{desc}</div>
        {children && <div className={styles.obActions}>{children}</div>}
      </div>
    </div>
  );
}

// Brzi wizard za kreiranje djelatnosti — minimalna polja (tip, naziv, JIB).
// Ostalo (adresa, šifra, računi, režim) korisnik dopunjuje kasnije na profilu.
function QuickCreateOrgModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<"BUSINESS" | "COMPANY">("BUSINESS");
  const [name, setName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      unwrap(
        createOrganization({
          name: name.trim(),
          type,
          ...(taxNumber.trim() && { taxNumber: taxNumber.trim() }),
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      onCreated();
    },
    onError: (e: Error) => {
      const m = e.message;
      setError(
        m === "ALREADY_HAS_OWN_ORG"
          ? "Već imate registrovanu vlastitu djelatnost."
          : m === "ALREADY_HAS_OWN_ORG_LIMIT"
            ? "Dosegli ste limit vlastitih djelatnosti za vaš plan. Nadogradite pretplatu za više."
            : m === "ACCOUNTANT_CANNOT_OWN_ORG"
              ? "Računovođe ne mogu imati vlastitu organizaciju."
              : m === "NETWORK_ERROR"
                ? "Server nije dostupan. Pokušajte ponovo."
                : m || "Došlo je do greške.",
      );
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Unesite naziv djelatnosti.");
      return;
    }
    setError(null);
    create.mutate();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <p className={styles.cardTitle}>Napravite svoju djelatnost</p>
        <p className={styles.modalSub}>
          Samo osnovno. Ostale podatke (adresa, šifra djelatnosti, računi)
          možete dopuniti kasnije na profilu.
        </p>

        <form onSubmit={submit}>
          <div className={styles.typeToggle}>
            <button
              type="button"
              className={`${styles.typeBtn} ${type === "BUSINESS" ? styles.typeBtnActive : ""}`}
              onClick={() => setType("BUSINESS")}
            >
              Obrt / samostalna djelatnost
            </button>
            <button
              type="button"
              className={`${styles.typeBtn} ${type === "COMPANY" ? styles.typeBtnActive : ""}`}
              onClick={() => setType("COMPANY")}
            >
              Firma (d.o.o. / d.d.)
            </button>
          </div>

          <label className={styles.modalLabel}>Naziv djelatnosti</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === "BUSINESS" ? "npr. Obrt Kovač" : "npr. Kovač d.o.o."}
            autoFocus
          />

          <label className={styles.modalLabel}>JIB / ID broj (opcionalno)</label>
          <input
            className={styles.input}
            value={taxNumber}
            onChange={(e) =>
              setTaxNumber(e.target.value.replace(/\D/g, "").slice(0, 13))
            }
            placeholder="13 cifara"
            inputMode="numeric"
            maxLength={13}
          />

          {error && <div className={styles.errorMsg}>{error}</div>}

          <div className={styles.modalActions}>
            <button
              className={styles.btnPrimary}
              type="submit"
              disabled={create.isPending}
            >
              {create.isPending ? "Pravim..." : "Napravi djelatnost"}
            </button>
            <button className={styles.btnGhost} type="button" onClick={onClose}>
              Otkaži
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
