"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuPencil, LuCheck, LuX } from "react-icons/lu";
import styles from "./korisnici.module.css";
import {
  getUsers,
  adminUpdateUser,
  upsertSubscription,
  type Users,
  type UsersListResponse,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";

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

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  if (iso.includes("T") || iso.includes("Z")) {
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return "—";
    const d = String(dt.getDate()).padStart(2, "0");
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${d}.${m}.${dt.getFullYear()}`;
  }
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
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
  const [page, setPage] = useState(1);

  const query = useQuery<UsersListResponse>({
    queryKey: [
      "users",
      filters.firstName,
      filters.lastName,
      filters.email,
      page,
    ],
    queryFn: () =>
      unwrap(
        getUsers({
          firstName: filters.firstName || undefined,
          lastName: filters.lastName || undefined,
          email: filters.email || undefined,
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
    setPage(1);
    setFilters({ firstName: "", lastName: "", email: "" });
  };

  const canPrev = page > 1 && !query.isFetching;
  const canNext = page < totalPages && !query.isFetching;

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div className={styles.page}>
        <div className={styles.orgHeader}>
          <h1 className={styles.orgTitle}>Korisnici</h1>
          <div className={styles.orgMeta}>
            <span>
              Ukupno: <strong>{total}</strong>
            </span>
            <span>
              Stranica:{" "}
              <strong>
                {page}/{totalPages}
              </strong>
            </span>
            {query.isFetching && <span>Učitavanje…</span>}
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
          <div className={styles.empty}>Učitavanje...</div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>Nema korisnika.</div>
        ) : (
          <>
            <UsersTable users={users} />

            <div className={styles.formActions}>
              <button
                className={styles.btnGhost}
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev}
                title="Prethodna stranica"
              >
                Prethodna
              </button>

              <button
                className={styles.btnGhost}
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNext}
                title="Sljedeća stranica"
              >
                Sljedeća
              </button>
            </div>
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
          <th>Uloga</th>
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

  // ── user edit state ──
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [role, setRole] = useState(user.role);
  const [editError, setEditError] = useState<string | null>(null);

  // ── subscription state ──
  const sub = user.subscription;
  const [subStartDate, setSubStartDate] = useState(toInputDate(sub?.startDate));
  const [subEndDate, setSubEndDate] = useState(toInputDate(sub?.endDate));
  const [subError, setSubError] = useState<string | null>(null);

  const isActive = sub?.isActive ?? false;
  const canEditDates = editing && isActive;

  const updateUser = useMutation({
    mutationFn: async () => {
      await unwrap(adminUpdateUser(user.id, { firstName, lastName, role }));
      await unwrap(
        upsertSubscription(user.id, {
          startDate: subStartDate,
          endDate: subEndDate,
        }),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
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
    setRole(user.role);
    setEditing(false);
    setEditError(null);
    setSubStartDate(toInputDate(user.subscription?.startDate));
    setSubEndDate(toInputDate(user.subscription?.endDate));
    setSubError(null);
  };

  const beginEdit = () => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setRole(user.role);
    setSubStartDate(toInputDate(user.subscription?.startDate));
    setSubEndDate(toInputDate(user.subscription?.endDate));
    setEditing(true);
    setEditError(null);
    setSubError(null);
  };

  return (
    <tr>
      <td className={styles.workerName}>
        {editing ? (
          <span className={styles.inlineFields}>
            <input
              className={styles.inlineInput}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ime"
            />
            <input
              className={styles.inlineInput}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Prezime"
            />
          </span>
        ) : (
          <>
            {user.firstName} {user.lastName}
          </>
        )}
      </td>

      <td>{user.email || "—"}</td>

      <td>{formatDate(user.createdAt)}</td>

      <td>
        {editing ? (
          <select
            className={styles.roleSelect}
            value={role}
            onChange={(e) => setRole(e.target.value as Users["role"])}
          >
            <option value="USER">Korisnik</option>
            <option value="PRO">Pro</option>
            <option value="BUSINESS">Business</option>
            <option value="ADMIN">Admin</option>
          </select>
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
        {editing ? (
          <input
            type="date"
            className={styles.input}
            value={subStartDate}
            disabled={!canEditDates}
            onChange={(e) => setSubStartDate(e.target.value)}
            title={
              !canEditDates ? "Aktivirajte pretplatu da mijenjate datume" : ""
            }
          />
        ) : (
          formatDate(sub?.startDate)
        )}
      </td>

      <td>
        {editing ? (
          <input
            type="date"
            className={styles.input}
            value={subEndDate}
            disabled={!canEditDates}
            onChange={(e) => setSubEndDate(e.target.value)}
            title={
              !canEditDates ? "Aktivirajte pretplatu da mijenjate datume" : ""
            }
          />
        ) : (
          formatDate(endDateToDisplay)
        )}
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
          {editing ? (
            <>
              <button
                className={styles.btnIcon}
                title="Sačuvaj"
                onClick={() => updateUser.mutate()}
                disabled={updateUser.isPending}
              >
                <LuCheck />
              </button>
              <button
                className={styles.btnIcon}
                title="Otkaži"
                onClick={cancelEdit}
              >
                <LuX />
              </button>
            </>
          ) : (
            <button
              className={styles.btnIcon}
              title="Uredi"
              onClick={beginEdit}
            >
              <LuPencil />
            </button>
          )}
        </span>

        {editError && <div className={styles.errorMsg}>{editError}</div>}
        {subError && <div className={styles.errorMsg}>{subError}</div>}
      </td>
    </tr>
  );
}
