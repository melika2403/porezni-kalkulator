"use client";

import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";

// PROMOTER = oglašivač (banka partner): vidi samo /promoter dashboard
export type AppRole = "USER" | "PRO" | "BUSINESS" | "ADMIN" | "PROMOTER";

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
    // Gating funkcija ide po EFEKTIVNOJ roli (PK Office paket/trial = Business).
    // Za ADMIN provjere je svejedno: getEffectiveRole vraća ADMIN nepromijenjen,
    // a office nikad ne diže iznad BUSINESS.
    hasRole: (...roles: AppRole[]) =>
      effectiveRole !== null && roles.includes(effectiveRole),
  };
}
