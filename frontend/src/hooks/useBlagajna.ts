"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBlagajnaNalog,
  deleteBlagajnaNalog,
  getBlagajna,
  type BlagajnaTip,
} from "src/api/blagajna";
import { unwrap } from "src/api/auth";

export function useBlagajna(orgId: number | null, from: string, to: string) {
  return useQuery({
    queryKey: ["blagajna", orgId, from, to],
    queryFn: () => unwrap(getBlagajna(orgId as number, from, to)),
    enabled: orgId != null,
  });
}

export function useCreateBlagajnaNalog(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      tip: BlagajnaTip;
      datum: string;
      iznos: number;
      lice: string;
      osnov: string;
      napomena?: string;
    }) => unwrap(createBlagajnaNalog(orgId as number, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blagajna", orgId] }),
  });
}

export function useDeleteBlagajnaNalog(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(deleteBlagajnaNalog(orgId as number, id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blagajna", orgId] }),
  });
}
