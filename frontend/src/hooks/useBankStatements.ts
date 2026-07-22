"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bankStatementsSummary,
  bulkUpdateBankTransactions,
  confirmAllStatement,
  createManualStatement,
  deleteBankStatement,
  getBankStatement,
  getKpr,
  listBankStatements,
  listObligations,
  searchBankTransactions,
  updateBankTransaction,
  uploadBankStatement,
  type KprPeriod,
  type ManualStatementPayload,
  type TxSearchQuery,
  type TxStatus,
} from "src/api/bankStatements";
import { listInvoices } from "src/api/invoices";
import { unwrap } from "src/api/auth";

export function useBankStatements(orgId: number | null) {
  return useQuery({
    queryKey: ["bank-statements", orgId, "list"],
    queryFn: () => unwrap(listBankStatements(orgId as number)),
    enabled: orgId != null,
  });
}

export function useBankStatement(orgId: number | null, statementId: number | null) {
  return useQuery({
    queryKey: ["bank-statements", orgId, "detail", statementId],
    queryFn: () => unwrap(getBankStatement(orgId as number, statementId as number)),
    enabled: orgId != null && statementId != null,
  });
}

export function useConfirmAllStatement(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (statementId: number) =>
      unwrap(confirmAllStatement(orgId as number, statementId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statements", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-invoices", orgId] });
    },
  });
}

export function useDeleteBankStatement(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (statementId: number) =>
      unwrap(deleteBankStatement(orgId as number, statementId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statements", orgId] });
    },
  });
}

export function useBankTransactions(orgId: number | null, limit = 50) {
  return useQuery({
    queryKey: ["bank-statements", orgId, "transactions", limit],
    queryFn: async () =>
      (await unwrap(searchBankTransactions(orgId as number, { limit }))).items,
    enabled: orgId != null,
  });
}

export function useSearchBankTransactions(
  orgId: number | null,
  query: TxSearchQuery,
) {
  return useQuery({
    queryKey: ["bank-statements", orgId, "search", query],
    queryFn: () => unwrap(searchBankTransactions(orgId as number, query)),
    enabled: orgId != null,
    placeholderData: (prev) => prev, // bez treperenja pri kucanju
  });
}

export function useBankSummary(orgId: number | null) {
  return useQuery({
    queryKey: ["bank-statements", orgId, "summary"],
    queryFn: () => unwrap(bankStatementsSummary(orgId as number)),
    enabled: orgId != null,
  });
}

export function useUploadBankStatement(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (orgId == null) throw new Error("Nema aktivne organizacije");
      const result = await uploadBankStatement(orgId, file);
      if (!result.ok) throw result; // UploadError objekt ide u onError
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statements", orgId] });
    },
  });
}

export function useCreateManualStatement(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ManualStatementPayload) => {
      if (orgId == null) throw new Error("Nema aktivne organizacije");
      const result = await createManualStatement(orgId, payload);
      if (!result.ok) throw result;
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statements", orgId] });
    },
  });
}

export function useKpr(orgId: number | null, period: KprPeriod | null) {
  return useQuery({
    queryKey: ["kpr", orgId, period],
    queryFn: () => unwrap(getKpr(orgId as number, period as KprPeriod)),
    enabled: orgId != null && period != null,
  });
}

export function useUpdateBankTransaction(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      txId,
      patch,
    }: {
      txId: number;
      patch: {
        status?: TxStatus;
        category?: string | null;
        invoiceId?: number | null;
        partnerId?: number | null;
      };
    }) => unwrap(updateBankTransaction(orgId as number, txId, patch)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statements", orgId] });
      // potvrda može označiti fakturu naplaćenom
      qc.invalidateQueries({ queryKey: ["pk-invoices", orgId] });
      // (od)vezivanje partnera mijenja kartice, statistike i prijedloge
      qc.invalidateQueries({ queryKey: ["partners", orgId] });
    },
  });
}

// Masovna izmjena označenih stavki (potvrda / dodjela kategorije).
export function useBulkUpdateBankTransactions(orgId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      patch,
    }: {
      ids: number[];
      patch: { status?: TxStatus; category?: string | null };
    }) => unwrap(bulkUpdateBankTransactions(orgId as number, ids, patch)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-statements", orgId] });
      qc.invalidateQueries({ queryKey: ["pk-invoices", orgId] });
      qc.invalidateQueries({ queryKey: ["partners", orgId] });
    },
  });
}

export function useObligations(orgId: number | null) {
  return useQuery({
    queryKey: ["obligations", orgId],
    queryFn: () => unwrap(listObligations(orgId as number)),
    enabled: orgId != null,
  });
}

export function useOrgInvoices(
  orgId: number | null,
  params: { status?: "ISSUED" | "PAID" | "DRAFT" | "CANCELLED" } = {},
) {
  return useQuery({
    queryKey: ["pk-invoices", orgId, params],
    queryFn: () =>
      unwrap(
        listInvoices({
          organizationId: orgId as number,
          type: "INVOICE",
          ...params,
        }),
      ),
    enabled: orgId != null,
  });
}
