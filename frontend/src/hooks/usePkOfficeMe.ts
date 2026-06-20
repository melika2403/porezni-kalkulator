"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateOrganization,
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
