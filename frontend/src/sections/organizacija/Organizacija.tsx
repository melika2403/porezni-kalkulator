"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import styles from "./organizacija.module.css";
import {
  getOrganization,
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  getMembers,
  addMember,
  removeMember,
  updateMemberRole,
  type Organization,
  type Worker,
  type WorkerPayload,
  type OrgMember,
} from "src/api/profile";
import { unwrap } from "src/api/auth";
import RoleGuard from "src/components/RoleGuard/RoleGuard";
import DateInput from "src/components/DateInput/DateInput";
import { useRole } from "src/hooks/useRole";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkerForm = {
  role: "VLASNIK" | "RADNIK";
  firstName: string;
  lastName: string;
  jmbg: string;
  startDate: string;
  endDate: string;
};

const emptyForm = (): WorkerForm => ({
  role: "RADNIK",
  firstName: "",
  lastName: "",
  jmbg: "",
  startDate: "",
  endDate: "",
});

function formToPayload(f: WorkerForm): WorkerPayload {
  return {
    role: f.role,
    firstName: f.firstName.trim(),
    lastName: f.lastName.trim(),
    jmbg: f.jmbg.trim() || undefined,
    startDate: f.startDate || null,
    endDate: f.endDate.trim() || null,
  };
}

function workerToForm(w: Worker): WorkerForm {
  return {
    role: w.role,
    firstName: w.firstName,
    lastName: w.lastName,
    jmbg: w.jmbg ?? "",
    startDate: w.startDate ?? "",
    endDate: w.endDate ?? "",
  };
}

const ROLE_LABELS: Record<string, string> = {
  VLASNIK: "Vlasnik",
  RADNIK: "Radnik",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}

const ORG_TYPE_LABELS: Record<string, string> = {
  COMPANY: "Privredno društvo",
  BUSINESS: "Obrt / Samostalna djelatnost",
};

// ─── Worker row form (add or edit) ────────────────────────────────────────────

function WorkerFormFields({
  value,
  onChange,
}: {
  value: WorkerForm;
  onChange: (v: WorkerForm) => void;
}) {
  const set =
    (k: keyof WorkerForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...value, [k]: e.target.value });

  const isVlasnik = value.role === "VLASNIK";

  return (
    <div className={styles.formGrid}>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Uloga</label>
        <select
          className={styles.input}
          value={value.role}
          onChange={set("role")}
        >
          <option value="RADNIK">Radnik</option>
          <option value="VLASNIK">Vlasnik</option>
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Ime</label>
        <input
          className={styles.input}
          value={value.firstName}
          onChange={set("firstName")}
          placeholder="Ime"
          required
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Prezime</label>
        <input
          className={styles.input}
          value={value.lastName}
          onChange={set("lastName")}
          placeholder="Prezime"
          required
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>JMBG</label>
        <input
          className={styles.input}
          value={value.jmbg}
          onChange={set("jmbg")}
          placeholder="1234567890123"
          maxLength={13}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>
          Početak radnog odnosa{isVlasnik ? " (opciono)" : ""}
        </label>
        <DateInput
          className={styles.input}
          value={value.startDate}
          onValueChange={(iso) => onChange({ ...value, startDate: iso })}
          required={!isVlasnik}
        />
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Kraj radnog odnosa</label>
        <DateInput
          className={styles.input}
          value={value.endDate}
          onValueChange={(iso) => onChange({ ...value, endDate: iso })}
        />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PRO_WORKERS_LIMIT = 5;

export default function Organizacija({ orgId }: { orgId: number }) {
  const queryClient = useQueryClient();
  const { role: userRole } = useRole();

  const { data: org, isLoading: orgLoading } = useQuery<Organization>({
    queryKey: ["organization", orgId],
    queryFn: () => unwrap(getOrganization(orgId)),
  });

  const { data: workers = [], isLoading: workersLoading } = useQuery<Worker[]>({
    queryKey: ["workers", orgId],
    queryFn: () => unwrap(getWorkers(orgId)),
  });

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<WorkerForm>(emptyForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<WorkerForm>(emptyForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const canEdit = org?.memberRole === "OWNER" || org?.memberRole === "ADMIN";
  const isProLimitReached = userRole === "PRO" && workers.length >= PRO_WORKERS_LIMIT;

  const createMutation = useMutation({
    mutationFn: (payload: WorkerPayload) =>
      unwrap(createWorker(orgId, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
      setShowAdd(false);
      setAddForm(emptyForm());
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<WorkerPayload>;
    }) => unwrap(updateWorker(orgId, id, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => unwrap(deleteWorker(orgId, id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workers", orgId] });
      setDeleteConfirmId(null);
    },
  });

  const startEdit = (w: Worker) => {
    setEditId(w.id);
    setEditForm(workerToForm(w));
    updateMutation.reset();
    setShowAdd(false);
  };

  if (orgLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>Učitavanje...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className={styles.page}>
        <Link href="/profil" className={styles.back}>
          ← Nazad na profil
        </Link>
        <div className={styles.empty}>
          Organizacija nije pronađena ili nemate pristup.
        </div>
      </div>
    );
  }

  const activeWorkers = workers.filter((w) => !w.endDate);
  const inactiveWorkers = workers.filter((w) => w.endDate);

  return (
    <div className={styles.page}>
      <RoleGuard roles={["PRO", "BUSINESS", "ADMIN"]} mode="hide">
        <Link href="/profil" className={styles.back}>
          ← Nazad na profil
        </Link>

        {/* ── Org header ── */}
        <div className={styles.orgHeader}>
          <h1 className={styles.orgTitle}>{org.name}</h1>
          <div className={styles.orgMeta}>
            <span>{ORG_TYPE_LABELS[org.type] ?? org.type}</span>
            {org.taxNumber && <span>JIB: {org.taxNumber}</span>}
            {org.owner && (
              <span>
                Vlasnik: {org.owner.firstName} {org.owner.lastName}
              </span>
            )}
          </div>
        </div>

        {/* ── Workers card ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              Radnici{workers.length > 0 ? ` (${workers.length})` : ""}
            </span>
            {canEdit && !showAdd && !isProLimitReached && (
              <button
                className={styles.btnPrimary}
                onClick={() => {
                  setShowAdd(true);
                  setEditId(null);
                  createMutation.reset();
                }}
              >
                + Dodaj radnika
              </button>
            )}
            {isProLimitReached && (
              <span className={styles.limitNotice}>
                PRO plan: maksimalno {PRO_WORKERS_LIMIT} radnika po organizaciji
              </span>
            )}
          </div>

          {/* Add form */}
          {showAdd && canEdit && (
            <form
              className={styles.formCard}
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formToPayload(addForm));
              }}
            >
              <WorkerFormFields value={addForm} onChange={setAddForm} />
              {createMutation.error && (
                <div className={styles.errorMsg}>
                  {createMutation.error.message === "WORKERS_LIMIT_REACHED"
                    ? `PRO plan dozvoljava najviše ${PRO_WORKERS_LIMIT} radnika po organizaciji.`
                    : createMutation.error.message}
                </div>
              )}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => {
                    setShowAdd(false);
                    setAddForm(emptyForm());
                  }}
                >
                  Odustani
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Dodavanje..." : "Dodaj radnika"}
                </button>
              </div>
            </form>
          )}

          {workersLoading && (
            <div className={styles.empty}>Učitavanje radnika...</div>
          )}

          {!workersLoading && workers.length === 0 && !showAdd && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>👥</div>
              <div>Nema dodanih radnika.</div>
            </div>
          )}

          {workers.length > 0 && (
            <WorkerTable
              workers={[...activeWorkers, ...inactiveWorkers]}
              canEdit={canEdit}
              editId={editId}
              editForm={editForm}
              setEditForm={setEditForm}
              deleteConfirmId={deleteConfirmId}
              setDeleteConfirmId={setDeleteConfirmId}
              onStartEdit={startEdit}
              onCancelEdit={() => setEditId(null)}
              onSaveEdit={(w) =>
                updateMutation.mutate({
                  id: w.id,
                  payload: formToPayload(editForm),
                })
              }
              onDelete={(id) => deleteMutation.mutate(id)}
              updateError={updateMutation.error?.message ?? null}
              updatePending={updateMutation.isPending}
              deletePending={deleteMutation.isPending}
            />
          )}
        </div>

        {/* ── Members card (owner only) ── */}
        {org.memberRole === "OWNER" && <MembersCard orgId={orgId} />}
      </RoleGuard>
    </div>
  );
}

// ─── Members card ─────────────────────────────────────────────────────────────

const MEMBER_ROLE_LABELS: Record<string, string> = {
  OWNER: "Vlasnik (app)",
  ADMIN: "Admin",
  MEMBER: "Član",
};

function MembersCard({ orgId }: { orgId: number }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [removeConfirmId, setRemoveConfirmId] = useState<number | null>(null);

  const { data: members = [], isLoading } = useQuery<OrgMember[]>({
    queryKey: ["members", orgId],
    queryFn: () => unwrap(getMembers(orgId)),
  });

  const addMutation = useMutation({
    mutationFn: (payload: { email: string; role: "ADMIN" | "MEMBER" }) =>
      unwrap(addMember(orgId, payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", orgId] });
      setShowAdd(false);
      setEmail("");
      setRole("MEMBER");
    },
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: number;
      role: "ADMIN" | "MEMBER";
    }) => unwrap(updateMemberRole(orgId, userId, role)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["members", orgId] }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => unwrap(removeMember(orgId, userId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", orgId] });
      setRemoveConfirmId(null);
    },
  });

  const addError =
    addMutation.error?.message === "USER_NOT_FOUND"
      ? "Korisnik s tim emailom nije pronađen."
      : addMutation.error?.message === "ALREADY_MEMBER"
        ? "Taj korisnik već ima pristup."
        : (addMutation.error?.message ?? null);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          Pristup korisnicima{members.length > 0 ? ` (${members.length})` : ""}
        </span>
        {!showAdd && (
          <button
            className={styles.btnPrimary}
            onClick={() => {
              setShowAdd(true);
              addMutation.reset();
            }}
          >
            + Dodaj korisnika
          </button>
        )}
      </div>

      {showAdd && (
        <form
          className={styles.formCard}
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate({ email: email.trim(), role });
          }}
        >
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Email korisnika</label>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="korisnik@email.ba"
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Uloga</label>
              <select
                className={styles.input}
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
              >
                <option value="MEMBER">Član — može pregledati</option>
                <option value="ADMIN">Admin — može uređivati</option>
              </select>
            </div>
          </div>
          {addError && <div className={styles.errorMsg}>{addError}</div>}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => {
                setShowAdd(false);
                setEmail("");
                setRole("MEMBER");
              }}
            >
              Odustani
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? "Dodavanje..." : "Dodaj"}
            </button>
          </div>
        </form>
      )}

      {isLoading && <div className={styles.empty}>Učitavanje...</div>}

      {!isLoading && members.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Korisnik</th>
              <th>Email</th>
              <th>Uloga</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td className={styles.workerName}>
                  {m.user.firstName} {m.user.lastName}
                </td>
                <td className={styles.workerJmbg}>{m.user.email ?? "—"}</td>
                <td>
                  {m.role === "OWNER" ? (
                    <span className={styles.vlasnikBadge}>
                      {MEMBER_ROLE_LABELS[m.role]}
                    </span>
                  ) : (
                    <select
                      className={styles.roleSelect}
                      value={m.role}
                      disabled={roleChangeMutation.isPending}
                      onChange={(e) =>
                        roleChangeMutation.mutate({
                          userId: m.userId,
                          role: e.target.value as "ADMIN" | "MEMBER",
                        })
                      }
                    >
                      <option value="MEMBER">Član</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  )}
                </td>
                <td>
                  {m.role !== "OWNER" &&
                    (removeConfirmId === m.userId ? (
                      <div className={styles.rowActions}>
                        <button
                          className={styles.btnDanger}
                          disabled={removeMutation.isPending}
                          onClick={() => removeMutation.mutate(m.userId)}
                        >
                          {removeMutation.isPending ? "..." : "Potvrdi"}
                        </button>
                        <button
                          className={styles.btnGhost}
                          onClick={() => setRemoveConfirmId(null)}
                        >
                          Odustani
                        </button>
                      </div>
                    ) : (
                      <button
                        className={styles.btnIcon}
                        title="Ukloni pristup"
                        onClick={() => setRemoveConfirmId(m.userId)}
                      >
                        <LuTrash2 />
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Worker table ─────────────────────────────────────────────────────────────

function WorkerTable({
  workers,
  canEdit,
  editId,
  editForm,
  setEditForm,
  deleteConfirmId,
  setDeleteConfirmId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  updateError,
  updatePending,
  deletePending,
}: {
  workers: Worker[];
  canEdit: boolean;
  editId: number | null;
  editForm: WorkerForm;
  setEditForm: (f: WorkerForm) => void;
  deleteConfirmId: number | null;
  setDeleteConfirmId: (id: number | null) => void;
  onStartEdit: (w: Worker) => void;
  onCancelEdit: () => void;
  onSaveEdit: (w: Worker) => void;
  onDelete: (id: number) => void;
  updateError: string | null;
  updatePending: boolean;
  deletePending: boolean;
}) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Ime i prezime</th>
          <th>Uloga</th>
          <th>JMBG</th>
          <th>Početak</th>
          <th>Kraj</th>
          <th>Status</th>
          {canEdit && <th></th>}
        </tr>
      </thead>
      <tbody>
        {workers.map((w) =>
          editId === w.id ? (
            <tr key={w.id}>
              <td colSpan={canEdit ? 7 : 6}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSaveEdit(w);
                  }}
                >
                  <WorkerFormFields value={editForm} onChange={setEditForm} />
                  {updateError && (
                    <div className={styles.errorMsg}>{updateError}</div>
                  )}
                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={onCancelEdit}
                    >
                      Odustani
                    </button>
                    <button
                      type="submit"
                      className={styles.btnPrimary}
                      disabled={updatePending}
                    >
                      {updatePending ? "Snimanje..." : "Sačuvaj"}
                    </button>
                  </div>
                </form>
              </td>
            </tr>
          ) : (
            <tr key={w.id}>
              <td className={styles.workerName}>
                {w.firstName} {w.lastName}
              </td>
              <td>
                <span
                  className={
                    w.role === "VLASNIK"
                      ? styles.vlasnikBadge
                      : styles.radnikBadge
                  }
                >
                  {ROLE_LABELS[w.role] ?? w.role}
                </span>
              </td>
              <td className={styles.workerJmbg}>{w.jmbg ?? "—"}</td>
              <td className={styles.dateRange}>{fmtDate(w.startDate)}</td>
              <td className={styles.dateRange}>{fmtDate(w.endDate)}</td>
              <td>
                {!w.endDate ? (
                  <span className={styles.activeBadge}>Aktivan</span>
                ) : (
                  <span className={styles.inactiveBadge}>Završen</span>
                )}
              </td>
              {canEdit && (
                <td>
                  {deleteConfirmId === w.id ? (
                    <div className={styles.rowActions}>
                      <button
                        className={styles.btnDanger}
                        disabled={deletePending}
                        onClick={() => onDelete(w.id)}
                      >
                        {deletePending ? "..." : "Potvrdi"}
                      </button>
                      <button
                        className={styles.btnGhost}
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Odustani
                      </button>
                    </div>
                  ) : (
                    <div className={styles.rowActions}>
                      <button
                        className={styles.btnIcon}
                        title="Uredi"
                        onClick={() => onStartEdit(w)}
                      >
                        <LuPencil />
                      </button>
                      <button
                        className={styles.btnIcon}
                        title="Obriši"
                        onClick={() => setDeleteConfirmId(w.id)}
                      >
                        <LuTrash2 />
                      </button>
                    </div>
                  )}
                </td>
              )}
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
}
