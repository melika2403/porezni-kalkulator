"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addTkmPazar,
  createNivelacija,
  createPopis,
  createRazduzenje,
  deleteTkmPazar,
  deleteNivelacija,
  deletePopis,
  deleteRazduzenje,
  getArtikalKartica,
  getLager,
  getPopis,
  getTkm,
  listNivelacije,
  listPopisi,
  listRazduzenja,
  listTkmPazari,
  otknjiziPopis,
  proknjiziPopis,
  refreshPopis,
  setTkmPocetnoStanje,
  updatePopis,
  type NivelacijaPayload,
  type RazduzenjePayload,
} from "src/api/lager";
import { unwrap } from "src/api/auth";

export function useLager(orgId: number | null, datum?: string) {
  return useQuery({
    queryKey: ["lager", orgId, datum ?? "danas"],
    queryFn: () => unwrap(getLager(orgId as number, datum)),
    enabled: orgId != null,
  });
}

export function useArtikalKartica(
  orgId: number | null,
  artikalId: number | null,
) {
  return useQuery({
    queryKey: ["lager", orgId, "artikal", artikalId],
    queryFn: () =>
      unwrap(getArtikalKartica(orgId as number, artikalId as number)),
    enabled: orgId != null && artikalId != null,
  });
}

export function useTkm(orgId: number | null, godina: number) {
  return useQuery({
    queryKey: ["lager", orgId, "tkm", godina],
    queryFn: () => unwrap(getTkm(orgId as number, godina)),
    enabled: orgId != null,
  });
}

export function useTkmPazari(orgId: number | null, godina: number) {
  return useQuery({
    queryKey: ["lager", orgId, "tkm-pazari", godina],
    queryFn: () => unwrap(listTkmPazari(orgId as number, godina)),
    enabled: orgId != null,
  });
}

export function useAddTkmPazar(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { datum: string; iznos: number; opis?: string }) =>
      unwrap(addTkmPazar(orgId as number, payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lager", orgId] });
      // kad je kprPazarIzKp uključen, dnevni promet ulazi u KPR
      qc.invalidateQueries({ queryKey: ["kpr", orgId] });
    },
  });
}

export function useDeleteTkmPazar(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(deleteTkmPazar(orgId as number, id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lager", orgId] });
      qc.invalidateQueries({ queryKey: ["kpr", orgId] });
    },
  });
}

export function useSetTkmPocetnoStanje(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { godina: number; iznos: number; napomena?: string }) =>
      unwrap(setTkmPocetnoStanje(orgId as number, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lager", orgId] }),
  });
}

export function useNivelacije(orgId: number | null) {
  return useQuery({
    queryKey: ["nivelacije", orgId],
    queryFn: () => unwrap(listNivelacije(orgId as number)),
    enabled: orgId != null,
  });
}

export function useCreateNivelacija(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NivelacijaPayload) =>
      unwrap(createNivelacija(orgId as number, payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nivelacije", orgId] });
      qc.invalidateQueries({ queryKey: ["lager", orgId] });
    },
  });
}

export function useDeleteNivelacija(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(deleteNivelacija(orgId as number, id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nivelacije", orgId] });
      qc.invalidateQueries({ queryKey: ["lager", orgId] });
    },
  });
}

export function useRazduzenja(orgId: number | null) {
  return useQuery({
    queryKey: ["razduzenja", orgId],
    queryFn: () => unwrap(listRazduzenja(orgId as number)),
    enabled: orgId != null,
  });
}

export function useCreateRazduzenje(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RazduzenjePayload) =>
      unwrap(createRazduzenje(orgId as number, payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["razduzenja", orgId] });
      qc.invalidateQueries({ queryKey: ["lager", orgId] });
      // povrat knjiži knjižnu obavijest u KUF/partnere
      qc.invalidateQueries({ queryKey: ["partners", orgId] });
    },
  });
}

export function useDeleteRazduzenje(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => unwrap(deleteRazduzenje(orgId as number, id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["razduzenja", orgId] });
      qc.invalidateQueries({ queryKey: ["lager", orgId] });
      qc.invalidateQueries({ queryKey: ["partners", orgId] });
    },
  });
}

export function usePopisi(orgId: number | null) {
  return useQuery({
    queryKey: ["popisi", orgId],
    queryFn: () => unwrap(listPopisi(orgId as number)),
    enabled: orgId != null,
  });
}

export function usePopis(orgId: number | null, id: number | null) {
  return useQuery({
    queryKey: ["popisi", orgId, "detail", id],
    queryFn: () => unwrap(getPopis(orgId as number, id as number)),
    enabled: orgId != null && id != null,
  });
}

function useInvalidatePopisi(orgId: number | null) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["popisi", orgId] });
    // proknjižen/obrisan popis mijenja i lager stanje
    qc.invalidateQueries({ queryKey: ["lager", orgId] });
  };
}

export function useCreatePopis(orgId: number | null) {
  const invalidate = useInvalidatePopisi(orgId);
  return useMutation({
    mutationFn: (payload: { datum: string; napomena?: string }) =>
      unwrap(createPopis(orgId as number, payload)),
    onSuccess: invalidate,
  });
}

export function useUpdatePopis(orgId: number | null) {
  const invalidate = useInvalidatePopisi(orgId);
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: {
        napomena?: string;
        stavke?: { id: number; popisKolicina: number }[];
      };
    }) => unwrap(updatePopis(orgId as number, id, payload)),
    onSuccess: invalidate,
  });
}

export function useRefreshPopis(orgId: number | null) {
  const invalidate = useInvalidatePopisi(orgId);
  return useMutation({
    mutationFn: (id: number) => unwrap(refreshPopis(orgId as number, id)),
    onSuccess: invalidate,
  });
}

export function useProknjiziPopis(orgId: number | null) {
  const invalidate = useInvalidatePopisi(orgId);
  return useMutation({
    mutationFn: (id: number) => unwrap(proknjiziPopis(orgId as number, id)),
    onSuccess: invalidate,
  });
}

export function useOtknjiziPopis(orgId: number | null) {
  const invalidate = useInvalidatePopisi(orgId);
  return useMutation({
    mutationFn: (id: number) => unwrap(otknjiziPopis(orgId as number, id)),
    onSuccess: invalidate,
  });
}

export function useDeletePopis(orgId: number | null) {
  const invalidate = useInvalidatePopisi(orgId);
  return useMutation({
    mutationFn: (id: number) => unwrap(deletePopis(orgId as number, id)),
    onSuccess: invalidate,
  });
}
