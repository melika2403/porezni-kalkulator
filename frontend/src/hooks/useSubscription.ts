"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  cancelSubscription,
  getInvoices,
  getPlans,
  getSubscription,
  reactivateSubscription,
} from "src/api/subscription";

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: () => unwrap(getSubscription()),
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription", "plans"],
    queryFn: () => unwrap(getPlans()),
    staleTime: 1000 * 60 * 60, // 1h, planovi se ne mijenjaju često
  });
}

export function useSubscriptionInvoices(page = 1, limit = 20) {
  return useQuery({
    queryKey: ["subscription", "invoices", page, limit],
    queryFn: () => unwrap(getInvoices(page, limit)),
  });
}

export function useCancelSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(cancelSubscription()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

export function useReactivateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(reactivateSubscription()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}
