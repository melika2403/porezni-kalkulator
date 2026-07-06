import type { ApiResponse } from "src/api/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export type TxDirection = "IN" | "OUT";
export type TxStatus = "UNMATCHED" | "CONFIRMED" | "IGNORED";

export type BankTransaction = {
  id: number;
  statementId: number;
  date: string | null;
  description: string | null;
  reference: string | null;
  counterpartyName: string | null;
  counterpartyAccount: string | null;
  amount: string; // DECIMAL dolazi kao string iz Sequelize
  direction: TxDirection;
  balanceAfter: string | null;
  status: TxStatus;
  category: string | null;
  invoiceId: number | null;
  /** partner na čiju karticu se stavka vodi (auto-match ili ručno) */
  partnerId: number | null;
  /** povezana faktura (kad je backend include-uje) */
  invoice?: {
    id: number;
    fullNumber: string;
    grossTotal: string;
    status: string;
  } | null;
};

export type BankStatementInfo = {
  id: number;
  bankId: string;
  bankName: string | null;
  account: string | null;
  statementNumber: string | null;
  statementDate: string | null;
  currency: string | null;
  openingBalance: string | null;
  closingBalance: string | null;
  fileName: string | null;
  // MySQL JSON kolona može stići kao niz ili kao serijalizovan string,
  // zavisno od drajvera — normalizovati sa parseWarnings()
  warnings: string[] | string | null;
  createdAt: string;
  txCount: number;
  unmatchedCount: number;
};

/** Normalizuj warnings JSON kolonu u niz stringova. */
export function parseWarnings(w: string[] | string | null | undefined): string[] {
  if (Array.isArray(w)) return w;
  if (typeof w === "string") {
    try {
      const parsed = JSON.parse(w);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return w ? [w] : [];
    }
  }
  return [];
}

export type BankStatementDetail = Omit<
  BankStatementInfo,
  "txCount" | "unmatchedCount"
> & {
  transactions: BankTransaction[];
};

export type BankStatementSummary = {
  year: number;
  month: number;
  loadedThisMonth: number;
  confirmedThisMonth: number;
  unmatched: number;
  lastUpload: {
    id: number;
    fileName: string | null;
    bankName: string | null;
    statementDate: string | null;
    createdAt: string;
  } | null;
  /** promet tekućeg mjeseca (KM) */
  totalInThisMonth: number;
  totalOutThisMonth: number;
  /** zadnje poznato stanje po računima (null = još nema izvoda sa stanjem) */
  balance: {
    total: number;
    accounts: Array<{
      account: string;
      bankName: string | null;
      statementDate: string | null;
      closingBalance: number;
    }>;
  } | null;
};

export type UploadResult = {
  statementId: number;
  bankName: string | null;
  statementNumber: string | null;
  statementDate: string | null;
  transactionCount: number;
  totalIn: number;
  totalOut: number;
  openingBalance: number | null;
  closingBalance: number | null;
  warnings: string[];
};

export type UploadError = {
  error:
    | "UNSUPPORTED_BANK"
    | "NO_TEXT_LAYER"
    | "VALIDATION_FAILED"
    | "PARSE_ERROR"
    | "DUPLICATE_STATEMENT"
    | "INVALID_FILE_TYPE"
    | string;
  errorDetail?: string | null;
  validationErrors?: string[] | null;
};

async function jsonRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

/** Upload PDF izvoda. Vraća rezultat ili strukturisanu grešku parsera. */
export async function uploadBankStatement(
  orgId: number,
  file: File,
): Promise<
  | { ok: true; data: UploadResult }
  | ({ ok: false } & UploadError)
> {
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/bank-statements/${orgId}/upload`,
      { method: "POST", credentials: "include", body: form },
    );
    const json = await res.json().catch(() => null);
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export type ManualTransactionInput = {
  date?: string;
  description: string;
  counterpartyName?: string;
  /** potvrđen partner iz autocomplete-a; ima prednost nad auto-matchom */
  partnerId?: number;
  amount: number;
  direction: "in" | "out";
};

export type ManualStatementPayload = {
  statementNumber?: string;
  statementDate: string; // YYYY-MM-DD
  /** žiro račun na koji se izvod odnosi (obrt sa više banaka bira);
   *  prazno = račun iz profila obrta */
  account?: string;
  /** ukupan promet duguje (odlivi) sa izvoda — kontrolna suma */
  totalDuguje: number;
  /** ukupan promet potražuje (prilivi) sa izvoda — kontrolna suma */
  totalPotrazuje: number;
  transactions: ManualTransactionInput[];
};

/** Ručni unos cijelog izvoda; ista validacija salda kao PDF upload. */
export async function createManualStatement(
  orgId: number,
  payload: ManualStatementPayload,
): Promise<{ ok: true; data: UploadResult } | ({ ok: false } & UploadError)> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/bank-statements/${orgId}/manual`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export function listBankStatements(orgId: number) {
  return jsonRequest<BankStatementInfo[]>(`/api/bank-statements/${orgId}`, {
    method: "GET",
  });
}

export function getBankStatement(orgId: number, statementId: number) {
  return jsonRequest<BankStatementDetail>(
    `/api/bank-statements/${orgId}/statement/${statementId}`,
    { method: "GET" },
  );
}

export function confirmAllStatement(orgId: number, statementId: number) {
  return jsonRequest<{ updated: number }>(
    `/api/bank-statements/${orgId}/statement/${statementId}/confirm-all`,
    { method: "POST" },
  );
}

export function deleteBankStatement(orgId: number, statementId: number) {
  return jsonRequest<null>(
    `/api/bank-statements/${orgId}/statement/${statementId}`,
    { method: "DELETE" },
  );
}

export type BankTransactionWithStatement = BankTransaction & {
  statement?: { statementNumber: string | null; bankName: string | null } | null;
};

export type TxSearchQuery = {
  q?: string;
  dateFrom?: string; // ISO
  dateTo?: string; // ISO
  direction?: TxDirection;
  status?: TxStatus;
  /** id kategorije, ili "__none" za stavke bez kategorije */
  category?: string;
  limit?: number;
  offset?: number;
};

export function searchBankTransactions(orgId: number, query: TxSearchQuery) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      sp.set(key, String(value));
    }
  }
  return jsonRequest<{ items: BankTransactionWithStatement[]; total: number }>(
    `/api/bank-statements/${orgId}/transactions?${sp.toString()}`,
    { method: "GET" },
  );
}

export function bankStatementsSummary(orgId: number) {
  return jsonRequest<BankStatementSummary>(
    `/api/bank-statements/${orgId}/summary`,
    { method: "GET" },
  );
}

// ── Predstojeće obaveze ─────────────────────────────────────────────────────
export type Obligation = {
  id: string;
  title: string;
  due: string; // ISO datum roka
  done: boolean;
  overdue: boolean;
};

export function listObligations(orgId: number) {
  return jsonRequest<{ items: Obligation[] }>(
    `/api/bank-statements/${orgId}/obligations`,
    { method: "GET" },
  );
}

// ── KPR-1041 (izvedena knjiga) ──────────────────────────────────────────────
export type KprCols = {
  k11: number;
  k12: number;
  k13: number;
  k14: number;
  k15: number;
  k16: number;
  k17: number;
  k18: number;
  k19: number;
  k20: number;
  k21: number;
};

export type KprRow = KprCols & {
  rbr: number;
  datum: string;
  brojDokumenta: string;
  opis: string;
  kategorija: string;
};

export type KprData = {
  from: string; // ISO datum početka perioda
  to: string; // ISO datum kraja perioda
  isPdvObveznik: boolean;
  obveznik: {
    naziv: string;
    jib: string;
    adresa: string;
    vlasnikIme: string;
    vlasnikJmb: string;
    vlasnikAdresa: string;
  };
  rows: KprRow[];
  totals: KprCols;
};

export type KprPeriod =
  | { year: number }
  | { from: string; to: string };

export function getKpr(orgId: number, period: KprPeriod) {
  const qs =
    "from" in period
      ? `from=${period.from}&to=${period.to}`
      : `year=${period.year}`;
  return jsonRequest<KprData>(`/api/bank-statements/${orgId}/kpr?${qs}`, {
    method: "GET",
  });
}

export function updateBankTransaction(
  orgId: number,
  txId: number,
  patch: {
    status?: TxStatus;
    category?: string | null;
    invoiceId?: number | null;
    partnerId?: number | null;
  },
) {
  return jsonRequest<BankTransaction>(
    `/api/bank-statements/${orgId}/transactions/${txId}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

// ── Grupni uvoz (Inbox): analiza više PDF-ova bez snimanja ──────────────────

export type BulkFileStatus =
  | "ready" // prepoznat, bez upozorenja: knjiži se jednim klikom
  | "review" // prepoznat, ima upozorenja: traži pregled prije knjiženja
  | "duplicate" // već učitan kod tog klijenta
  | "unrecognized" // nijedan obrt nema ovaj žiro račun: ručna dodjela
  | "conflict" // više obrta ima isti račun: ručni izbor
  | "error"; // parsiranje/validacija nije prošla

export type BulkTransactionPreview = {
  date: string | null;
  description: string | null;
  amount: number;
  direction: TxDirection;
  counterpartyName: string | null;
};

export type BulkFileResult = {
  fileName: string;
  status: BulkFileStatus;
  error?: string;
  errorDetail?: string | null;
  validationErrors?: string[] | null;
  bankName?: string | null;
  account?: string | null;
  statementNumber?: string | null;
  statementDate?: string | null;
  transactionCount?: number;
  totalIn?: number;
  totalOut?: number;
  openingBalance?: number | null;
  closingBalance?: number | null;
  transactions?: BulkTransactionPreview[];
  org?: { id: number; name: string } | null;
  existingStatementId?: number;
  candidateOrgIds?: number[];
  warnings?: string[];
};

export type BulkAnalyzeResult = {
  files: BulkFileResult[];
  organizations: { id: number; name: string }[];
};

/** Analiza svih PDF-ova: parsiranje + prepoznavanje obrta, NIŠTA se ne snima.
 *  Knjiženje potom ide postojećim uploadBankStatement(orgId, file) po fajlu. */
export async function bulkAnalyzeStatements(
  files: File[],
): Promise<ApiResponse<BulkAnalyzeResult>> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  try {
    const res = await fetch(`${BACKEND_URL}/api/bank-statements/bulk/analyze`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const json = (await res
      .json()
      .catch(() => null)) as ApiResponse<BulkAnalyzeResult> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
