"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import {
  getAllMyWorkers,
  getClientOrganizations,
  getOrganizations,
  getPersonClients,
  type Organization,
  type PersonClient,
  type WorkerWithOrg,
} from "src/api/profile";
import { useRole } from "src/hooks/useRole";
import styles from "../PersonFillSelect/PersonFillSelect.module.css";

// ── Podaci koje šaljemo formi (faktura / predračun) ──────────────────────
export type BuyerFillData = {
  name: string | null;
  address: string | null;
  city: string | null;
  postalCode?: string | null;
  phone: string | null;
  email: string | null;
  idNumber: string | null; // ID broj (jmbg za fizičko, taxNumber za organizaciju)
  vatNumber?: string | null; // PDV broj — derivira se iz taxNumber-a
  // Dodatna polja korisna kada se popunjava prodavac na fakturi:
  bankAccount?: string | null;
  logoUrl?: string | null;
  organizationId?: number | null;
};

type Props = {
  onFill: (data: BuyerFillData) => void;
};

function personLabel(c: PersonClient): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || `Klijent #${c.id}`;
}

function workerLabel(w: WorkerWithOrg): string {
  const name = [w.firstName, w.lastName].filter(Boolean).join(" ").trim();
  return `${name || `#${w.id}`} — ${w.organizationName}`;
}

export default function BuyerFillSelect({ onFill }: Props) {
  const { hasRole } = useRole();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });

  const isProOrBusiness = hasRole("PRO", "BUSINESS", "ADMIN");

  const { data: ownOrgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
    enabled: !!user,
    retry: false,
  });

  const { data: clientOrgs = [] } = useQuery({
    queryKey: ["organizations-clients"],
    queryFn: () => unwrap(getClientOrganizations()),
    enabled: isProOrBusiness,
    retry: false,
  });

  const { data: persons = [] } = useQuery({
    queryKey: ["personClients"],
    queryFn: () => unwrap(getPersonClients()),
    enabled: isProOrBusiness,
    retry: false,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["allMyWorkers"],
    queryFn: () => unwrap(getAllMyWorkers()),
    enabled: isProOrBusiness,
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

  const profileMatches =
    !q || "moj profil".includes(q) || fullName.toLowerCase().includes(q);
  const filteredOwnOrgs = ownOrgs.filter((o) =>
    (o.name + (o.taxNumber ?? "")).toLowerCase().includes(q),
  );
  const filteredClientOrgs = clientOrgs.filter((o) =>
    (o.name + (o.taxNumber ?? "")).toLowerCase().includes(q),
  );
  const filteredPersons = persons.filter((p) =>
    (personLabel(p) + (p.jmbg ?? "") + (p.taxNumber ?? ""))
      .toLowerCase()
      .includes(q),
  );
  const vlasnici = workers
    .filter((w) => w.role === "VLASNIK" && workerLabel(w).toLowerCase().includes(q))
    .sort((a, b) => workerLabel(a).localeCompare(workerLabel(b), "bs"));

  const noneFound =
    !profileMatches &&
    filteredOwnOrgs.length === 0 &&
    filteredClientOrgs.length === 0 &&
    filteredPersons.length === 0 &&
    vlasnici.length === 0;

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
      bankAccount: null,
      logoUrl: null,
      organizationId: null,
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
      vatNumber: org.pdvNumber ?? null,
      bankAccount: org.bankAccount ?? null,
      logoUrl: org.logoUrl ?? null,
      organizationId: org.id,
    });
    setOpen(false);
    setFilter("");
  }

  function pickClientOrg(org: Organization) {
    onFill({
      name: org.name ?? null,
      address: org.address ?? null,
      city: org.city ?? null,
      postalCode: null,
      phone: org.phone ?? null,
      email: org.email ?? null,
      idNumber: org.taxNumber ?? null,
      vatNumber: org.pdvNumber ?? null,
      bankAccount: org.bankAccount ?? null,
      logoUrl: null,
      organizationId: org.id,
    });
    setOpen(false);
    setFilter("");
  }

  function pickPerson(p: PersonClient) {
    onFill({
      name: personLabel(p),
      address: p.address ?? null,
      city: p.city ?? null,
      postalCode: null,
      phone: p.phone ?? null,
      email: p.email ?? null,
      idNumber: p.taxNumber || p.jmbg || null,
      vatNumber: null,
      bankAccount: null,
      logoUrl: null,
      organizationId: null,
    });
    setOpen(false);
    setFilter("");
  }

  function pickWorker(w: WorkerWithOrg) {
    const name = [w.firstName, w.lastName].filter(Boolean).join(" ").trim();
    onFill({
      name: name || null,
      address: w.address ?? null,
      city: w.city ?? null,
      postalCode: null,
      phone: null,
      email: w.email ?? null,
      idNumber: w.jmbg ?? null,
      vatNumber: null,
      bankAccount: w.bankAccount ?? null,
      logoUrl: null,
      organizationId: null,
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
              {filteredOwnOrgs.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Moje organizacije</div>
                  {filteredOwnOrgs.map((org) => (
                    <button
                      key={`own-${org.id}`}
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
              {filteredClientOrgs.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Klijentske organizacije</div>
                  {filteredClientOrgs.map((org) => (
                    <button
                      key={`cli-${org.id}`}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => pickClientOrg(org)}
                    >
                      {org.name}
                      {org.taxNumber ? ` (${org.taxNumber})` : ""}
                    </button>
                  ))}
                </>
              )}
              {filteredPersons.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Fizička lica</div>
                  {filteredPersons.map((p) => (
                    <button
                      key={`p-${p.id}`}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => pickPerson(p)}
                    >
                      {personLabel(p)}
                      {p.jmbg ? ` (${p.jmbg})` : ""}
                    </button>
                  ))}
                </>
              )}
              {vlasnici.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Vlasnici</div>
                  {vlasnici.map((w) => (
                    <button
                      key={`v-${w.id}`}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => pickWorker(w)}
                    >
                      {workerLabel(w)}
                    </button>
                  ))}
                </>
              )}
            </div>
            {!isProOrBusiness && (
              <div className={styles.dropdownTeaser}>
                <p className={styles.dropdownTeaserText}>
                  Uz pretplatu: klijentske organizacije, fizička lica, vlasnici
                </p>
                <a href="/profil#pretplata" className={styles.dropdownTeaserLink}>
                  Pretplatite se →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
