"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { activateOrganization, meWithOrgs } from "src/api/pkOffice";
import { unwrap } from "src/api/auth";

export function usePkOfficeMe() {
  return useQuery({
    queryKey: ["pk-office", "me"],
    queryFn: () => unwrap(meWithOrgs()),
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
