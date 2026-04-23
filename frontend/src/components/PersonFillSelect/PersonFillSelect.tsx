"use client";
import { useState } from "react";
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

export default function PersonFillSelect({ onFill }: Props) {
  const { role } = useRole();
  const [selected, setSelected] = useState("");

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });

  const isProOrBusiness = role === "PRO" || role === "BUSINESS";

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

  if (!user) return null;

  function fillFromWorker(w: WorkerWithOrg) {
    onFill({
      jmbg: w.jmbg,
      firstName: w.firstName,
      lastName: w.lastName,
      address: w.address,
      sourceWorkerOrgId: w.organizationId,
    });
  }

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

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setSelected("");
    if (!value) return;
    if (value === "__profile__") {
      onFill({
        jmbg: user!.jmbg,
        firstName: user!.firstName,
        lastName: user!.lastName,
        address: user!.address,
        sourceClientId: null,
      });
    } else if (value.startsWith("w:")) {
      const id = parseInt(value.slice(2), 10);
      const w = workers.find((x) => x.id === id);
      if (w) fillFromWorker(w);
    } else {
      const id = parseInt(value, 10);
      const client = clients.find((c) => c.id === id);
      if (!client) return;
      onFill({
        jmbg: client.jmbg,
        firstName: client.firstName,
        lastName: client.lastName,
        address: client.address,
        sourceClientId: client.id,
      });
    }
  }

  const vlasnici = workers.filter((w) => w.role === "VLASNIK");
  const radnici = workers.filter((w) => w.role === "RADNIK");

  const workerLabel = (w: WorkerWithOrg) => {
    const name = [w.lastName, w.firstName].filter(Boolean).join(" ").trim();
    return `${name || `#${w.id}`} — ${w.organizationName}`;
  };

  return (
    <div className={styles.fillWrap}>
      <select
        className={styles.fillSelect}
        value={selected}
        onChange={handleChange}
        title="Odaberite osobu za automatsku popunu forme"
      >
        <option value="">— Popuni podatke —</option>
        <option value="__profile__">Moj profil</option>
        {vlasnici.length > 0 && (
          <optgroup label="Vlasnici">
            {vlasnici.map((w) => (
              <option key={`w-${w.id}`} value={`w:${w.id}`}>
                {workerLabel(w)}
              </option>
            ))}
          </optgroup>
        )}
        {radnici.length > 0 && (
          <optgroup label="Radnici">
            {radnici.map((w) => (
              <option key={`w-${w.id}`} value={`w:${w.id}`}>
                {workerLabel(w)}
              </option>
            ))}
          </optgroup>
        )}
        {clients.length > 0 && (
          <optgroup label="Fizička lica">
            {clients.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {clientLabel(c)}
                {c.jmbg ? ` (${c.jmbg})` : ""}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
