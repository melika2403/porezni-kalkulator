"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import {
  getOrganizations,
  getClientOrganizations,
  type Organization,
} from "src/api/profile";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import styles from "./PersonFillSelect.module.css";

export type OrgFillData = {
  name: string | null;
  taxNumber: string | null;
  activityCode: string | null;
  activityName: string | null;
  address: string | null;
  city: string | null;
  sourceOrgId?: number | null;
  owner?: {
    jmbg: string | null;
    firstName: string;
    lastName: string;
    address: string | null;
    city: string | null;
  } | null;
};

type Props = {
  onFill: (data: OrgFillData) => void;
};

function optionText(org: Organization): string {
  return org.name || `Organizacija #${org.id}`;
}

export default function OrgFillSelect({ onFill }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Faza 3B: pristup klijent-org-ima imamo ako vlastiti plan ili bilo koja
  // moja org-a je PRO+.
  const { hasAccessToTier } = useMaxAccessibleTier();
  const isProOrBusiness = hasAccessToTier("PRO");

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });

  const { data: ownOrgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => unwrap(getOrganizations()),
    retry: false,
  });

  const { data: clientOrgs = [] } = useQuery({
    queryKey: ["organizations-clients"],
    queryFn: () => unwrap(getClientOrganizations()),
    enabled: isProOrBusiness,
    retry: false,
  });

  const hasAny = ownOrgs.length > 0 || clientOrgs.length > 0;
  const isGuest = !userLoading && user === null;

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

  if (isGuest) {
    return (
      <div className={styles.fillWrap}>
        <div className={styles.dropdownWrap} ref={wrapRef}>
          <button
            type="button"
            className={styles.fillBtn}
            onClick={() => setOpen((v) => !v)}
          >
            – Popuni djelatnost –
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>
          {open && (
            <div className={styles.guestPanel}>
              <p className={styles.guestText}>
                Uz besplatnu registraciju možete automatski popunjavati podatke sa profila za sebe i svoju organizaciju.
              </p>
              <a href="/registracija" className={styles.guestLink}>Registrujte se besplatno →</a>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!hasAny) return null;

  const q = filter.toLowerCase();
  const filteredOwn = ownOrgs.filter((o) =>
    optionText(o).toLowerCase().includes(q),
  );
  const filteredClient = clientOrgs.filter((o) =>
    optionText(o).toLowerCase().includes(q),
  );
  const noneFound = filteredOwn.length === 0 && filteredClient.length === 0;

  function pick(org: Organization) {
    const isOwnOrg = ownOrgs.some((o) => o.id === org.id);
    const fallbackOwner =
      isOwnOrg && !org.owner && user
        ? {
            jmbg: user.jmbg,
            firstName: user.firstName,
            lastName: user.lastName,
            address: user.address,
            city: user.city,
          }
        : null;
    onFill({
      name: org.name,
      taxNumber: org.taxNumber,
      activityCode: org.activityCode,
      activityName: org.activityName,
      address: org.address,
      city: org.city,
      sourceOrgId: org.id,
      owner: org.owner
        ? {
            jmbg: org.owner.jmbg,
            firstName: org.owner.firstName ?? "",
            lastName: org.owner.lastName ?? "",
            address: org.owner.address,
            city: org.owner.city,
          }
        : fallbackOwner,
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
          – Popuni djelatnost –
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              {filteredOwn.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Moje organizacije</div>
                  {filteredOwn.map((org) => (
                    <button
                      key={org.id}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => pick(org)}
                    >
                      {optionText(org)}
                      {org.taxNumber ? ` (${org.taxNumber})` : ""}
                    </button>
                  ))}
                </>
              )}
              {isProOrBusiness && (
                <>
                  <div className={styles.dropdownGroup}>Klijentske organizacije</div>
                  {filteredClient.length > 0 ? (
                    filteredClient.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        className={styles.dropdownItem}
                        onClick={() => pick(org)}
                      >
                        {optionText(org)}
                        {org.taxNumber ? ` (${org.taxNumber})` : ""}
                      </button>
                    ))
                  ) : (
                    <div className={styles.dropdownEmpty} style={{ fontSize: 12 }}>
                      Nemate dodanu nijednu klijentsku organizaciju.{" "}
                      <a href="/klijenti" style={{ color: "var(--sage)" }}>
                        Dodaj →
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
            {!isProOrBusiness && (
              <div className={styles.dropdownTeaser}>
                <p className={styles.dropdownTeaserText}>Uz pretplatu: klijentske organizacije</p>
                <a href="/profil#pretplata" className={styles.dropdownTeaserLink}>Pretplatite se →</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
