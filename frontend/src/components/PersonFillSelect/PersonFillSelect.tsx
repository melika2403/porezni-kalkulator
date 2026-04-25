"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import {
  getPersonClients,
  getAllMyWorkers,
  type PersonClient,
  type WorkerWithOrg,
} from "src/api/profile";
import { useRole } from "src/hooks/useRole";
import styles from "./PersonFillSelect.module.css";

export type FillData = {
  jmbg: string | null;
  firstName: string | null;
  lastName: string | null;
  address: string | null;
  sourceClientId?: number | null;
  sourceWorkerOrgId?: number | null;
};

type Props = {
  onFill: (data: FillData) => void;
};

function clientLabel(c: PersonClient): string {
  return [c.lastName, c.firstName].filter(Boolean).join(" ") || `Klijent #${c.id}`;
}

function workerLabel(w: WorkerWithOrg): string {
  const name = [w.lastName, w.firstName].filter(Boolean).join(" ").trim();
  return `${name || `#${w.id}`} — ${w.organizationName}`;
}

export default function PersonFillSelect({ onFill }: Props) {
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

  const { data: clients = [] } = useQuery({
    queryKey: ["personClients"],
    queryFn: () => unwrap(getPersonClients()),
    retry: false,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["allMyWorkers"],
    queryFn: () => unwrap(getAllMyWorkers()),
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

  // Guest teaser
  if (!user) {
    return (
      <div className={styles.fillWrap}>
        <div className={styles.dropdownWrap} ref={wrapRef}>
          <button
            type="button"
            className={styles.fillBtn}
            onClick={() => setOpen((v) => !v)}
          >
            — Popuni podatke —
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

  // Simple case: not PRO and no workers — just a "fill from profile" button
  if (!isProOrBusiness && workers.length === 0) {
    return (
      <div className={styles.fillWrap}>
        <button
          type="button"
          className={styles.fillBtn}
          title="Popuni iz korisničkog profila"
          onClick={() =>
            onFill({
              jmbg: user.jmbg,
              firstName: user.firstName,
              lastName: user.lastName,
              address: user.address,
              sourceClientId: null,
            })
          }
        >
          Popuni iz profila
        </button>
      </div>
    );
  }

  const q = filter.toLowerCase();

  const sortByLabel = <T,>(arr: T[], label: (x: T) => string) =>
    [...arr].sort((a, b) => label(a).localeCompare(label(b), "bs"));

  const vlasnici = sortByLabel(
    workers.filter((w) => w.role === "VLASNIK" && workerLabel(w).toLowerCase().includes(q)),
    workerLabel,
  );
  const radnici = sortByLabel(
    workers.filter((w) => w.role === "RADNIK" && workerLabel(w).toLowerCase().includes(q)),
    workerLabel,
  );
  const filteredClients = sortByLabel(
    clients.filter((c) => (clientLabel(c) + (c.jmbg ?? "")).toLowerCase().includes(q)),
    clientLabel,
  );
  const profileMatches = !q || "moj profil".includes(q);

  const noneFound =
    !profileMatches &&
    vlasnici.length === 0 &&
    radnici.length === 0 &&
    filteredClients.length === 0;

  function pick(data: FillData) {
    onFill(data);
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
          — Popuni podatke —
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
              {profileMatches && (
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() =>
                    pick({
                      jmbg: user.jmbg,
                      firstName: user.firstName,
                      lastName: user.lastName,
                      address: user.address,
                      sourceClientId: null,
                    })
                  }
                >
                  Moj profil
                </button>
              )}
              {vlasnici.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Vlasnici</div>
                  {vlasnici.map((w) => (
                    <button
                      key={`v-${w.id}`}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() =>
                        pick({
                          jmbg: w.jmbg,
                          firstName: w.firstName,
                          lastName: w.lastName,
                          address: w.address,
                          sourceWorkerOrgId: w.organizationId,
                        })
                      }
                    >
                      {workerLabel(w)}
                    </button>
                  ))}
                </>
              )}
              {radnici.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Radnici</div>
                  {radnici.map((w) => (
                    <button
                      key={`r-${w.id}`}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() =>
                        pick({
                          jmbg: w.jmbg,
                          firstName: w.firstName,
                          lastName: w.lastName,
                          address: w.address,
                          sourceWorkerOrgId: w.organizationId,
                        })
                      }
                    >
                      {workerLabel(w)}
                    </button>
                  ))}
                </>
              )}
              {filteredClients.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Fizička lica</div>
                  {filteredClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() =>
                        pick({
                          jmbg: c.jmbg,
                          firstName: c.firstName,
                          lastName: c.lastName,
                          address: c.address,
                          sourceClientId: c.id,
                        })
                      }
                    >
                      {clientLabel(c)}
                      {c.jmbg ? ` (${c.jmbg})` : ""}
                    </button>
                  ))}
                </>
              )}
            </div>
            {!isProOrBusiness && (
              <div className={styles.dropdownTeaser}>
                <p className={styles.dropdownTeaserText}>Uz pretplatu: fizička lica, vlasnici organizacija</p>
                <a href="/profil#pretplata" className={styles.dropdownTeaserLink}>Pretplatite se →</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
