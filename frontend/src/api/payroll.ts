import { type ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export type PayrollStatus = "DRAFT" | "OBRACUNATO" | "ISPLACENO";

export type Payroll = {
  id: number;
  organizationId: number;
  workerId: number;
  year: number;
  month: number;

  workedMinutes: number | null;
  standardMinutes: number | null;
  sickDays: number;
  vacationDays: number;
  overtimeHours: number;
  nightHours: number;
  sundayHours: number;
  holidayHours: number;

  overtimeRate: number | null;
  nightRate: number | null;
  sundayRate: number | null;
  holidayRate: number | null;
  overtimeAmount: number | null;
  nightAmount: number | null;
  sundayAmount: number | null;
  holidayAmount: number | null;

  gross: number;
  grossBase: number | null;
  minuliRadRate: number | null;
  minuliRadYears: number | null;
  minuliRadAmount: number | null;
  taxCoefficient: number;
  deduction: number;
  minBaseApplied: boolean;

  empPio: number;
  empZdravstvo: number;
  empNezaposlenost: number;
  empTotal: number;

  taxBase: number;
  incomeTax: number;
  net: number;

  erpPio: number;
  erpZdravstvo: number;
  erpNezaposlenost: number;
  erpTotal: number;

  vodnaNaknada: number;
  naknadaNesrece: number;

  mealAllowance: number;
  vacationBonus: number;
  travelExpense: number;

  totalCost: number;

  bankAccount: string | null;
  status: PayrollStatus;
  paymentDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CalculatePayload = {
  organizationId: number;
  workerId: number;
  year: number;
  month: number;
  gross?: number;
  grossBase?: number;
  minuliRadRate?: number;
  paymentDate?: string;
  taxCoefficient?: number;
  workedMinutes?: number | null;
  standardMinutes?: number | null;
  sickDays?: number;
  vacationDays?: number;
  overtimeHours?: number;
  nightHours?: number;
  sundayHours?: number;
  holidayHours?: number;
  overtimeRate?: number;
  nightRate?: number;
  sundayRate?: number;
  holidayRate?: number;
  mealAllowance?: number;
  vacationBonus?: number;
  travelExpense?: number;
  // Pro-rate factor 0..1 — koristi se za mid-month prijavu/odjavu radnika
  // i vlasnika. Backend skalira osnovicu, minuli rad i min doprinosnu osnovu.
  // Default 1 (puni mjesec). Vidi computeProRateFactor u ObracunPlata.tsx.
  proRateFactor?: number;
  notes?: string | null;
};

export type PatchPayload = Partial<
  Omit<CalculatePayload, "organizationId" | "workerId" | "year" | "month">
> & {
  status?: PayrollStatus;
};

export function listPayrolls(organizationId: number, year: number, month: number) {
  const sp = new URLSearchParams({
    organizationId: String(organizationId),
    year: String(year),
    month: String(month),
  });
  return request<Payroll[]>(`/api/payroll?${sp.toString()}`);
}

export function calculatePayroll(payload: CalculatePayload) {
  return request<Payroll>(`/api/payroll/calculate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Sprema samo input polja bez punog obračuna. Koristi se kad korisnik zatvori
// obracun bez eksplicitnog klika "Obračunaj" — vrijednosti ostaju za kasniji
// "Obračunaj sve".
export type SaveInputsPayload = {
  organizationId: number;
  workerId: number;
  year: number;
  month: number;
  workedMinutes?: number | null;
  sickDays?: number;
  vacationDays?: number;
  overtimeHours?: number;
  nightHours?: number;
  sundayHours?: number;
  holidayHours?: number;
  overtimeRate?: number;
  nightRate?: number;
  sundayRate?: number;
  holidayRate?: number;
  mealAllowance?: number;
  vacationBonus?: number;
  travelExpense?: number;
  taxCoefficient?: number;
  minuliRadRate?: number;
};

export function savePayrollInputs(payload: SaveInputsPayload) {
  return request<Payroll>(`/api/payroll/save-inputs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function patchPayroll(id: number, payload: PatchPayload) {
  return request<Payroll>(`/api/payroll/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deletePayroll(id: number) {
  return request<null>(`/api/payroll/${id}`, { method: "DELETE" });
}

export function markMonthPaid(payload: {
  organizationId: number;
  year: number;
  month: number;
}) {
  return request<{ updated: number }>(`/api/payroll/mark-month-paid`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Postavlja paymentDate na sve payroll-e u (org, year, month). Vraća ga svim
// dokumentima (MIP-1023 XML, platne liste, uplatnice).
export function setPayrollPaymentDate(payload: {
  organizationId: number;
  year: number;
  month: number;
  paymentDate: string | null;
}) {
  return request<{ updated: number; paymentDate: string | null }>(
    `/api/payroll/payment-date`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

// ── Payroll documents (uplatnice) ──────────────────────────────────────────
export type PayrollDocumentType =
  | "PLATNA_LISTA"
  | "UPLATNICA_NETO"
  | "UPLATNICA_PIO"
  | "UPLATNICA_ZDR"
  | "UPLATNICA_ZDR_FED"
  | "UPLATNICA_NEZAP"
  | "UPLATNICA_NEZAP_KANT"
  | "UPLATNICA_POREZ"
  | "UPLATNICA_VODNA"
  | "UPLATNICA_NESRECE"
  | "UPLATNICA_INVALIDI";

export type PayrollDocument = {
  id: number;
  payrollId: number;
  type: PayrollDocumentType;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number | null;
  createdAt: string;
};

export function generateUplatnice(payrollId: number) {
  return request<PayrollDocument[]>(`/api/payroll/${payrollId}/uplatnice`, {
    method: "POST",
  });
}

export function listPayrollDocuments(payrollId: number) {
  return request<PayrollDocument[]>(`/api/payroll/${payrollId}/documents`);
}

export function payrollDocumentDownloadUrl(docId: number): string {
  return `${BACKEND_URL}/api/payroll-documents/${docId}/download`;
}

export function deletePayrollDocument(docId: number) {
  return request<null>(`/api/payroll-documents/${docId}`, { method: "DELETE" });
}

// ── Monthly aggregator ─────────────────────────────────────────────────────
export type MonthlyUplatnicaSummary = {
  type: PayrollDocumentType;
  label: string;
  amount: number;
  account: string;
  vrstaPrihoda: string;
  budgetOrg: string;
  primalac: string[];
  opcinaKod?: string;
  opcinaIme?: string;
  group?: "vlasnik" | "radnici" | null;
};

export type MonthlyPerWorker = {
  workerId: number;
  payrollId: number;
  workerName: string;
  bankAccount: string | null;
  net: number;
  mealAllowance: number;
  vacationBonus: number;
  travelExpense: number;
  status: PayrollStatus;
};

export type MonthlySummary = {
  organizationId: number;
  year: number;
  month: number;
  workerCount: number;
  totals: {
    gross: number;
    net: number;
    empContrib: number;
    erpContrib: number;
    empPio: number;
    empZdr: number;
    empNezap: number;
    erpPio: number;
    erpZdr: number;
    erpNezap: number;
    tax: number;
    vodna: number;
    nesrece: number;
    invalidi: number;
    meal: number;
    vacation: number;
    travel: number;
    totalCost: number;
  };
  uplatnice: MonthlyUplatnicaSummary[];
  perWorker: MonthlyPerWorker[];
};

export function getMonthlySummary(organizationId: number, year: number, month: number) {
  const sp = new URLSearchParams({
    organizationId: String(organizationId),
    year: String(year),
    month: String(month),
  });
  return request<MonthlySummary>(`/api/payroll/monthly-summary?${sp.toString()}`);
}

// Streamuje jedan kombinovani PDF (više stranica) — platni listići za sve
// radnike + zbirne uplatnice. Vraća { ok: true, blob, filename, pageCount }.
export async function generateMonthlyUplatnice(
  organizationId: number,
  year: number,
  month: number,
  paymentDate?: string,
): Promise<
  | { ok: true; blob: Blob; filename: string; pageCount: number }
  | { ok: false; error: string }
> {
  const sp = new URLSearchParams({
    organizationId: String(organizationId),
    year: String(year),
    month: String(month),
  });
  if (paymentDate) sp.set("paymentDate", paymentDate);
  try {
    const res = await fetch(`${BACKEND_URL}/api/payroll/monthly-uplatnice?${sp.toString()}`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      return { ok: false, error: j?.error || `HTTP ${res.status}` };
    }
    const blob = await res.blob();
    const filename = `uplatnice-${year}-${String(month).padStart(2, "0")}.pdf`;
    const pageCount = Number(res.headers.get("X-Page-Count") || 0);
    return { ok: true, blob, filename, pageCount };
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

// Mjesečni platni listići — kombinovani PDF (jedna stranica po radniku)
export async function generateMonthlyPayslips(
  organizationId: number,
  year: number,
  month: number,
  paymentDate?: string,
): Promise<
  | { ok: true; blob: Blob; filename: string; pageCount: number }
  | { ok: false; error: string }
> {
  const sp = new URLSearchParams({
    organizationId: String(organizationId),
    year: String(year),
    month: String(month),
  });
  if (paymentDate) sp.set("paymentDate", paymentDate);
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/payroll/monthly-payslips?${sp.toString()}`,
      { method: "POST", credentials: "include" },
    );
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      return { ok: false, error: j?.error || `HTTP ${res.status}` };
    }
    const blob = await res.blob();
    const filename = `platni-listici-${year}-${String(month).padStart(2, "0")}.pdf`;
    const pageCount = Number(res.headers.get("X-Page-Count") || 0);
    return { ok: true, blob, filename, pageCount };
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

// Pošalji platni listić za jednog radnika email-om (na worker.email).
// Vraća { ok: true, sentTo } ili { ok: false, error, message? }.
// Posebne greške: WORKER_NO_EMAIL (radnik nema upisan email).
export type EmailPayslipResult =
  | { ok: true; sentTo: string }
  | { ok: false; error: string; message?: string };

export async function emailWorkerPayslip(
  payrollId: number,
  paymentDate?: string,
): Promise<EmailPayslipResult> {
  return request<{ sentTo: string }>(`/api/payroll/${payrollId}/email-payslip`, {
    method: "POST",
    body: JSON.stringify({ paymentDate }),
  }).then((r) =>
    r.ok ? { ok: true, sentTo: r.data.sentTo } : { ok: false, error: r.error },
  );
}

// Bulk slanje platnih listića za sve radnike u (org, year, month). Radnici
// bez email-a se preskaču — vraćaju se u `skipped` listi. Failure-i u
// `failed`. Ostatak je `sent`.
export type BulkEmailPayslipsResult =
  | {
      ok: true;
      sent: number;
      skipped: Array<{ workerId: number; name: string; reason: string }>;
      failed: Array<{ workerId: number; name: string; reason: string }>;
      totalProcessed: number;
    }
  | { ok: false; error: string };

export async function emailMonthlyPayslipsBulk(
  organizationId: number,
  year: number,
  month: number,
  paymentDate?: string,
): Promise<BulkEmailPayslipsResult> {
  const res = await request<{
    sent: number;
    skipped: Array<{ workerId: number; name: string; reason: string }>;
    failed: Array<{ workerId: number; name: string; reason: string }>;
    totalProcessed: number;
  }>(`/api/payroll/email-payslips-bulk`, {
    method: "POST",
    body: JSON.stringify({ organizationId, year, month, paymentDate }),
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, ...res.data };
}

// Pojedinačni platni listić za jednog radnika (po payrollId)
export async function generateWorkerPayslip(
  payrollId: number,
  paymentDate?: string,
): Promise<{ ok: true; blob: Blob; filename: string } | { ok: false; error: string }> {
  const sp = new URLSearchParams();
  if (paymentDate) sp.set("paymentDate", paymentDate);
  const qs = sp.toString();
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/payroll/${payrollId}/payslip${qs ? `?${qs}` : ""}`,
      { method: "GET", credentials: "include" },
    );
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      return { ok: false, error: j?.error || `HTTP ${res.status}` };
    }
    const blob = await res.blob();
    // Filename iz Content-Disposition (fallback ako fali)
    let filename = `platni-listic.pdf`;
    const cd = res.headers.get("Content-Disposition") || "";
    const m = /filename\*?=(?:UTF-8'')?([^;]+)/i.exec(cd);
    if (m) filename = decodeURIComponent(m[1].replace(/^"|"$/g, ""));
    return { ok: true, blob, filename };
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}
