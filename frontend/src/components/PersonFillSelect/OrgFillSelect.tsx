"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  getOrganizations,
  getClientOrganizations,
  type Organization,
} from "src/api/profile";
import { useRole } from "src/hooks/useRole";
import styles from "./PersonFillSelect.module.css";

export type OrgFillData = {
  name: string | null;
  taxNumber: string | null;
  activityCode: string | null;
  activityName: string | null;
  address: string | null;
  sourceOrgId?: number | null;
};

type Props = {
  onFill: (data: OrgFillData) => void;
};

function orgLabel(org: Organization): string {
  return org.name || `Organizacija #${org.id}`;
}

function optionText(org: Organization): string {
  return orgLabel(org) + (org.taxNumber ? ` (${org.taxNumber})` : "");
}

export default function OrgFillSelect({ onFill }: Props) {
  const { role } = useRole();
  const [selected, setSelected] = useState("");

  const isProOrBusiness = role === "PRO" || role === "BUSINESS";

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
  if (!hasAny) return null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setSelected("");
    if (!value) return;
    const id = parseInt(value, 10);
    const org =
      ownOrgs.find((o) => o.id === id) ?? clientOrgs.find((o) => o.id === id);
    if (!org) return;
    onFill({
      name: org.name,
      taxNumber: org.taxNumber,
      activityCode: org.activityCode,
      activityName: org.activityName,
      address: org.address,
      sourceOrgId: org.id,
    });
  }

  return (
    <div className={styles.fillWrap}>
      <select
        className={styles.fillSelect}
        value={selected}
        onChange={handleChange}
        title="Odaberite djelatnost za automatsku popunu forme"
      >
        <option value="">— Popuni djelatnost —</option>
        {ownOrgs.length > 0 && (
          <optgroup label="Moje organizacije">
            {ownOrgs.map((org) => (
              <option key={org.id} value={String(org.id)}>
                {optionText(org)}
              </option>
            ))}
          </optgroup>
        )}
        {clientOrgs.length > 0 && (
          <optgroup label="Klijentske firme">
            {clientOrgs.map((org) => (
              <option key={org.id} value={String(org.id)}>
                {optionText(org)}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
