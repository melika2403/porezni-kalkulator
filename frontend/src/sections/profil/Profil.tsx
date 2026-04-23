"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./profil.module.css";
import { KD_BIH, type KdBihEntry } from "src/data/kd-bih";
import { me, unwrap, type AuthUser } from "src/api/auth";
import {
  LuPencil,
  LuSquareArrowUpRight,
  LuUser,
  LuUsers,
  LuFileDown,
  LuHistory,
  LuBuilding,
} from "react-icons/lu";
import {
  updateProfile,
  getOrganizations,
  getClientOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getForms,
  getPersonClients,
  createPersonClient,
  updatePersonClient,
  type Organization,
  type OrgPayload,
  type OrgOwnerPayload,
  type FormRecord,
  type FormType,
  type PersonClient,
  type PersonClientPayload,
} from "src/api/profile";
import RoleGuard from "src/components/RoleGuard/RoleGuard";
import Link from "next/link";
import { getAmortizacijaYears, getAmortizacija } from "src/api/amortizacija";
import { getDocument } from "src/api/documents";
import {
  fillPldiTemplate,
  type PldiData,
} from "src/sections/amortizacija/fillPldi";
import { fillAmsTemplate, type AmsData } from "src/sections/ams/fillAms";
import { fillSprTemplate, type SprData } from "src/sections/spr/fillSpr";
import { fillZo3Template, type Zo3Data } from "src/sections/zo3/fillZo3";
import { fillGpdTemplate, type GpdData } from "src/sections/gpd/fillGpd";
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
  PLDI: "PLDI",
  AMS: "AMS",
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
    PLDI: s.badgePldi,
    AMS: s.badgeAms ?? s.badgeUgovor,
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

type Tab = "profil" | "klijenti" | "historija";

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfilTab({ user }: { user: AuthUser }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  // own orgs
  const { data: orgs = [] } = useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
  });
  const ownOrgs = orgs.filter((o) => o.memberRole === "OWNER");
  const isSubscriber = user.role === "PRO" || user.role === "BUSINESS";

  const [editOwnId, setEditOwnId] = useState<number | null>(null);
  const [editOwnOrg, setEditOwnOrg] = useState<OrgFormState>(emptyOrgForm);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [addOrg, setAddOrg] = useState<OrgFormState>(emptyOrgForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const updateOwnOrgMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OrgPayload }) =>
      unwrap(updateOrganization(id, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setEditOwnId(null);
    },
  });

  const createOwnOrgMutation = useMutation({
    mutationFn: (payload: OrgPayload) => unwrap(createOrganization(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      setShowAddOrg(false);
      setAddOrg(emptyOrgForm);
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
      activityCode: org.activityCode ?? "",
      activityName: org.activityName ?? "",
      email: org.email ?? "",
      phone: org.phone ?? "",
      address: org.address ?? "",
    });
    updateOwnOrgMutation.reset();
  };
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [jmbg, setJmbg] = useState(user.jmbg ?? "");
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
      ...(jmbg.trim() && { jmbg: jmbg.trim() }),
    });
  };

  const handleCancel = () => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone ?? "");
    setAddress(user.address ?? "");
    setJmbg(user.jmbg ?? "");
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

  return (
    <div className={styles.panel}>
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
          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Ime i prezime</span>
              <span className={styles.infoValue}>
                {user.firstName} {user.lastName}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{user.email ?? "—"}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Telefon</span>
              <span className={styles.infoValue}>
                {user.phone || (
                  <span className={styles.infoEmpty}>Nije unesen</span>
                )}
              </span>
            </div>
            <div className={styles.infoRowColumn}>
              <div className={styles.infoRowInner}>
                <span className={styles.infoLabel}>JMBG</span>
                <span className={styles.infoValue}>
                  {user.jmbg ? (
                    <span className={styles.jmbgBadge}>
                      🔒 Pohranjen i kriptiran
                    </span>
                  ) : (
                    <span className={styles.infoEmpty}>Nije unesen</span>
                  )}
                </span>
              </div>
              <p className={styles.jmbgDisclaimer}>
                JMBG je uvijek zaštićen kao lozinka i vidljiv samo Vama — ni
                administrator sistema nema pristup ovom podatku.
              </p>
            </div>
            <div className={styles.infoRow} style={{ borderBottom: "none" }}>
              <span className={styles.infoLabel}>Adresa</span>
              <span className={styles.infoValue}>
                {user.address || (
                  <span className={styles.infoEmpty}>Nije unesena</span>
                )}
              </span>
            </div>
          </div>
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
                value={user.email ?? "—"}
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
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="address">
                Adresa
              </label>
              <input
                id="address"
                className={styles.input}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ulica bb, Grad"
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

      {/* ── Moja djelatnost ── */}
      <div className={styles.card} style={{ marginTop: "1.5rem" }}>
        <div className={styles.cardHeader}>
          <p className={styles.cardTitle}>Moja djelatnost</p>
        </div>

        {ownOrgs.map((org) => (
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
              <>
                <div className={styles.infoList}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Naziv</span>
                    <span className={styles.infoValue}>{org.name}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Tip</span>
                    <span className={styles.infoValue}>
                      {ORG_TYPE_LABELS[org.type] ?? org.type}
                    </span>
                  </div>
                  {org.taxNumber && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>JIB</span>
                      <span className={styles.infoValue}>{org.taxNumber}</span>
                    </div>
                  )}
                  {org.activityCode && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>
                        Šifra djelatnosti
                      </span>
                      <span className={styles.infoValue}>
                        {org.activityCode}
                        {org.activityName ? ` — ${org.activityName}` : ""}
                      </span>
                    </div>
                  )}
                  {org.email && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Email</span>
                      <span className={styles.infoValue}>{org.email}</span>
                    </div>
                  )}
                  {org.phone && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Telefon</span>
                      <span className={styles.infoValue}>{org.phone}</span>
                    </div>
                  )}
                  <div
                    className={styles.infoRow}
                    style={{ borderBottom: "none" }}
                  >
                    <span className={styles.infoLabel}>Adresa</span>
                    <span className={styles.infoValue}>
                      {org.address || (
                        <span className={styles.infoEmpty}>Nije unesena</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className={styles.ownOrgActions}>
                  <RoleGuard roles={["BUSINESS"]} mode="hide">
                    <Link
                      href={`/organizacija/${org.id}`}
                      className={styles.btnEditInline}
                    >
                      <LuSquareArrowUpRight size={14} /> Otvori
                    </Link>
                  </RoleGuard>
                  <button
                    className={styles.btnEditInline}
                    onClick={() => startEditOwnOrg(org)}
                  >
                    <LuPencil size={14} /> Izmijeni
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* add button — ACCOUNTANT always, USER only if no owned orgs yet */}
        {!showAddOrg &&
          editOwnId === null &&
          (isSubscriber || ownOrgs.length <= 2) && (
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

        {/* locked upsell for USER with an existing org */}
        {!showAddOrg &&
          editOwnId === null &&
          !isSubscriber &&
          ownOrgs.length > 0 && (
            <div className={styles.lockedFeature}>
              <span>🔒</span>
              <span>
                Više djelatnosti dostupno uz pretplatu na{" "}
                <strong>Accountant plan</strong>.
              </span>
            </div>
          )}

        {showAddOrg && (
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              createOwnOrgMutation.mutate(orgFormToPayload(addOrg, null));
            }}
          >
            <OrgFormFields value={addOrg} onChange={setAddOrg} />
            {createOwnOrgMutation.error && (
              <div className={styles.errorMsg}>
                {createOwnOrgMutation.error.message}
              </div>
            )}
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => {
                  setShowAddOrg(false);
                  setAddOrg(emptyOrgForm);
                }}
              >
                Odustani
              </button>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={createOwnOrgMutation.isPending}
              >
                {createOwnOrgMutation.isPending ? "Dodavanje..." : "Dodaj"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Owner fields sub-form ────────────────────────────────────────────────────

type OwnerFormState = {
  firstName: string;
  lastName: string;
  jmbg: string;
  email: string;
  phone: string;
  address: string;
};

const emptyOwner: OwnerFormState = {
  firstName: "",
  lastName: "",
  jmbg: "",
  email: "",
  phone: "",
  address: "",
};

function ownerToPayload(o: OwnerFormState): OrgOwnerPayload {
  return {
    firstName: o.firstName.trim(),
    lastName: o.lastName.trim(),
    jmbg: o.jmbg.trim(),
    ...(o.email.trim() && { email: o.email.trim() }),
    ...(o.phone.trim() && { phone: o.phone.trim() }),
    ...(o.address.trim() && { address: o.address.trim() }),
  };
}

function OwnerFields({
  value,
  onChange,
  requireJmbg = true,
}: {
  value: OwnerFormState;
  onChange: (v: OwnerFormState) => void;
  requireJmbg?: boolean;
}) {
  const set =
    (field: keyof OwnerFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [field]: e.target.value });

  return (
    <div className={styles.ownerSection}>
      <p className={styles.ownerSectionTitle}>Podaci vlasnika</p>
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
        <div className={styles.field}>
          <label className={styles.fieldLabel}>
            JMBG vlasnika {requireJmbg ? "*" : "(opciono)"}
          </label>
          <input
            className={styles.input}
            value={value.jmbg}
            onChange={set("jmbg")}
            placeholder="1234567890123"
            maxLength={13}
            required={requireJmbg}
          />
          <span className={styles.secureHint}>
            🔒 JMBG se kriptira i nikad nije vidljiv drugima
          </span>
        </div>
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
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Adresa vlasnika</label>
          <input
            className={styles.input}
            value={value.address}
            onChange={set("address")}
            placeholder="Ulica bb, Grad"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Org form state helpers ───────────────────────────────────────────────────

type OrgFormState = {
  name: string;
  type: "COMPANY" | "BUSINESS";
  taxNumber: string;
  activityCode: string;
  activityName: string;
  email: string;
  phone: string;
  address: string;
};

const emptyOrgForm: OrgFormState = {
  name: "",
  type: "COMPANY",
  taxNumber: "",
  activityCode: "",
  activityName: "",
  email: "",
  phone: "",
  address: "",
};

function orgFormToPayload(
  f: OrgFormState,
  owner: OwnerFormState | null,
): OrgPayload {
  return {
    name: f.name.trim(),
    type: f.type,
    ...(f.taxNumber.trim() && { taxNumber: f.taxNumber.trim() }),
    activityCode: f.activityCode.trim() || undefined,
    activityName: f.activityName.trim() || undefined,
    ...(f.email.trim() && { email: f.email.trim() }),
    ...(f.phone.trim() && { phone: f.phone.trim() }),
    ...(f.address.trim() && { address: f.address.trim() }),
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
            placeholder="4200000000000"
            maxLength={13}
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
          onChange({ ...value, taxNumber: e.target.value })
        }
        activityCode={value.activityCode}
        activityName={value.activityName}
        onChange={(code, name) =>
          onChange({ ...value, activityCode: code, activityName: name })
        }
      />
      <div className={styles.row}>
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
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Adresa</label>
        <input
          className={styles.input}
          value={value.address}
          onChange={set("address")}
          placeholder="Ulica bb, Sarajevo"
        />
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
};

const emptyPersonForm: PersonFormState = {
  firstName: "",
  lastName: "",
  jmbg: "",
  taxNumber: "",
  email: "",
  phone: "",
  address: "",
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
            placeholder="1234567890123"
            maxLength={13}
          />
          <span className={styles.secureHint}>
            🔒 JMBG se kriptira i nikad nije vidljiv drugima
          </span>
        </div>
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
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Adresa</label>
        <input
          className={styles.input}
          value={value.address}
          onChange={set("address")}
          placeholder="Ulica bb, Grad"
        />
      </div>
    </>
  );
}

// ─── Klijenti tab ────────────────────────────────────────────────────────────

type AddMode = "client-org" | "person";

function DjelatnostTab() {
  const queryClient = useQueryClient();
  const { data: clientOrgs = [], isLoading: orgsLoading } = useQuery<
    Organization[]
  >({
    queryKey: ["clientOrganizations"],
    queryFn: () => unwrap(getClientOrganizations()),
  });

  const { data: persons = [], isLoading: personsLoading } = useQuery<
    PersonClient[]
  >({
    queryKey: ["personClients"],
    queryFn: () => unwrap(getPersonClients()),
  });

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
      activityCode: org.activityCode ?? "",
      activityName: org.activityName ?? "",
      email: org.email ?? "",
      phone: org.phone ?? "",
      address: org.address ?? "",
    });
    const ow = org.owner;
    setEditHasOwner(!!ow);
    setEditOwner(
      ow
        ? {
            firstName: ow.firstName,
            lastName: ow.lastName,
            jmbg: ow.jmbg ?? "",
            email: ow.email ?? "",
            phone: ow.phone ?? "",
            address: ow.address ?? "",
          }
        : emptyOwner,
    );
    updateOrgMutation.reset();
  };

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
        <p className={styles.cardTitle}>Klijentske organizacije</p>

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

        {clientOrgs.length > 0 && (
          <div className={styles.orgList}>
            {clientOrgs.map((org) =>
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
                    />
                  )}
                  {updateOrgMutation.error && (
                    <div className={styles.errorMsg}>
                      {updateOrgMutation.error.message}
                    </div>
                  )}
                  <div className={styles.formActions}>
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
                      {updateOrgMutation.isPending ? "Snimanje..." : "Sačuvaj"}
                    </button>
                  </div>
                </form>
              ) : (
                <div key={org.id} className={styles.orgItem}>
                  <div className={styles.orgInfo}>
                    <div className={styles.orgName}>{org.name}</div>
                    <div className={styles.orgMeta}>
                      {ORG_TYPE_LABELS[org.type] ?? org.type}
                      {org.taxNumber && ` · JIB: ${org.taxNumber}`}
                      {org.activityCode &&
                        ` · ${org.activityCode}${org.activityName ? ` ${org.activityName}` : ""}`}
                      {org.owner &&
                        ` · Vlasnik: ${org.owner.firstName} ${org.owner.lastName}`}
                    </div>
                  </div>
                  <div className={styles.orgActions}>
                    <Link
                      href={`/organizacija/${org.id}`}
                      className={styles.btnIcon}
                    >
                      <LuSquareArrowUpRight />
                    </Link>
                    {(org.memberRole === "OWNER" ||
                      org.memberRole === "ADMIN") && (
                      <button
                        type="button"
                        className={styles.btnIcon}
                        onClick={() => startEditOrg(org)}
                      >
                        <LuPencil />
                      </button>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* ── Person clients ── */}
      <div className={styles.card} style={{ marginBottom: "1.5rem" }}>
        <p className={styles.cardTitle}>Fizička lica (klijenti)</p>
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
                      <div className={styles.formActions}>
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
                    </form>
                  ) : (
                    <div key={p.id} className={styles.orgItem}>
                      <div className={styles.orgInfo}>
                        <div className={styles.orgName}>
                          {p.firstName} {p.lastName}
                        </div>
                        <div className={styles.orgMeta}>
                          Fizičko lice
                          {p.taxNumber && ` · Porezni: ${p.taxNumber}`}
                          {p.email && ` · ${p.email}`}
                        </div>
                      </div>
                      <div className={styles.orgActions}>
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => startEditPerson(p)}
                        >
                          Uredi
                        </button>
                      </div>
                    </div>
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
                  createPersonMutation.mutate(personFormToPayload(addPerson));
                }}
              >
                <PersonFormFields value={addPerson} onChange={setAddPerson} />
                {createPersonMutation.error && (
                  <div className={styles.errorMsg}>
                    {createPersonMutation.error.message}
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
                    disabled={createPersonMutation.isPending}
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
                  <OwnerFields value={addOwner} onChange={setAddOwner} />
                )}
                {createOrgMutation.error && (
                  <div className={styles.errorMsg}>
                    {createOrgMutation.error.message === "ALREADY_HAS_OWN_ORG"
                      ? "Možete imati samo jednu vlastitu organizaciju."
                      : createOrgMutation.error.message ===
                          "ACCOUNTANT_CANNOT_OWN_ORG"
                        ? "Računovođe ne mogu imati vlastitu organizaciju."
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
    const { obveznik, rows } = raw as { obveznik: ObveznikData; rows: AssetRow[] };
    const odISO = obveznik.periodOd || `${form.year}-01-01`;
    const doISO = obveznik.periodDo || `${form.year}-12-31`;
    let nabavna = 0, kv = 0, iznos = 0, kvKraj = 0;
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
    form.type === "PLDI";
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

function AmortizacijaFormItem({ year, name }: { year: number; name: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await getAmortizacija(String(year));
      if (!res.ok || !res.data) return;
      const { obveznik, rows } = res.data;
      const odISO = obveznik.periodOd || `${year}-01-01`;
      const doISO = obveznik.periodDo || `${year}-12-31`;
      let nabavna = 0, kv = 0, iznos = 0, kvKraj = 0;
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
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
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
      <span className={`${styles.formTypeBadge} ${styles.badgePldi}`}>PLDI</span>
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
        <LuFileDown size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
        {loading ? "Generišem…" : "Preuzmi PDF"}
      </button>
    </div>
  );
}

const PAGE_SIZE = 5;

function HistorijaTab() {
  const [filter, setFilter] = useState<HistorijaFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [nameByYear, setNameByYear] = useState<Record<number, string>>({});

  const showAmortizacija = filter === "ALL" || filter === "PLDI";

  useEffect(() => { setPage(0); }, [filter, search]);

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
          name: (res.ok && res.data?.obveznik?.imeIPrezime) ? res.data.obveznik.imeIPrezime : "",
        })),
      ),
    ).then((results) => {
      const map: Record<number, string> = {};
      results.forEach(({ yr, name }) => { map[yr] = name; });
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
          .filter(Boolean).join(" ").toLowerCase()
      : "";
    const org = f.organization?.name.toLowerCase() ?? "";
    return title.includes(q) || cli.includes(q) || org.includes(q) || String(f.year).includes(q);
  });

  const totalItems = filteredAmort.length + filteredForms.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;

  const pagedAmort = filteredAmort.slice(start, Math.min(end, filteredAmort.length));
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
              />
            ))}
            {pagedForms.map((f) => (
              <div key={f.id} className={styles.formItem}>
                <span className={typeBadgeClass(f.type, styles)}>
                  {FORM_TYPE_LABELS[f.type]}
                </span>
                <div className={styles.formDetails}>
                  <div className={styles.formTitle}>{displayTitle(f)}</div>
                  <div className={styles.formMeta}>
                    {recipientLabel(f)}
                    {new Date(f.createdAt).toLocaleDateString("bs-BA")}
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Profil() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profil");

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
    { key: "profil", label: "Profil", icon: <LuUser size={17} /> },
    { key: "klijenti", label: "Klijenti", icon: <LuUsers size={17} /> },
    { key: "historija", label: "Historija", icon: <LuHistory size={17} /> },
  ];

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarProfile}>
          <div className={styles.avatar}>{initials(user)}</div>
          <div>
            <div className={styles.name}>
              {user.firstName} <em>{user.lastName}</em>
            </div>
            {user.email && <div className={styles.email}>{user.email}</div>}
            <div className={styles.roleChip}>{user.role}</div>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.map(({ key, label, icon }) => (
            <button
              key={key}
              className={`${styles.navItem} ${tab === key ? styles.navItemActive : ""}`}
              onClick={() => setTab(key)}
            >
              <span className={styles.navIcon}>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className={styles.content}>
        {tab === "profil" && <ProfilTab key={user.id} user={user} />}
        {tab === "klijenti" && <DjelatnostTab />}
        {tab === "historija" && <HistorijaTab />}
      </main>
    </div>
  );
}
