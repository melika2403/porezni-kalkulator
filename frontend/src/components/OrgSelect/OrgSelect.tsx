"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getClientOrganizations,
  getOrganizations,
  type Organization,
} from "src/api/profile";
import { useRole } from "src/hooks/useRole";

// Zajednički organizacijski dropdown koji svuda po aplikaciji izgleda isto:
//
//   ╭───────────────────────────╮
//   │ — Odaberi —               │
//   │ Moje organizacije         │  ← optgroup label
//   │   Test obrt               │
//   │   Test Organizacija d.o.o.│
//   │ Klijentske organizacije   │  ← optgroup (samo za PRO/BUSINESS/ADMIN)
//   │   Test Obrta — Klijent    │
//   ╰───────────────────────────╯
//
// Korišten u svim funkcijama (JS3100, Obračun plata, Šihterica, Aktivni radnici,
// fakture, ugovori). Pamti odabir kroz useLastOrg ne ovdje — caller donosi
// orgId/setOrgId, ova komponenta samo renderira dropdown.
export interface OrgSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  /** Ako želiš custom queries (npr. samo BUSINESS), proslijedi listu — inače učitava sve. */
  ownOrgs?: Organization[];
  clientOrgs?: Organization[];
  disabled?: boolean;
}

export default function OrgSelect({
  value,
  onChange,
  className,
  id,
  placeholder = "— Odaberi —",
  ownOrgs,
  clientOrgs,
  disabled = false,
}: OrgSelectProps) {
  const { hasRole } = useRole();
  const canSeeClients = hasRole("PRO", "BUSINESS", "ADMIN");

  // Učitavanje vlastitih org (ako nisu eksplicitno proslijeđene)
  const ownOrgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await getOrganizations();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: ownOrgs === undefined,
  });
  const clientOrgsQuery = useQuery({
    queryKey: ["clientOrganizations"],
    queryFn: async () => {
      const res = await getClientOrganizations();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: canSeeClients && clientOrgs === undefined,
  });

  const ownList = ownOrgs ?? ownOrgsQuery.data ?? [];
  const clientList = clientOrgs ?? clientOrgsQuery.data ?? [];

  return (
    <select
      id={id}
      className={className}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {ownList.length > 0 && (
        <optgroup label="Moje organizacije">
          {ownList.map((o) => (
            <option key={`own-${o.id}`} value={o.id}>
              {o.name}
            </option>
          ))}
        </optgroup>
      )}
      {canSeeClients && clientList.length > 0 && (
        <optgroup label="Klijentske organizacije">
          {clientList.map((o) => (
            <option key={`cli-${o.id}`} value={o.id}>
              {o.name}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
