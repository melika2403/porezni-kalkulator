"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  getClientOrganizations,
  getPersonClients,
  type Organization,
  type PersonClient,
} from "src/api/profile";
import { useMaxAccessibleTier } from "src/hooks/useAccessibleTier";
import styles from "../PersonFillSelect/PersonFillSelect.module.css";
import type { BuyerFillData } from "./BuyerFillSelect";

type Props = {
  onFill: (data: BuyerFillData) => void;
};

function personLabel(c: PersonClient): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || `Klijent #${c.id}`;
}

function orgLabel(o: Organization): string {
  return o.name || `Organizacija #${o.id}`;
}

export default function ClientFillSelect({ onFill }: Props) {
  // Faza 3B: pristup imamo ako sami PRO+ ili smo član PRO+ org-e.
  const { hasAccessToTier } = useMaxAccessibleTier();
  const isAllowed = hasAccessToTier("PRO");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: persons = [] } = useQuery({
    queryKey: ["clients-person"],
    queryFn: () => unwrap(getPersonClients()),
    enabled: isAllowed,
    retry: false,
  });
  const { data: clientOrgs = [] } = useQuery({
    queryKey: ["organizations-clients"],
    queryFn: () => unwrap(getClientOrganizations()),
    enabled: isAllowed,
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

  if (!isAllowed) return null;

  const q = filter.toLowerCase();
  const filteredOrgs = clientOrgs.filter((o) =>
    (orgLabel(o) + (o.taxNumber ?? "")).toLowerCase().includes(q),
  );
  const filteredPersons = persons.filter((p) =>
    (personLabel(p) + (p.jmbg ?? "") + (p.taxNumber ?? "")).toLowerCase().includes(q),
  );
  const noneFound = filteredOrgs.length === 0 && filteredPersons.length === 0;

  function pickPerson(p: PersonClient) {
    onFill({
      name: personLabel(p),
      address: p.address,
      city: p.city,
      postalCode: null,
      phone: p.phone,
      email: p.email,
      idNumber: p.taxNumber || p.jmbg,
      vatNumber: null,
    });
    setOpen(false);
    setFilter("");
  }
  function pickOrg(o: Organization) {
    onFill({
      name: o.name,
      address: o.address,
      city: o.city,
      postalCode: null,
      phone: o.phone,
      email: o.email,
      idNumber: o.taxNumber,
      vatNumber: o.pdvNumber ?? null,
      bankAccount: o.bankAccount,
    });
    setOpen(false);
    setFilter("");
  }

  if (clientOrgs.length === 0 && persons.length === 0) {
    return (
      <div className={styles.fillWrap}>
        <button type="button" className={styles.fillBtn} disabled title="Nema sačuvanih klijenata">
          — Iz liste klijenata —
        </button>
      </div>
    );
  }

  return (
    <div className={styles.fillWrap}>
      <div className={styles.dropdownWrap} ref={wrapRef}>
        <button
          type="button"
          className={styles.fillBtn}
          onClick={() => setOpen((v) => !v)}
        >
          — Iz liste klijenata —
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
              {noneFound && <div className={styles.dropdownEmpty}>Nema rezultata</div>}
              {filteredOrgs.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Klijentske firme</div>
                  {filteredOrgs.map((o) => (
                    <button
                      key={`o-${o.id}`}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => pickOrg(o)}
                    >
                      {orgLabel(o)}
                      {o.taxNumber ? ` (${o.taxNumber})` : ""}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
