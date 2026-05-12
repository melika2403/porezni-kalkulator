"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  changeProfilePassword,
  getMyProfile,
  patchMyProfile,
  patchPreferences,
  type PreferencesPatchPayload,
  type ProfilePatchPayload,
} from "src/api/profile";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => unwrap(getMyProfile()),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProfilePatchPayload) => unwrap(patchMyProfile(payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["pk-office", "me"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => unwrap(changeProfilePassword(currentPassword, newPassword)),
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PreferencesPatchPayload) =>
      unwrap(patchPreferences(payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["pk-office", "me"] });
    },
  });
}
