"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getOrganizations,
  getClientOrganizations,
  type Organization,
} from "src/api/profile";
import { useRole, type AppRole } from "src/hooks/useRole";

const TIER_RANK: Record<AppRole, number> = {
  USER: 0,
  PRO: 1,
  BUSINESS: 2,
  ADMIN: 3,
};

function tierAtLeast(actual: AppRole | null, minimum: AppRole): boolean {
  if (!actual) return false;
  return TIER_RANK[actual] >= TIER_RANK[minimum];
}

/**
 * Returns the highest tier the current user can access — either via their own
 * pretplata (`user.role`) or via membership in any organization whose OWNER
 * has that tier (`org.effectiveTier`).
 *
 * Used for page-level gating where the action might apply to ANY of the user's
 * organizations (e.g. JS3100 — page is reachable if user can save against at
 * least one eligible org).
 */
export function useMaxAccessibleTier(): {
  tier: AppRole | null;
  isLoading: boolean;
  hasAccessToTier: (minimum: AppRole) => boolean;
} {
  // effectiveRole: PK Office paket/trial korisnika diže USER/PRO na BUSINESS
  const { effectiveRole: role, isLoading: roleLoading } = useRole();
  // Računaj tier preko obje vrste org-a:
  //   (a) primarne (isClientOrg=false) — moje vlastite org-e
  //   (b) klijent-org-e (isClientOrg=true) — npr. ako me BUSINESS vlasnik
  //       dodao kao člana neke svoje klijent-firme
  const { data: ownOrgs, isLoading: ownOrgsLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await getOrganizations();
      if (!res.ok) throw new Error(res.error);
      return res.data as Organization[];
    },
  });
  const { data: clientOrgs, isLoading: clientOrgsLoading } = useQuery({
    queryKey: ["organizations-clients"],
    queryFn: async () => {
      const res = await getClientOrganizations();
      if (!res.ok) throw new Error(res.error);
      return res.data as Organization[];
    },
  });

  const candidates: AppRole[] = [];
  if (role) candidates.push(role);
  for (const org of ownOrgs ?? []) {
    if (org.effectiveTier) candidates.push(org.effectiveTier);
  }
  for (const org of clientOrgs ?? []) {
    if (org.effectiveTier) candidates.push(org.effectiveTier);
  }

  const tier =
    candidates.length === 0
      ? null
      : candidates.reduce((max, t) =>
          TIER_RANK[t] > TIER_RANK[max] ? t : max,
        );

  return {
    tier,
    isLoading: roleLoading || ownOrgsLoading || clientOrgsLoading,
    hasAccessToTier: (minimum: AppRole) => tierAtLeast(tier, minimum),
  };
}
