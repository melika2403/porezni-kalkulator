// Admin "360" detalj: organizacija (sa platama i dokumentima) i korisnik.
import type { ApiResponse } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

const BACKEND_URL = getBackendUrl();

async function request<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, { credentials: "include" });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export type AdminOrgDetail = {
  id: number;
  name: string;
  type: "COMPANY" | "BUSINESS";
  isClientOrg: boolean;
  taxNumber: string | null;
  pdvNumber: string | null;
  activityCode: string | null;
  activityName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  bankAccount: string | null;
  taxRegime: string | null;
  taxCategory: string | null;
  defaultSalaryType: string;
  mealAllowancePerDay: number | null;
  createdAt: string;
  createdBy: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    role: string;
  } | null;
  owner: {
    id: number;
    firstName: string;
    lastName: string;
    jmbg: string | null;
  } | null;
  counts: { workers: number; payrolls: number; forms: number; invoices: number };
};

export type AdminOrgWorker = {
  id: number;
  firstName: string;
  lastName: string;
  role: "VLASNIK" | "RADNIK";
  position: string | null;
  employmentStatus: string;
  salaryType: string;
  salaryBruto: number | null;
  salaryNeto: number | null;
  startDate: string | null;
  endDate: string | null;
};

export type AdminPayrollRow = {
  id: number;
  workerId: number;
  workerName: string;
  status: "DRAFT" | "OBRACUNATO" | "ISPLACENO";
  paymentDate: string | null;
  // Vlasnik obrta (BUSINESS + VLASNIK): nema porez ni neto, samo osnovicu i
  // doprinose. Porez/neto kolone se za njega prikazuju kao "–".
  isObrtOwner: boolean;
  gross: number;
  net: number;
  empTotal: number;
  incomeTax: number;
  erpTotal: number;
  mealAllowance: number;
  vacationBonus: number;
  travelExpense: number;
  totalCost: number;
};

export type AdminPayrollsData = {
  year: number;
  month: number | null;
  byMonth: { month: number; count: number; netSum: number; costSum: number }[];
  items: AdminPayrollRow[];
  summary: {
    gross: number;
    net: number;
    empTotal: number;
    incomeTax: number;
    erpTotal: number;
    totalCost: number;
  } | null;
};

export type AdminOrgDocuments = {
  forms: {
    id: number;
    type: string;
    title: string | null;
    status: string;
    year: number | null;
    month: number | null;
    pdfUrl: string | null;
    updatedAt: string;
  }[];
  payrollDocuments: {
    id: number;
    type: string;
    originalName: string;
    period: string | null;
    downloadUrl: string;
  }[];
  workerDocuments: {
    id: number;
    type: string;
    format: string;
    number: string | null;
    originalName: string;
    downloadUrl: string;
  }[];
};

export type AdminUserDetail = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  role: string;
  isEmailVerified: boolean;
  trialUsedAt: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  createdAt: string;
  subscription: {
    plan: string | null;
    billingCycle: string | null;
    startDate: string;
    endDate: string;
    isActive: boolean;
    isTrial: boolean;
  } | null;
  organizations: {
    id: number;
    name: string;
    type: string;
    isClientOrg: boolean;
    role: string;
  }[];
  counts: { forms: number; invoices: number };
};

export function getOrgDetail(id: number) {
  return request<AdminOrgDetail>(`/api/admin/organizations/${id}/detail`);
}
export function getOrgWorkers(id: number) {
  return request<{ items: AdminOrgWorker[] }>(
    `/api/admin/organizations/${id}/workers-full`,
  );
}
export function getOrgPayrolls(id: number, year: number, month?: number) {
  const sp = new URLSearchParams({ year: String(year) });
  if (month) sp.set("month", String(month));
  return request<AdminPayrollsData>(
    `/api/admin/organizations/${id}/payrolls?${sp.toString()}`,
  );
}
export function getOrgDocuments(id: number) {
  return request<AdminOrgDocuments>(
    `/api/admin/organizations/${id}/documents`,
  );
}
export function getUserDetail(id: number) {
  return request<AdminUserDetail>(`/api/admin/users/${id}/detail`);
}

// Apsolutni URL za admin download dokumenata (relativni stiže iz backenda).
export function adminDownloadUrl(relativePath: string): string {
  return `${BACKEND_URL}${relativePath}`;
}
