"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateOrganization,
  aktivirajObrtUPkOffice,
  deaktivirajObrtUPkOffice,
  getPkOfficePristup,
  meWithOrgs,
  payrollStatusForMonth,
} from "src/api/pkOffice";
import { unwrap } from "src/api/auth";

export function usePkOfficeMe() {
  return useQuery({
    queryKey: ["pk-office", "me"],
    queryFn: () => unwrap(meWithOrgs()),
  });
}

export function usePayrollStatus(year?: number, month?: number) {
  return useQuery({
    queryKey: ["pk-office", "payroll-status", year ?? null, month ?? null],
    queryFn: () => unwrap(payrollStatusForMonth(year, month)),
  });
}

export function useActivateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(activateOrganization(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pk-office", "me"] });
    },
  });
}

// ── PK Office pristup i slotovi (Office paketi) ──────────────────────────────

export function usePkOfficePristup() {
  return useQuery({
    queryKey: ["pk-office", "pristup"],
    queryFn: () => unwrap(getPkOfficePristup()),
  });
}

export function usePkOfficeSlot() {
  const qc = useQueryClient();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["pk-office", "pristup"] });
  const aktiviraj = useMutation({
    mutationFn: (orgId: number) => unwrap(aktivirajObrtUPkOffice(orgId)),
    onSuccess: invalidate,
  });
  const deaktiviraj = useMutation({
    mutationFn: (orgId: number) => unwrap(deaktivirajObrtUPkOffice(orgId)),
    onSuccess: invalidate,
  });
  return { aktiviraj, deaktiviraj };
}
