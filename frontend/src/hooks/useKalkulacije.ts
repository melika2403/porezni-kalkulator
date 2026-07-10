"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createArtikal,
  createKalkulacija,
  deleteArtikal,
  deleteKalkulacija,
  getKalkulacija,
  listArtikli,
  listKalkulacije,
  getMarza,
  updateArtikal,
  updateKalkulacija,
  type ArtikalPayload,
  type KalkulacijaPayload,
} from "src/api/kalkulacije";
import { unwrap } from "src/api/auth";

export function useKalkulacije(orgId: number | null, godina?: number) {
  return useQuery({
    queryKey: ["kalkulacije", orgId, godina ?? "sve"],
    queryFn: () => unwrap(listKalkulacije(orgId as number, godina)),
    enabled: orgId != null,
  });
}

export function useKalkulacija(orgId: number | null, id: number | null) {
  return useQuery({
    queryKey: ["kalkulacije", orgId, "detail", id],
    queryFn: () => unwrap(getKalkulacija(orgId as number, id as number)),
    enabled: orgId != null && id != null,
  });
}

function useInvalidateKalkulacije(orgId: number | null) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["kalkulacije", orgId] });
    // kalkulacija knjiži i ulazni račun: KUF, partneri i obaveze se mijenjaju
    qc.invalidateQueries({ queryKey: ["partners", orgId] });
  };
}

export function useCreateKalkulacija(orgId: number | null) {
  const invalidate = useInvalidateKalkulacije(orgId);
  return useMutation({
    mutationFn: (payload: KalkulacijaPayload) =>
      unwrap(createKalkulacija(orgId as number, payload)),
    onSuccess: invalidate,
  });
}

export function useUpdateKalkulacija(orgId: number | null) {
  const invalidate = useInvalidateKalkulacije(orgId);
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: KalkulacijaPayload;
    }) => unwrap(updateKalkulacija(orgId as number, id, payload)),
    onSuccess: invalidate,
  });
}

export function useDeleteKalkulacija(orgId: number | null) {
  const invalidate = useInvalidateKalkulacije(orgId);
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(deleteKalkulacija(orgId as number, id)),
    onSuccess: invalidate,
  });
}

export function useMarza(
  orgId: number | null,
  params: { from?: string; to?: string; groupBy: "artikal" | "dobavljac" },
) {
  return useQuery({
    queryKey: ["kalkulacije", orgId, "marza", params],
    queryFn: () => unwrap(getMarza(orgId as number, params)),
    enabled: orgId != null,
  });
}

export function useArtikli(orgId: number | null) {
  return useQuery({
    queryKey: ["artikli", orgId],
    queryFn: () => unwrap(listArtikli(orgId as number)),
    enabled: orgId != null,
  });
}

function useInvalidateArtikli(orgId: number | null) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["artikli", orgId] });
}

export function useCreateArtikal(orgId: number | null) {
  const invalidate = useInvalidateArtikli(orgId);
  return useMutation({
    mutationFn: (payload: ArtikalPayload) =>
      unwrap(createArtikal(orgId as number, payload)),
    onSuccess: invalidate,
  });
}

export function useUpdateArtikal(orgId: number | null) {
  const invalidate = useInvalidateArtikli(orgId);
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<ArtikalPayload>;
    }) => unwrap(updateArtikal(orgId as number, id, payload)),
    onSuccess: invalidate,
  });
}

export function useDeleteArtikal(orgId: number | null) {
  const invalidate = useInvalidateArtikli(orgId);
  return useMutation({
    mutationFn: (id: number) => unwrap(deleteArtikal(orgId as number, id)),
    onSuccess: invalidate,
  });
}
