"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import { getOrganizations, type Organization } from "src/api/profile";
import styles from "../PersonFillSelect/PersonFillSelect.module.css";

// ── Podaci koje šaljemo formi /pretplate ─────────────────────────────────────
export type BuyerFillData = {
  name: string | null;
  address: string | null;
  city: string | null;
  postalCode?: string | null;
  phone: string | null;
  email: string | null;
  idNumber: string | null; // ID broj (jmbg za fizičko, taxNumber za organizaciju)
  vatNumber?: string | null; // PDV broj — derivira se iz taxNumber-a
};

type Props = {
  onFill: (data: BuyerFillData) => void;
};

// PDV broj se ne derivira iz ID broja — ne svaki obveznik ima PDV broj
// (mala lica ispod praga PDV-a ga uopšte nemaju). Ostavlja se prazno
// dok korisnik ne unese ručno ako želi.

export default function BuyerFillSelect({ onFill }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });

  const { data: ownOrgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
    enabled: !!user,
    retry: false,
  });

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFilter("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (userLoading) return null;

  // ── Guest (neulogovan) ────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className={styles.fillWrap}>
        <div className={styles.dropdownWrap} ref={wrapRef}>
          <button
            type="button"
            className={styles.fillBtn}
            onClick={() => setOpen((v) => !v)}
          >
            — Popuni iz profila —
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>
          {open && (
            <div className={styles.guestPanel}>
              <p className={styles.guestText}>
                Uz besplatnu registraciju možete automatski popuniti podatke
                kupca iz profila ili svoje organizacije.
              </p>
              <a href="/registracija" className={styles.guestLink}>
                Registrujte se besplatno →
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Ulogovani korisnik ────────────────────────────────────────────────────
  const q = filter.toLowerCase();
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email ||
    "Moj profil";

  const profileMatches = !q || "moj profil".includes(q) || fullName.toLowerCase().includes(q);
  const filteredOrgs = ownOrgs.filter((o) =>
    (o.name + (o.taxNumber ?? "")).toLowerCase().includes(q),
  );
  const noneFound = !profileMatches && filteredOrgs.length === 0;

  function pickProfile() {
    if (!user) return;
    onFill({
      name: fullName,
      address: user.address ?? null,
      city: user.city ?? null,
      postalCode: null,
      phone: user.phone ?? null,
      email: user.email ?? null,
      idNumber: user.jmbg ?? null,
      vatNumber: null,
    });
    setOpen(false);
    setFilter("");
  }

  function pickOrg(org: Organization) {
    onFill({
      name: org.name ?? null,
      address: org.address ?? null,
      city: org.city ?? null,
      postalCode: null,
      phone: org.phone ?? null,
      email: org.email ?? user?.email ?? null,
      idNumber: org.taxNumber ?? null,
      vatNumber: null, // ne derivirati iz ID broja — korisnik unosi ručno
    });
    setOpen(false);
    setFilter("");
  }

  return (
    <div className={styles.fillWrap}>
      <div className={styles.dropdownWrap} ref={wrapRef}>
        <button
          type="button"
          className={styles.fillBtn}
          onClick={() => setOpen((v) => !v)}
        >
          — Popuni iz profila —
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>

        {open && (
          <div className={styles.dropdownPanel}>
            <input
              ref={searchRef}
              className={styles.dropdownSearch}
              placeholder="Pretraži..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className={styles.dropdownList}>
              {noneFound && (
                <div className={styles.dropdownEmpty}>Nema rezultata</div>
              )}
              {profileMatches && (
                <>
                  <div className={styles.dropdownGroup}>Moj profil</div>
                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={pickProfile}
                  >
                    {fullName}
                    {user.jmbg ? ` (${user.jmbg})` : ""}
                  </button>
                </>
              )}
              {filteredOrgs.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Moje organizacije</div>
                  {filteredOrgs.map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => pickOrg(org)}
                    >
                      {org.name}
                      {org.taxNumber ? ` (${org.taxNumber})` : ""}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
