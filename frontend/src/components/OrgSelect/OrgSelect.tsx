"use client";

import { type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getClientOrganizations,
  getOrganizations,
  type Organization,
} from "src/api/profile";
import { useRole } from "src/hooks/useRole";
import StyledSelect, {
  type SelectGroup,
} from "src/components/StyledSelect/StyledSelect";

// Organizacijski izbornik (Moje / Klijentske) sa pretragom. Tanak wrapper oko
// StyledSelect-a: gradi grupe iz org lista. API (value/onChange/...) ostaje isti
// pa je drop-in zamjena za stari <select>.
export interface OrgSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
  className?: string;
  style?: CSSProperties;
  wrapStyle?: CSSProperties;
  id?: string;
  placeholder?: string;
  /** Custom liste (npr. već filtrirane), inače komponenta sama učita. */
  ownOrgs?: Organization[];
  clientOrgs?: Organization[];
  disabled?: boolean;
  /** Custom prikaz imena org (npr. Amortizacija "•" marker, WorkersSidebar tip). */
  getLabel?: (org: Organization) => string;
}

export default function OrgSelect({
  value,
  onChange,
  className,
  style,
  wrapStyle,
  id,
  placeholder = "– Odaberi –",
  ownOrgs,
  clientOrgs,
  disabled = false,
  getLabel,
}: OrgSelectProps) {
  const { hasRole } = useRole();
  const canSeeClients = hasRole("PRO", "BUSINESS", "ADMIN");

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
  const clientList = canSeeClients
    ? (clientOrgs ?? clientOrgsQuery.data ?? [])
    : [];

  const labelOf = (o: Organization) =>
    getLabel ? getLabel(o) : o.name || `Organizacija #${o.id}`;

  const groups: SelectGroup[] = [];
  if (ownList.length > 0) {
    groups.push({
      label: "Moje organizacije",
      options: ownList.map((o) => ({ value: o.id, label: labelOf(o) })),
    });
  }
  if (canSeeClients && clientList.length > 0) {
    groups.push({
      label: "Klijentske organizacije",
      options: clientList.map((o) => ({ value: o.id, label: labelOf(o) })),
    });
  }

  return (
    <StyledSelect
      value={value}
      onChange={(v) => onChange(v == null ? null : Number(v))}
      groups={groups}
      searchable
      searchPlaceholder="Pretraži organizaciju..."
      placeholder={placeholder}
      className={className}
      style={style}
      wrapStyle={wrapStyle}
      id={id}
      disabled={disabled}
    />
  );
}
