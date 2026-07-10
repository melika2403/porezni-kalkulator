"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  addMember,
  getMembers,
  getOrganizationSettings,
  removeMember,
  updateMemberRole,
  updateOrganizationSettings,
  type OrgSettingsPayload,
} from "src/api/profile";

export function useOrganizationSettings(orgId: number | null | undefined) {
  return useQuery({
    queryKey: ["organization", "settings", orgId],
    queryFn: () => unwrap(getOrganizationSettings(orgId as number)),
    enabled: !!orgId,
  });
}

export function useUpdateOrganizationSettings(orgId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: OrgSettingsPayload) =>
      unwrap(updateOrganizationSettings(orgId, payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization", "settings", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-office", "me"] });
    },
  });
}

export function useOrganizationMembers(orgId: number | null | undefined) {
  return useQuery({
    queryKey: ["organization", "members", orgId],
    queryFn: () => unwrap(getMembers(orgId as number)),
    enabled: !!orgId,
  });
}

export function useAddMember(orgId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; role: "ADMIN" | "MEMBER" | "VIEWER" }) =>
      unwrap(addMember(orgId, payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization", "members", orgId] });
    },
  });
}

export function useUpdateMemberRole(orgId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: number;
      role: "ADMIN" | "MEMBER" | "VIEWER";
    }) => unwrap(updateMemberRole(orgId, userId, role)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization", "members", orgId] });
    },
  });
}

export function useRemoveMember(orgId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => unwrap(removeMember(orgId, userId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization", "members", orgId] });
    },
  });
}
