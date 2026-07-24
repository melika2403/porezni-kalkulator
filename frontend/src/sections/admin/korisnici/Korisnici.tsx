"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuPencil, LuCheck, LuX, LuTrash2, LuMail } from "react-icons/lu";
import styles from "./korisnici.module.css";
import {
  getUsers,
  adminUpdateUser,
  upsertSubscription,
  deleteUser,
  type Users,
  type UsersListResponse,
} from "src/api/profile";
import { sendTrialInvite } from "src/api/adminEntities";
import { unwrap } from "src/api/auth";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import DateInput from "src/components/DateInput/DateInput";
import StyledSelect from "src/components/StyledSelect/StyledSelect";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  USER: "Korisnik",
  PRO: "Pro",
  ADMIN: "Admin",
  BUSINESS: "Business",
};

const ROLE_BADGE_CLASS: Record<Users["role"], string> = {
  USER: "roleUser",
  PRO: "rolePro",
  ADMIN: "roleAdmin",
  BUSINESS: "roleBusiness",
};

// "free = vječno" pretplata ima endDate ~ +100 godina (ensureSubscription na
// backendu kreira je pri prvom /api/subscription pozivu). U tabeli to
// prikazujemo kao "trajno", ne kao npr. 10.07.2126. koji izgleda kao greška.
function isForeverEnd(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const y = Number(String(iso).slice(0, 4));
  return Number.isFinite(y) && y - new Date().getFullYear() > 50;
}

// Paket = aktivna pretplata (subscriptions.plan), nezavisno od role: office
// korisnik u bazi ostaje USER, pa se paket vidi samo ovdje.
const PLAN_LABELS: Record<string, string> = {
  pro: "Pro",
  business: "Business",
  office_2: "Office Start",
  office_10: "Office Tim",
  office_25: "Office Agencija",
  office_50: "Office Agencija+",
};

function aktivniPaket(
  user: Users,
): { label: string; cls: string; title?: string } | null {
  const today = todayInputDate();
  const sub = user.subscription;
  const plan = (sub?.plan ?? "").toLowerCase();
  const subOk =
    !!sub?.isActive && (!sub.endDate || toInputDate(sub.endDate) >= today);

  if (subOk && PLAN_LABELS[plan]) {
    return {
      label: PLAN_LABELS[plan],
      cls: plan.startsWith("office")
        ? "planOffice"
        : plan === "business"
          ? "roleBusiness"
          : "rolePro",
    };
  }
  // legacy pretplate bez plana: paket izvedi iz role
  if (subOk && (user.role === "PRO" || user.role === "BUSINESS")) {
    return {
      label: ROLE_LABELS[user.role],
      cls: ROLE_BADGE_CLASS[user.role],
    };
  }
  const trialEnd = user.pkOfficeTrialEndsAt
    ? toInputDate(user.pkOfficeTrialEndsAt)
    : "";
  if (trialEnd && trialEnd >= today) {
    // kratka labela da ne razvlači tabelu; datum isteka je u tooltipu
    return {
      label: "Office trial",
      cls: "planTrial",
      title: `Ističe ${formatDate(trialEnd)}.`,
    };
  }
  return null;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "–";
  if (iso.includes("T") || iso.includes("Z")) {
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return "–";
    const d = String(dt.getDate()).padStart(2, "0");
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${d}.${m}.${dt.getFullYear()}`;
  }
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "–";
  return `${d}.${m}.${y}`;
}

function toInputDate(iso: string | null | undefined) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function todayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Main page ────────────────────────────────────────────────────────────────

type UserFilters = {
  firstName: string;
  lastName: string;
  email: string;
};

export default function Korisnici() {
  const LIMIT = 20;

  // draft (inputs)
  const [draftFirstName, setDraftFirstName] = useState("");
  const [draftLastName, setDraftLastName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");

  // applied (actually used for query)
  const [filters, setFilters] = useState<UserFilters>({
    firstName: "",
    lastName: "",
    email: "",
  });
  // Rola/paket i sortiranje primjenjuju se odmah (bez dugmeta Pretraži).
  // Office vrijednosti backend filtrira preko aktivne pretplate, ne role.
  const [role, setRole] = useState<string>("");
  const [sort, setSort] = useState<"newest" | "oldest" | "name">("newest");
  const [page, setPage] = useState(1);

  const query = useQuery<UsersListResponse>({
    queryKey: [
      "users",
      filters.firstName,
      filters.lastName,
      filters.email,
      role,
      sort,
      page,
    ],
    queryFn: () =>
      unwrap(
        getUsers({
          firstName: filters.firstName || undefined,
          lastName: filters.lastName || undefined,
          email: filters.email || undefined,
          role: role || undefined,
          sort,
          page,
          limit: LIMIT,
        }),
      ),
    placeholderData: (prev) => prev,
  });

  const data = query.data;
  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = useMemo(() => {
    const pages = Math.ceil((total || 0) / LIMIT);
    return Math.max(1, pages);
  }, [total]);

  const applySearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFilters({
      firstName: draftFirstName.trim(),
      lastName: draftLastName.trim(),
      email: draftEmail.trim(),
    });
  };

  const resetSearch = () => {
    setDraftFirstName("");
    setDraftLastName("");
    setDraftEmail("");
    setRole("");
    setSort("newest");
    setPage(1);
    setFilters({ firstName: "", lastName: "", email: "" });
  };

  const canPrev = page > 1 && !query.isFetching;
  const canNext = page < totalPages && !query.isFetching;

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div className={styles.page}>
        <div className={styles.orgHeader}>
          <div>
            <h1 className={styles.orgTitle}>Korisnici</h1>
            <div className={styles.orgMeta}>
              <span>
                Ukupno: <strong>{total}</strong>
              </span>
              {query.isFetching && <span>Učitavanje…</span>}
            </div>
          </div>
        </div>

        {/* Search card */}
        <div className={styles.card}>
          <form onSubmit={applySearch}>
            <div className={styles.inlineFields}>
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.fieldLabel}>Ime</label>
                <input
                  className={styles.input}
                  value={draftFirstName}
                  onChange={(e) => setDraftFirstName(e.target.value)}
                  placeholder="npr. Ana"
                  autoComplete="off"
                />
              </div>

              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.fieldLabel}>Prezime</label>
                <input
                  className={styles.input}
                  value={draftLastName}
                  onChange={(e) => setDraftLastName(e.target.value)}
                  placeholder="npr. Horvat"
                  autoComplete="off"
                />
              </div>

              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.fieldLabel}>E-mail</label>
                <input
                  className={styles.input}
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  placeholder="npr. ana@gmail.com"
                  autoComplete="off"
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Rola / paket</label>
                <StyledSelect
                  value={role}
                  onChange={(v) => {
                    setRole(String(v));
                    setPage(1);
                  }}
                  ariaLabel="Rola / paket"
                  fitPanel
                  groups={[
                    {
                      options: [
                        { value: "", label: "Sve role" },
                        { value: "USER", label: "Korisnik" },
                        { value: "PRO", label: "Pro" },
                        { value: "BUSINESS", label: "Business" },
                        { value: "ADMIN", label: "Admin" },
                      ],
                    },
                    {
                      label: "PK Office paketi",
                      options: [
                        { value: "office", label: "PK Office (svi)" },
                        { value: "office_2", label: "Office Start" },
                        { value: "office_10", label: "Office Tim" },
                        { value: "office_25", label: "Office Agencija" },
                        { value: "office_50", label: "Office Agencija+" },
                      ],
                    },
                  ]}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Sortiraj</label>
                <StyledSelect
                  value={sort}
                  onChange={(v) => {
                    setSort(String(v) as typeof sort);
                    setPage(1);
                  }}
                  ariaLabel="Sortiraj"
                  groups={[
                    {
                      options: [
                        { value: "newest", label: "Najnoviji" },
                        { value: "oldest", label: "Najstariji" },
                        { value: "name", label: "Po prezimenu" },
                      ],
                    },
                  ]}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                className={styles.btnPrimary}
                type="submit"
                disabled={query.isFetching}
              >
                Pretraži
              </button>
              <button
                className={styles.btnGhost}
                type="button"
                onClick={resetSearch}
                disabled={query.isFetching}
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Table / empty states */}
        {query.isLoading ? (
          <div className={styles.loading}>Učitavanje…</div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>Nema korisnika.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <UsersTable users={users} />
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.btnGhost}
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!canPrev}
                >
                  ← Prethodna
                </button>
                <span className={styles.pageInfo}>
                  Stranica {page} od {totalPages}
                </span>
                <button
                  className={styles.btnGhost}
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!canNext}
                >
                  Sljedeća →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </RoleGuard>
  );
}

// ─── Users table ──────────────────────────────────────────────────────────────

function UsersTable({ users }: { users: Users[] }) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Ime i prezime</th>
          <th>E-mail</th>
          <th>Registracija</th>
          <th>Verifikacija</th>
          <th>Uloga / paket</th>
          <th>Datum od</th>
          <th>Datum do</th>
          <th>Aktivna</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </tbody>
    </table>
  );
}

// ─── User row (inline edit + subscription toggle) ────────────────────────────

function UserRow({ user }: { user: Users }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteUserMutation = useMutation({
    mutationFn: () => unwrap(deleteUser(user.id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  // ── poziv na trial (samo za korisnike koji ga još nisu aktivirali) ──
  const [trialSent, setTrialSent] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);
  const trialEligible = user.role === "USER" && !user.trialUsedAt;
  const trialInvite = useMutation({
    mutationFn: async () => {
      const r = await sendTrialInvite(user.id);
      if (!r.ok) throw new Error(r.error);
      return r;
    },
    onSuccess: () => {
      setTrialError(null);
      setTrialSent(true);
    },
    onError: (e: Error) => setTrialError(e.message),
  });

  // ── user edit state ──
  // U dropdownu "Uloga / paket" su i office paketi: biraju se isto kao
  // Pro/Business, a u pozadini prave pretplatu (rola u bazi se ne dira).
  const sub = user.subscription;
  const activeOfficePlan =
    sub?.isActive && (sub.plan ?? "").toLowerCase().startsWith("office")
      ? (sub.plan as string).toLowerCase()
      : null;
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [role, setRole] = useState<string>(activeOfficePlan ?? user.role);
  const [editError, setEditError] = useState<string | null>(null);

  // ── subscription state ──
  const [subStartDate, setSubStartDate] = useState(toInputDate(sub?.startDate));
  const [subEndDate, setSubEndDate] = useState(toInputDate(sub?.endDate));
  const [subError, setSubError] = useState<string | null>(null);

  const isAdmin = user.role === "ADMIN";
  const paket = aktivniPaket(user);
  const isActive = sub?.isActive ?? false;

  // Office trial se ne vodi kao pretplata nego na user.pkOfficeTrialEndsAt
  // (+30 dana). Da admin, kao kod PRO trial-a, vidi tačan mjesec važenja,
  // u kolonama Datum od/do prikaži trial prozor (do = kraj, od = kraj - 30d)
  // umjesto datuma "vječne" besplatne pretplate.
  const officeTrialEnd = user.pkOfficeTrialEndsAt
    ? toInputDate(user.pkOfficeTrialEndsAt)
    : null;
  const officeTrialActive =
    !!officeTrialEnd && officeTrialEnd >= todayInputDate();
  // admin-postavljena AKTIVNA pretplata ima prednost i u pristupu i u
  // prikazu: njeni datumi se vide odmah, trial prozor samo kad pretplate nema
  const subAktivna =
    !!sub?.isActive &&
    !!sub?.plan &&
    (!sub.endDate || toInputDate(sub.endDate) >= todayInputDate());
  const prikaziTrialProzor = officeTrialActive && !subAktivna;
  const officeTrialStart =
    officeTrialActive && officeTrialEnd
      ? new Date(new Date(officeTrialEnd).getTime() - 30 * 86400000)
          .toISOString()
          .slice(0, 10)
      : null;
  const isPackageValue = (v: string) =>
    v === "PRO" || v === "BUSINESS" || v.startsWith("office_");
  const canEditDates =
    editing && !isAdmin && (isActive || isPackageValue(role));

  // izbor paketa bez postojećih datuma: predloži danas + godinu
  function onRoleChange(v: string) {
    setRole(v);
    if (isPackageValue(v)) {
      if (!subStartDate) setSubStartDate(todayInputDate());
      if (!subEndDate) {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        setSubEndDate(d.toISOString().slice(0, 10));
      }
    }
  }

  const updateUser = useMutation({
    mutationFn: async () => {
      if (role.startsWith("office_")) {
        // office paket: rola se NE dira (effectiveRole je diže na BUSINESS),
        // paket i period žive u pretplati
        await unwrap(adminUpdateUser(user.id, { firstName, lastName }));
        await unwrap(
          upsertSubscription(user.id, {
            plan: role,
            isActive: true,
            billingCycle: "yearly",
            startDate: subStartDate || todayInputDate(),
            ...(subEndDate ? { endDate: subEndDate } : {}),
          }),
        );
      } else {
        await unwrap(
          adminUpdateUser(user.id, {
            firstName,
            lastName,
            role: role as Users["role"],
          }),
        );
        if (role === "PRO" || role === "BUSINESS") {
          // plan prati izbor (i gasi eventualni office paket / trial oznaku)
          if (subStartDate && subEndDate) {
            await unwrap(
              upsertSubscription(user.id, {
                plan: role,
                isActive: true,
                startDate: subStartDate,
                endDate: subEndDate,
              }),
            );
          }
        } else if (role === "USER" && activeOfficePlan) {
          // vraćanje na Korisnika gasi office paket
          await unwrap(upsertSubscription(user.id, { isActive: false }));
        } else if (subStartDate && subEndDate) {
          await unwrap(
            upsertSubscription(user.id, {
              startDate: subStartDate,
              endDate: subEndDate,
            }),
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      setEditing(false);
      setEditError(null);
      setSubError(null);
    },
    onError: (e: Error) => setEditError(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (active: boolean) => {
      const today = todayInputDate();

      if (!active) {
        return unwrap(
          upsertSubscription(user.id, {
            isActive: false,
            endDate: today,
          }),
        );
      }

      return unwrap(
        upsertSubscription(user.id, {
          isActive: true,
          ...(sub
            ? {}
            : {
                startDate: subStartDate || today,
                endDate:
                  subEndDate ||
                  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .slice(0, 10),
              }),
        }),
      );
    },

    onMutate: (active: boolean) => {
      if (!active) {
        const today = todayInputDate();
        setSubEndDate(today);
      }

      setSubError(null);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSubError(null);
    },

    onError: (e: Error) => {
      setSubStartDate(toInputDate(sub?.startDate));
      setSubEndDate(toInputDate(sub?.endDate));
      setSubError(e.message);
    },
  });

  const optimisticIsActive =
    toggleActive.isPending && typeof toggleActive.variables === "boolean"
      ? toggleActive.variables
      : isActive;

  const endDateToDisplay =
    toggleActive.isPending && toggleActive.variables === false
      ? todayInputDate()
      : sub?.endDate;

  const cancelEdit = () => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setRole(activeOfficePlan ?? user.role);
    setEditing(false);
    setEditError(null);
    setSubStartDate(toInputDate(user.subscription?.startDate));
    setSubEndDate(toInputDate(user.subscription?.endDate));
    setSubError(null);
  };

  const beginEdit = () => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setRole(activeOfficePlan ?? user.role);
    setSubStartDate(toInputDate(user.subscription?.startDate));
    setSubEndDate(toInputDate(user.subscription?.endDate));
    setEditing(true);
    setEditError(null);
    setSubError(null);
  };

  return (
    <>
    <tr>
      <td className={styles.workerName}>
        <Link
          href={`/admin/korisnici/${user.id}`}
          style={{ color: "#3a5c42", fontWeight: 600, textDecoration: "none" }}
        >
          {user.firstName} {user.lastName}
        </Link>
      </td>

      <td>{user.email || "–"}</td>

      <td>{formatDate(user.createdAt)}</td>

      <td>
        {user.isEmailVerified ? (
          <span className={styles.verifiedBadge}>Verifikovan</span>
        ) : (
          <span className={styles.unverifiedBadge}>Neverifikovan</span>
        )}
      </td>

      <td>
        {/* jedna kolona za "šta korisnik ima": Admin, pa aktivni paket
            (Pro/Business/Office/trial), pa tek onda gola rola */}
        {user.role === "ADMIN" ? (
          <span className={`${styles.orgBadge} ${styles.roleAdmin}`}>
            Admin
          </span>
        ) : paket ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <span
              className={`${styles.orgBadge} ${
                styles[paket.cls as keyof typeof styles] ?? ""
              }`}
              title={paket.title}
            >
              {paket.label}
            </span>
            {/* postojeći pretplatnik (npr. Business) sa aktivnim Office
                trialom: trial se inače ne bi vidio jer paket ima prednost */}
            {officeTrialActive && paket.cls !== "planTrial" && (
              <span
                className={`${styles.orgBadge} ${styles.planTrial}`}
                title={`Office trial ističe ${formatDate(officeTrialEnd)}.`}
              >
                Office trial
              </span>
            )}
          </span>
        ) : (
          <span
            className={`${styles.orgBadge} ${
              styles[ROLE_BADGE_CLASS[user.role] as keyof typeof styles] ?? ""
            }`}
          >
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        )}
      </td>

      <td>
        {isAdmin
          ? "–"
          : prikaziTrialProzor
            ? formatDate(officeTrialStart)
            : formatDate(sub?.startDate)}
      </td>

      <td>
        {isAdmin
          ? "–"
          : prikaziTrialProzor
            ? formatDate(officeTrialEnd)
            : isForeverEnd(endDateToDisplay)
              ? "trajno"
              : formatDate(endDateToDisplay)}
      </td>

      <td>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={optimisticIsActive}
            onChange={(e) => toggleActive.mutate(e.target.checked)}
            disabled={toggleActive.isPending}
          />
          <span className={styles.toggleSlider} />
        </label>
      </td>

      <td>
        <span className={styles.rowActions}>
          {!editing && trialEligible && (
            <button
              className={styles.btnIcon}
              title={trialSent ? "Poziv na trial poslan" : "Pošalji poziv na trial"}
              onClick={() => trialInvite.mutate()}
              disabled={trialInvite.isPending || trialSent}
            >
              {trialSent ? <LuCheck /> : <LuMail />}
            </button>
          )}
          <button
            className={styles.btnIcon}
            title={editing ? "Zatvori uređivanje" : "Uredi"}
            onClick={() => (editing ? cancelEdit() : beginEdit())}
          >
            {editing ? <LuX /> : <LuPencil />}
          </button>
          {!editing && (
            <button
              className={`${styles.btnIcon} ${styles.btnIconDanger}`}
              title="Obriši korisnika"
              onClick={() => setConfirmDelete((v) => !v)}
            >
              <LuTrash2 />
            </button>
          )}
        </span>

        {trialError && <div className={styles.errorMsg}>{trialError}</div>}
      </td>
    </tr>
    {editing && (
      <tr>
        <td colSpan={9} className={styles.editRow}>
          <div className={styles.editRowInner}>
            <div className={styles.editField}>
              <label className={styles.fieldLabel}>Ime</label>
              <input
                className={styles.input}
                style={{ width: 150 }}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ime"
              />
            </div>
            <div className={styles.editField}>
              <label className={styles.fieldLabel}>Prezime</label>
              <input
                className={styles.input}
                style={{ width: 170 }}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Prezime"
              />
            </div>
            <div className={styles.editField}>
              <label className={styles.fieldLabel}>Uloga / paket</label>
              <StyledSelect
                value={role}
                onChange={(v) => onRoleChange(String(v))}
                ariaLabel="Uloga / paket"
                fitPanel
                wrapStyle={{ minWidth: 210 }}
                groups={[
                  {
                    options: [
                      { value: "USER", label: "Korisnik" },
                      { value: "PRO", label: "Pro" },
                      { value: "BUSINESS", label: "Business" },
                      { value: "ADMIN", label: "Admin" },
                    ],
                  },
                  {
                    label: "PK Office paketi",
                    options: [
                      { value: "office_2", label: "Office Start (do 2 obrta)" },
                      { value: "office_10", label: "Office Tim (do 10 obrta)" },
                      {
                        value: "office_25",
                        label: "Office Agencija (do 25 obrta)",
                      },
                      {
                        value: "office_50",
                        label: "Office Agencija+ (do 50 obrta)",
                      },
                    ],
                  },
                ]}
              />
            </div>
            {!isAdmin && (
              <>
                <div className={styles.editField} style={{ width: 150 }}>
                  <label className={styles.fieldLabel}>Datum od</label>
                  <DateInput
                    className={styles.input}
                    value={subStartDate}
                    disabled={!canEditDates}
                    onValueChange={setSubStartDate}
                    title={
                      !canEditDates
                        ? "Aktivirajte pretplatu da mijenjate datume"
                        : ""
                    }
                  />
                </div>
                <div className={styles.editField} style={{ width: 150 }}>
                  <label className={styles.fieldLabel}>Datum do</label>
                  <DateInput
                    className={styles.input}
                    value={subEndDate}
                    disabled={!canEditDates}
                    onValueChange={setSubEndDate}
                    title={
                      !canEditDates
                        ? "Aktivirajte pretplatu da mijenjate datume"
                        : ""
                    }
                  />
                </div>
              </>
            )}
            <button
              className={styles.btnPrimary}
              onClick={() => updateUser.mutate()}
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? "Snimam…" : "Sačuvaj"}
            </button>
            <button className={styles.btnGhost} onClick={cancelEdit}>
              Otkaži
            </button>
          </div>
          {(editError || subError) && (
            <div className={styles.errorMsg} style={{ marginTop: "0.4rem" }}>
              {editError || subError}
            </div>
          )}
        </td>
      </tr>
    )}
    {confirmDelete && !editing && (
      <tr>
        <td colSpan={9} className={styles.deleteConfirmRow}>
          <div className={styles.deleteConfirmInner}>
            <span className={styles.deleteConfirmText}>
              Brisanjem se brišu svi podaci korisnika. Jeste li sigurni?
            </span>
            <button
              className={styles.btnConfirmDelete}
              onClick={() => deleteUserMutation.mutate()}
              disabled={deleteUserMutation.isPending}
            >
              <LuCheck size={14} />
              {deleteUserMutation.isPending ? "Brisanje..." : "Da, obriši"}
            </button>
            <button
              className={styles.btnCancelDelete}
              onClick={() => setConfirmDelete(false)}
            >
              <LuX size={14} />
              Odustani
            </button>
          </div>
          {deleteUserMutation.isError && (
            <div className={styles.errorMsg} style={{ marginTop: "0.4rem" }}>
              {(deleteUserMutation.error as Error).message}
            </div>
          )}
        </td>
      </tr>
    )}
    </>
  );
}
