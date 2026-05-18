"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";
import {
  getOrganizations,
  getClientOrganizations,
  getPersonClients,
  getAllMyWorkers,
  type Organization,
  type PersonClient,
  type WorkerWithOrg,
} from "src/api/profile";
import { useRole } from "src/hooks/useRole";
import styles from "./PersonFillSelect.module.css";

export type UgovorFillData = {
  name: string;
  address: string;
  city: string;
  id: string;
  bankAccount?: string;
  /** Ime vlasnika organizacije (zastupnik); prazno za fizička lica i radnike. */
  ownerName?: string;
};

type Props = {
  onFill: (data: UgovorFillData) => void;
};

function orgLabel(o: Organization) {
  return o.name || `Organizacija #${o.id}`;
}

function personLabel(c: PersonClient) {
  return [c.lastName, c.firstName].filter(Boolean).join(" ") || `Klijent #${c.id}`;
}

function workerLabel(w: WorkerWithOrg) {
  const name = [w.lastName, w.firstName].filter(Boolean).join(" ").trim();
  return `${name || `#${w.id}`} — ${w.organizationName}`;
}

const CHEVRON = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4l4 4 4-4" />
  </svg>
);

export default function UgovorFillSelect({ onFill }: Props) {
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

  // Guest teaser
  if (!user) {
    return (
      <div className={styles.fillWrap}>
        <div className={styles.dropdownWrap} ref={wrapRef}>
          <button type="button" className={styles.fillBtn} onClick={() => setOpen((v) => !v)}>
            — Popuni podatke — {CHEVRON}
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

  const q = filter.toLowerCase();

  const vlasnici = workers
    .filter((w) => w.role === "VLASNIK" && workerLabel(w).toLowerCase().includes(q))
    .sort((a, b) => workerLabel(a).localeCompare(workerLabel(b), "bs"));
  const radnici = workers
    .filter((w) => w.role === "RADNIK" && workerLabel(w).toLowerCase().includes(q))
    .sort((a, b) => workerLabel(a).localeCompare(workerLabel(b), "bs"));

  const filteredOwn = ownOrgs.filter((o) => orgLabel(o).toLowerCase().includes(q));
  const filteredClient = clientOrgs.filter((o) => orgLabel(o).toLowerCase().includes(q));
  const filteredPersons = persons.filter((c) => personLabel(c).toLowerCase().includes(q));
  const profileMatches = !q || `${user.firstName} ${user.lastName}`.toLowerCase().includes(q);

  const noneFound =
    !profileMatches &&
    filteredOwn.length === 0 &&
    filteredClient.length === 0 &&
    filteredPersons.length === 0 &&
    vlasnici.length === 0 &&
    radnici.length === 0;

  function pick(data: UgovorFillData) {
    onFill(data);
    setOpen(false);
    setFilter("");
  }

  return (
    <div className={styles.fillWrap}>
      <div className={styles.dropdownWrap} ref={wrapRef}>
        <button type="button" className={styles.fillBtn} onClick={() => setOpen((v) => !v)}>
          — Popuni podatke — {CHEVRON}
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

              {profileMatches && (
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() =>
                    pick({
                      name: `${user.firstName} ${user.lastName}`.trim(),
                      address: user.address ?? "",
                      city: user.city ?? "",
                      id: user.jmbg ?? user.idCardNumber ?? "",
                    })
                  }
                >
                  Moj profil
                </button>
              )}

              {filteredOwn.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Moje organizacije</div>
                  {filteredOwn.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => pick({
                        name: o.name,
                        address: o.address ?? "",
                        city: o.city ?? "",
                        id: o.taxNumber ?? "",
                        bankAccount: o.bankAccount ?? "",
                        ownerName: o.owner ? `${o.owner.firstName} ${o.owner.lastName}`.trim() : "",
                      })}
                    >
                      {orgLabel(o)}{o.taxNumber ? ` (${o.taxNumber})` : ""}
                    </button>
                  ))}
                </>
              )}

              {filteredClient.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Klijentske organizacije</div>
                  {filteredClient.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => pick({
                        name: o.name,
                        address: o.address ?? "",
                        city: o.city ?? "",
                        id: o.taxNumber ?? "",
                        bankAccount: o.bankAccount ?? "",
                        ownerName: o.owner ? `${o.owner.firstName} ${o.owner.lastName}`.trim() : "",
                      })}
                    >
                      {orgLabel(o)}{o.taxNumber ? ` (${o.taxNumber})` : ""}
                    </button>
                  ))}
                </>
              )}

              {filteredPersons.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Fizička lica</div>
                  {filteredPersons.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() =>
                        pick({
                          name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
                          address: c.address ?? "",
                          city: c.city ?? "",
                          id: c.jmbg ?? c.idCardNumber ?? "",
                        })
                      }
                    >
                      {personLabel(c)}
                    </button>
                  ))}
                </>
              )}

              {vlasnici.length > 0 && (
                <>
                  <div className={styles.dropdownGroup}>Vlasnici</div>
                  {vlasnici.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() =>
                        pick({
                          name: `${w.firstName} ${w.lastName}`.trim(),
                          address: w.address ?? "",
                          city: w.city ?? "",
                          id: w.jmbg ?? w.idCardNumber ?? "",
                          bankAccount: w.bankAccount ?? "",
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
                      key={w.id}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() =>
                        pick({
                          name: `${w.firstName} ${w.lastName}`.trim(),
                          address: w.address ?? "",
                          city: w.city ?? "",
                          id: w.jmbg ?? w.idCardNumber ?? "",
                          bankAccount: w.bankAccount ?? "",
                        })
                      }
                    >
                      {workerLabel(w)}
                    </button>
                  ))}
                </>
              )}
            </div>
            {!isProOrBusiness && (
              <div className={styles.dropdownTeaser}>
                <p className={styles.dropdownTeaserText}>Uz pretplatu: klijentske organizacije, fizička lica, vlasnici i radnici</p>
                <a href="/profil#pretplata" className={styles.dropdownTeaserLink}>Pretplatite se →</a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
