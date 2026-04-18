"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./profil.module.css";
import { me, unwrap, type AuthUser } from "src/api/auth";
import {
  updateProfile,
  getOrganizations,
  createOrganization,
  updateOrganization,
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

type Tab = "profil" | "djelatnost" | "historija";

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfilTab({ user }: { user: AuthUser }) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [jmbg, setJmbg] = useState(user.jmbg ?? "");
  const [success, setSuccess] = useState(false);

  // Sync jmbg field when user data refreshes after a save
  useEffect(() => {
    setJmbg(user.jmbg ?? "");
  }, [user.jmbg]);

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateProfile>[1]) =>
      unwrap(updateProfile(user.id, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setSuccess(true);
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
        <p className={styles.cardTitle}>Lični podaci</p>
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
                placeholder={"1234567890123"}
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
          {success && (
            <div className={styles.successMsg}>Profil uspješno sačuvan.</div>
          )}
          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Snimanje..." : "Sačuvaj izmjene"}
            </button>
          </div>
        </form>
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
  email: string;
  phone: string;
  address: string;
};

const emptyOrgForm: OrgFormState = {
  name: "",
  type: "COMPANY",
  taxNumber: "",
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
    ...(f.email.trim() && { email: f.email.trim() }),
    ...(f.phone.trim() && { phone: f.phone.trim() }),
    ...(f.address.trim() && { address: f.address.trim() }),
    ...(owner && { ownerData: ownerToPayload(owner) }),
  };
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
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Porezni broj (JIB)</label>
          <input
            className={styles.input}
            value={value.taxNumber}
            onChange={set("taxNumber")}
            placeholder="4200000000000"
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
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Telefon</label>
          <input
            className={styles.input}
            value={value.phone}
            onChange={set("phone")}
            placeholder="+387 33 000 000"
          />
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

// ─── Djelatnost tab ───────────────────────────────────────────────────────────

type AddMode = "own" | "client-org" | "person";

function DjelatnostTab() {
  const queryClient = useQueryClient();

  const { data: orgs = [], isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
  });

  const { data: persons = [], isLoading: personsLoading } = useQuery<
    PersonClient[]
  >({
    queryKey: ["personClients"],
    queryFn: () => unwrap(getPersonClients()),
  });

  // add form state
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("own");
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
  const [editPerson, setEditPerson] = useState<PersonFormState>(emptyPersonForm);

  const createOrgMutation = useMutation({
    mutationFn: (payload: OrgPayload) => unwrap(createOrganization(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      resetAddForm();
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: OrgPayload }) =>
      unwrap(updateOrganization(id, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
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
    setAddMode("own");
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
        <p className={styles.cardTitle}>Moje organizacije / djelatnosti</p>

        {orgs.length === 0 && (
          <div className={styles.empty} style={{ padding: "1.5rem 0" }}>
            <div className={styles.emptyIcon}>🏢</div>
            <div className={styles.emptyText}>Nema dodanih organizacija.</div>
          </div>
        )}

        {orgs.length > 0 && (
          <div className={styles.orgList}>
            {orgs.map((org) =>
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
                      {org.owner &&
                        ` · Vlasnik: ${org.owner.firstName} ${org.owner.lastName}`}
                    </div>
                  </div>
                  <div className={styles.orgActions}>
                    <span className={styles.orgBadge}>
                      {org.memberRole === "OWNER"
                        ? "Vlasnik"
                        : org.memberRole === "ADMIN"
                          ? "Admin"
                          : "Član"}
                    </span>
                    {(org.memberRole === "OWNER" ||
                      org.memberRole === "ADMIN") && (
                      <button
                        type="button"
                        className={styles.btnGhost}
                        onClick={() => startEditOrg(org)}
                      >
                        Uredi
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
        <RoleGuard roles={["ACCOUNTANT", "SUPER_ADMIN"]} label="Samo računovođa">
          <>
            {persons.length === 0 && (
              <div className={styles.empty} style={{ padding: "1.5rem 0" }}>
                <div className={styles.emptyIcon}>👤</div>
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
            onClick={() => setShowAdd(true)}
          >
            <span>+</span> Dodaj djelatnost / klijenta
          </button>
        ) : (
          <div className={styles.addOrgForm}>
            <p className={styles.addOrgTitle}>Šta želite dodati?</p>

            <div className={styles.orgTypeRadios} style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <label
                className={`${styles.orgTypeRadio} ${addMode === "own" ? styles.orgTypeRadioActive : ""}`}
              >
                <input
                  type="radio"
                  name="addMode"
                  checked={addMode === "own"}
                  onChange={() => setAddMode("own")}
                />
                <span className={styles.orgTypeRadioIcon}>🧑‍💼</span>
                <div>
                  <div className={styles.orgTypeRadioLabel}>
                    Moja djelatnost
                  </div>
                  <div className={styles.orgTypeRadioDesc}>
                    Svoja firma ili obrt
                  </div>
                </div>
              </label>

              <RoleGuard
                roles={["ACCOUNTANT", "SUPER_ADMIN"]}
                label="Samo računovođa"
              >
                <label
                  className={`${styles.orgTypeRadio} ${addMode === "client-org" ? styles.orgTypeRadioActive : ""}`}
                >
                  <input
                    type="radio"
                    name="addMode"
                    checked={addMode === "client-org"}
                    onChange={() => setAddMode("client-org")}
                  />
                  <span className={styles.orgTypeRadioIcon}>👥</span>
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

              <RoleGuard
                roles={["ACCOUNTANT", "SUPER_ADMIN"]}
                label="Samo računovođa"
              >
                <label
                  className={`${styles.orgTypeRadio} ${addMode === "person" ? styles.orgTypeRadioActive : ""}`}
                >
                  <input
                    type="radio"
                    name="addMode"
                    checked={addMode === "person"}
                    onChange={() => setAddMode("person")}
                  />
                  <span className={styles.orgTypeRadioIcon}>👤</span>
                  <div>
                    <div className={styles.orgTypeRadioLabel}>
                      Fizičko lice
                    </div>
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
                  createOrgMutation.mutate(
                    orgFormToPayload(
                      addOrg,
                      addMode === "client-org" ? addOwner : null,
                    ),
                  );
                }}
              >
                <OrgFormFields value={addOrg} onChange={setAddOrg} />
                {addMode === "client-org" && (
                  <OwnerFields value={addOwner} onChange={setAddOwner} />
                )}
                {createOrgMutation.error && (
                  <div className={styles.errorMsg}>
                    {createOrgMutation.error.message}
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
                    disabled={createOrgMutation.isPending}
                  >
                    {createOrgMutation.isPending ? "Dodavanje..." : "Dodaj"}
                  </button>
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

const FILTER_OPTIONS: Array<{ label: string; value: FormType | "ALL" }> = [
  { label: "Sve", value: "ALL" },
  { label: "GPD", value: "GPD" },
  { label: "SPR", value: "SPR" },
  { label: "ZO3", value: "ZO3" },
  { label: "Ugovor o pozajmici", value: "UGOVOR" },
];

function HistorijaTab() {
  const [filter, setFilter] = useState<FormType | "ALL">("ALL");

  const { data: forms = [], isLoading } = useQuery<FormRecord[]>({
    queryKey: ["forms", filter],
    queryFn: () => unwrap(getForms(filter === "ALL" ? undefined : filter)),
  });

  const displayTitle = (f: FormRecord) => {
    if (f.title) return f.title;
    const period = f.month ? `${MONTHS[f.month]} ${f.year}` : String(f.year);
    return `${FORM_TYPE_LABELS[f.type]} · ${period}`;
  };

  return (
    <div className={styles.panel}>
      <div className={styles.historyFilters}>
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.filterBtn} ${filter === opt.value ? styles.filterBtnActive : ""}`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className={styles.empty}>
          <div className={styles.emptyText}>Učitavanje...</div>
        </div>
      )}

      {!isLoading && forms.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📄</div>
          <div className={styles.emptyText}>Nema pronađenih obrazaca.</div>
        </div>
      )}

      {!isLoading && forms.length > 0 && (
        <div className={styles.formList}>
          {forms.map((f) => (
            <div key={f.id} className={styles.formItem}>
              <span className={typeBadgeClass(f.type, styles)}>
                {FORM_TYPE_LABELS[f.type]}
              </span>
              <div className={styles.formDetails}>
                <div className={styles.formTitle}>{displayTitle(f)}</div>
                <div className={styles.formMeta}>
                  {f.organization && `${f.organization.name} · `}
                  {new Date(f.createdAt).toLocaleDateString("bs-BA")}
                </div>
              </div>
              <span className={statusClass(f.status, styles)}>
                {STATUS_LABELS[f.status] ?? f.status}
              </span>
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.avatar}>{initials(user)}</div>
        <div className={styles.headerText}>
          <div className={styles.label}>Moj profil</div>
          <h1 className={styles.name}>
            {user.firstName} <em>{user.lastName}</em>
          </h1>
          {user.email && <div className={styles.email}>{user.email}</div>}
        </div>
      </div>

      <div className={styles.tabs}>
        {(["profil", "djelatnost", "historija"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "profil"
              ? "Profil"
              : t === "djelatnost"
                ? "Djelatnost"
                : "Historija"}
          </button>
        ))}
      </div>

      {tab === "profil" && <ProfilTab user={user} />}
      {tab === "djelatnost" && <DjelatnostTab />}
      {tab === "historija" && <HistorijaTab />}
    </div>
  );
}
