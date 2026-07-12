import type { ApiResponse, AuthUser } from "src/api/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export type OrgRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type TaxRegime = "PAUSALAC" | "SLOBODNO_ZANIMANJE" | null;
export type OrgType = "COMPANY" | "BUSINESS";

export type OrganizationSummary = {
  id: number;
  name: string;
  taxNumber: string | null;
  type: OrgType;
  taxRegime: TaxRegime;
  logoUrl: string | null;
  isClientOrg: boolean;
  role: OrgRole;
};

export type UserPreferences = {
  activeOrganizationId: number | null;
  theme: "light" | "dark" | "system";
  commandPaletteEnabled: boolean;
};

export type MeWithOrgs = AuthUser & {
  organizations: OrganizationSummary[];
  activeOrganization: OrganizationSummary | null;
  preferences: UserPreferences | null;
};

async function request<T>(
  path: string,
  init: RequestInit & { organizationId?: number } = {},
): Promise<ApiResponse<T>> {
  const { organizationId, headers, ...rest } = init;
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...rest,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(organizationId
          ? { "X-Organization-Id": String(organizationId) }
          : {}),
        ...(headers ?? {}),
      },
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export function meWithOrgs() {
  return request<MeWithOrgs>("/api/auth/me", { method: "GET" });
}

export function activateOrganization(id: number) {
  return request<{ activeOrganizationId: number }>(
    `/api/organizations/${id}/activate`,
    { method: "POST" },
  );
}

export type PayrollStatus =
  | "no_workers"
  | "none"
  | "partial"
  | "obracunato"
  | "isplaceno";

export type OrgWithPayrollStatus = {
  id: number;
  name: string;
  workerCount: number;
  payrollObracunato: number;
  payrollIsplaceno: number;
  payrollStatus: PayrollStatus;
  mipDownloadedAt: string | null;
};

export type PayrollStatusResponse = {
  own: OrgWithPayrollStatus[];
  clients: OrgWithPayrollStatus[];
  year: number;
  month: number;
};

// ── PK Office pristup i slotovi (Office paketi) ──────────────────────────────

export type PkOfficePristup = {
  /** false = naplata još nije uključena (PK_OFFICE_NAPLATA): sve radi kao prije */
  enforced: boolean;
  hasOffice: boolean;
  /** "vlastiti" = pretplata/trial/admin; "naslijedjen" = kroz članstvo u
      obrtu office pretplatnika (bez slotova i upravljanja); null = nema */
  scope: "vlastiti" | "naslijedjen" | null;
  plan: string | null;
  planNaziv: string | null;
  /** null = bez limita */
  maxObrta: number | null;
  trial: boolean;
  trialEndsAt: string | null;
  trialIskoristen: boolean;
  /** broj obrta trenutno aktivnih u PK Office (scope "vlastiti") */
  aktivnihObrta: number;
  /** paket manji od broja aktivnih obrta (downgrade): moduli su blokirani
      dok se višak obrta ne deaktivira; deaktivacija tada odmah oslobađa slot */
  prekoLimita: boolean;
  /** max null = bez limita (npr. admin) */
  slotovi: { zauzeto: number; max: number | null } | null;
  organizations: {
    id: number;
    name: string;
    isClientOrg: boolean;
    pkOfficeEnabled: boolean;
    /** deaktiviran u tekućem mjesecu: slot zauzet do kraja mjeseca */
    zauzetDoKrajaMjeseca: boolean;
  }[];
};

export function getPkOfficePristup() {
  return request<PkOfficePristup>("/api/pk-office/pristup", { method: "GET" });
}

export function aktivirajObrtUPkOffice(orgId: number) {
  return request<{ id: number; pkOfficeEnabled: boolean }>(
    `/api/pk-office/organizacije/${orgId}/aktiviraj`,
    { method: "POST" },
  );
}

export function deaktivirajObrtUPkOffice(orgId: number) {
  return request<{ id: number; pkOfficeEnabled: boolean }>(
    `/api/pk-office/organizacije/${orgId}/deaktiviraj`,
    { method: "POST" },
  );
}

export function startPkOfficeTrial() {
  return request<{ trialEndsAt: string }>("/api/pk-office/trial", {
    method: "POST",
  });
}

export function payrollStatusForMonth(year?: number, month?: number) {
  const qs =
    year && month
      ? `?${new URLSearchParams({ year: String(year), month: String(month) })}`
      : "";
  return request<PayrollStatusResponse>(
    `/api/organizations/payroll-status${qs}`,
    { method: "GET" },
  );
}
