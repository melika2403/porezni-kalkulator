"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPartner,
  createUlazniRacun,
  deletePartner,
  deleteUlazniRacun,
  getPartnerKartica,
  listPartners,
  listUlazniRacuni,
  mergePartner,
  partnerSuggestions,
  updatePartner,
  updateUlazniRacun,
  type PartnerPayload,
  type UlazniRacunPayload,
  type UlazniRacunStatus,
} from "src/api/partners";
import { unwrap } from "src/api/auth";

export function usePartners(orgId: number | null) {
  return useQuery({
    queryKey: ["partners", orgId],
    queryFn: () => unwrap(listPartners(orgId as number)),
    enabled: orgId != null,
  });
}

export function usePartnerSuggestions(orgId: number | null) {
  return useQuery({
    queryKey: ["partners", orgId, "suggestions"],
    queryFn: () => unwrap(partnerSuggestions(orgId as number)),
    enabled: orgId != null,
  });
}

function useInvalidatePartners(orgId: number | null) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["partners", orgId] });
    // vezanje transakcija mijenja i prikaz izvoda
    qc.invalidateQueries({ queryKey: ["bank-statements", orgId] });
  };
}

export function useCreatePartner(orgId: number | null) {
  const invalidate = useInvalidatePartners(orgId);
  return useMutation({
    mutationFn: (payload: PartnerPayload) =>
      unwrap(createPartner(orgId as number, payload)),
    onSuccess: invalidate,
  });
}

export function useUpdatePartner(orgId: number | null) {
  const invalidate = useInvalidatePartners(orgId);
  return useMutation({
    mutationFn: ({
      partnerId,
      payload,
    }: {
      partnerId: number;
      payload: PartnerPayload;
    }) => unwrap(updatePartner(orgId as number, partnerId, payload)),
    onSuccess: invalidate,
  });
}

export function useMergePartner(orgId: number | null) {
  const invalidate = useInvalidatePartners(orgId);
  return useMutation({
    mutationFn: ({
      sourceId,
      targetId,
    }: {
      sourceId: number;
      targetId: number;
    }) => unwrap(mergePartner(orgId as number, sourceId, targetId)),
    onSuccess: invalidate,
  });
}

export function useDeletePartner(orgId: number | null) {
  const invalidate = useInvalidatePartners(orgId);
  return useMutation({
    mutationFn: (partnerId: number) =>
      unwrap(deletePartner(orgId as number, partnerId)),
    onSuccess: invalidate,
  });
}

export function usePartnerKartica(
  orgId: number | null,
  partnerId: number | null,
) {
  return useQuery({
    queryKey: ["partners", orgId, "kartica", partnerId],
    queryFn: () =>
      unwrap(getPartnerKartica(orgId as number, partnerId as number)),
    enabled: orgId != null && partnerId != null,
  });
}

export function useUlazniRacuni(orgId: number | null) {
  return useQuery({
    queryKey: ["partners", orgId, "ulazni-racuni"],
    queryFn: () => unwrap(listUlazniRacuni(orgId as number)),
    enabled: orgId != null,
  });
}

export function useCreateUlazniRacun(orgId: number | null) {
  const invalidate = useInvalidatePartners(orgId);
  return useMutation({
    mutationFn: (payload: UlazniRacunPayload) =>
      unwrap(createUlazniRacun(orgId as number, payload)),
    onSuccess: invalidate,
  });
}

export function useUpdateUlazniRacun(orgId: number | null) {
  const invalidate = useInvalidatePartners(orgId);
  return useMutation({
    mutationFn: ({
      racunId,
      patch,
    }: {
      racunId: number;
      patch: Partial<Omit<UlazniRacunPayload, "partnerId">> & {
        status?: UlazniRacunStatus;
        paidAt?: string;
      };
    }) => unwrap(updateUlazniRacun(orgId as number, racunId, patch)),
    onSuccess: invalidate,
  });
}

export function useDeleteUlazniRacun(orgId: number | null) {
  const invalidate = useInvalidatePartners(orgId);
  return useMutation({
    mutationFn: (racunId: number) =>
      unwrap(deleteUlazniRacun(orgId as number, racunId)),
    onSuccess: invalidate,
  });
}
