"use client";

import { useQuery } from "@tanstack/react-query";
import { me, unwrap } from "src/api/auth";

export type AppRole = "USER" | "PRO" | "BUSINESS" | "ADMIN";

export function useRole() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()),
    retry: false,
  });

  const role = (user?.role ?? null) as AppRole | null;

  return {
    role,
    hasRole: (...roles: AppRole[]) => role !== null && roles.includes(role),
  };
}
