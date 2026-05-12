"use client";

import { useEffect, useRef, useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import {
  useAddMember,
  useOrganizationMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "src/hooks/useOrganizationSettings";
import type { OrgMember } from "src/api/profile";

const ROLE_LABEL: Record<OrgMember["role"], string> = {
  OWNER: "Vlasnik",
  ADMIN: "Admin",
  MEMBER: "Član",
};

const ROLE_BADGE: Record<OrgMember["role"], string> = {
  OWNER: "bg-brand-600 text-white",
  ADMIN: "bg-info-bg text-info",
  MEMBER: "bg-cream-200 text-text-secondary",
};

const ERROR_MESSAGES: Record<string, string> = {
  USER_NOT_FOUND: "Korisnik s tim emailom nije registrovan.",
  ALREADY_MEMBER: "Korisnik je već član organizacije.",
  FORBIDDEN: "Nemate dozvolu za ovu akciju.",
};

export function KorisniciTab() {
  const me = usePkOfficeMe();
  const activeOrg = me.data?.activeOrganization ?? me.data?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;
  const isOwner = activeOrg?.role === "OWNER";

  const members = useOrganizationMembers(orgId);
  const addMember = useAddMember(orgId ?? 0);
  const updateRole = useUpdateMemberRole(orgId ?? 0);
  const removeMember = useRemoveMember(orgId ?? 0);

  const [inviteOpen, setInviteOpen] = useState(false);

  if (me.isLoading || members.isLoading) {
    return <div className="text-[13px] text-text-secondary">Učitavanje...</div>;
  }

  if (!orgId) {
    return (
      <div className="text-[13px] text-text-secondary">
        Nemate aktivan obrt.
      </div>
    );
  }

  const list: OrgMember[] = members.data ?? [];

  return (
    <div className="space-y-4">
      <div className="bg-cream-100 border border-cream-300 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-cream-300">
          <h2 className="font-serif-display text-[22px] leading-tight text-text-primary">
            Članovi organizacije
          </h2>
          {isOwner && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-2 pl-4 pr-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-[13.5px] font-medium transition-colors shadow-[0_4px_14px_-4px_rgba(58,92,66,0.4)]"
            >
              <IconPlus size={16} />
              Pozovi korisnika
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="px-5 py-6 text-[13px] text-text-tertiary">
            Nema članova.
          </div>
        ) : (
          <ul>
            {list.map((m) => (
              <li
                key={m.userId}
                className="flex items-center gap-3 px-5 py-3 border-b border-cream-300 last:border-0"
              >
                <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[12px] font-semibold shrink-0">
                  {(m.user.firstName?.[0] ?? "") + (m.user.lastName?.[0] ?? "")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-text-primary truncate">
                    {m.user.firstName} {m.user.lastName}
                  </div>
                  <div className="text-[12px] text-text-tertiary truncate">
                    {m.user.email}
                  </div>
                </div>
                <span
                  className={[
                    "text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded-full shrink-0",
                    ROLE_BADGE[m.role],
                  ].join(" ")}
                >
                  {ROLE_LABEL[m.role]}
                </span>
                {isOwner && m.role !== "OWNER" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={m.role}
                      onChange={(e) =>
                        updateRole.mutate({
                          userId: m.userId,
                          role: e.target.value as "ADMIN" | "MEMBER",
                        })
                      }
                      disabled={updateRole.isPending}
                      className="px-2 py-1 text-[12px] bg-cream-50 border border-cream-300 rounded-lg text-text-primary focus:outline-none focus:border-brand-600"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Član</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Ukloniti ${m.user.firstName} ${m.user.lastName}?`,
                          )
                        ) {
                          removeMember.mutate(m.userId);
                        }
                      }}
                      disabled={removeMember.isPending}
                      className="p-1.5 hover:bg-danger-bg text-text-tertiary hover:text-danger rounded-lg disabled:opacity-50"
                      title="Ukloni člana"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onInvite={async (email, role) => {
            try {
              await addMember.mutateAsync({ email, role });
              setInviteOpen(false);
              return null;
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              return ERROR_MESSAGES[msg] || msg;
            }
          }}
          isPending={addMember.isPending}
        />
      )}
    </div>
  );
}

function InviteModal({
  onClose,
  onInvite,
  isPending,
}: {
  onClose: () => void;
  onInvite: (email: string, role: "ADMIN" | "MEMBER") => Promise<string | null>;
  isPending: boolean;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email je obavezan.");
      return;
    }
    const errMsg = await onInvite(email.trim(), role);
    if (errMsg) setError(errMsg);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-cream-50 border border-cream-300 rounded-lg shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 border-b border-cream-300">
            <h3 className="text-[15px] font-semibold text-text-primary">
              Pozovi korisnika
            </h3>
            <p className="text-[12px] text-text-tertiary mt-0.5">
              Korisnik mora već imati registrovan nalog.
            </p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <label className="block">
              <span className="text-[12px] font-medium text-text-primary block mb-1">
                Email
              </span>
              <input
                ref={inputRef}
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="w-full px-3 py-2 text-[13px] bg-cream-100 border border-cream-300 rounded-lg text-text-primary focus:outline-none focus:border-brand-600"
                placeholder="korisnik@primjer.ba"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-text-primary block mb-1">
                Uloga
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "ADMIN" | "MEMBER")}
                className="w-full px-3 py-2 text-[13px] bg-cream-100 border border-cream-300 rounded-lg text-text-primary focus:outline-none focus:border-brand-600"
              >
                <option value="MEMBER">Član — pristup samo svojim alatima</option>
                <option value="ADMIN">Admin — može mijenjati postavke obrta</option>
              </select>
            </label>
            {error && (
              <div className="text-[12px] text-danger bg-danger-bg px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-cream-300 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-cream-300 hover:bg-cream-200 rounded-full text-[13.5px] font-medium text-text-primary transition-colors"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-[13.5px] font-medium disabled:opacity-50 transition-colors shadow-[0_4px_14px_-4px_rgba(58,92,66,0.4)]"
            >
              {isPending ? "Pozivanje..." : "Pozovi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
