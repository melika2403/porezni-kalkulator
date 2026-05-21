"use client";

import { useQuery } from "@tanstack/react-query";
import { getOrganization, type Organization } from "src/api/profile";
import { useRole, type AppRole } from "src/hooks/useRole";
import styles from "src/components/RoleGuard/RoleGuard.module.css";

type Props = {
  /**
   * Which OWNER tiers grant access to the wrapped feature for this organization.
   * E.g. tiers={["BUSINESS"]} means: only render children when this org's
   * owner has a BUSINESS subscription.
   */
  tiers: AppRole[];
  /** The organization this feature applies to. */
  organizationId: number | null;
  /**
   * Alternatively, pass a preloaded org (e.g. you already queried it).
   * If both `organizationId` and `org` are passed, `org` wins.
   */
  org?: Organization | null;
  children: React.ReactNode;
  /** "disable" = prikaži ali onemogući (default), "hide" = sakrij */
  mode?: "disable" | "hide";
  label?: string;
  /** Custom UI to render when access is denied. Wins over `mode`. */
  fallback?: React.ReactNode;
};

/**
 * Like RoleGuard, but gates by the OWNER tier of a specific organization.
 *
 * Use for in-org features where a free MEMBER of a BUSINESS owner's org
 * should still get BUSINESS-level capabilities (e.g. JS3100, worker limits,
 * member management).
 *
 * Super-admins (`User.role === "ADMIN"`) bypass and always see children.
 */
export default function OrgTierGuard({
  tiers,
  organizationId,
  org: orgProp,
  children,
  mode = "disable",
  label = "Pretplati se",
  fallback,
}: Props) {
  const { role } = useRole();

  // Skip query if we got the org passed in directly.
  const orgQuery = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const res = await getOrganization(organizationId);
      if (!res.ok) throw new Error(res.error);
      return res.data as Organization;
    },
    enabled: !orgProp && !!organizationId,
  });

  const org = orgProp ?? orgQuery.data ?? null;
  const isSuperAdmin = role === "ADMIN";
  const tier = org?.effectiveTier ?? null;
  const allowed = isSuperAdmin || (tier !== null && tiers.includes(tier));

  if (allowed) return <>{children}</>;

  if (fallback !== undefined) return <>{fallback}</>;

  if (mode === "hide") return null;

  return (
    <div
      className={`${styles.wrapper} ${styles.disabled}`}
      title={`Pristup ograničen: ${label}`}
    >
      {children}
      <span className={styles.badge}>{label}</span>
    </div>
  );
}
