"use client";

import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";

export type AppRole = "USER" | "PRO" | "BUSINESS" | "ADMIN";

export function useRole() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });

  const role = (user?.role ?? null) as AppRole | null;
  // efektivna rola: PK Office paket/trial diže USER/PRO na BUSINESS (za
  // gating funkcija); prava rola ostaje u `role` (npr. admin provjere)
  const effectiveRole = (user?.effectiveRole ??
    user?.role ??
    null) as AppRole | null;

  return {
    role,
    effectiveRole,
    isLoading,
    hasRole: (...roles: AppRole[]) => role !== null && roles.includes(role),
  };
}
