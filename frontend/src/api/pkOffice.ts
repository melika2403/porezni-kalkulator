import type { ApiResponse, AuthUser } from "src/api/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export type OrgRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type TaxRegime = "PAUSALAC" | "SLOBODNO_ZANIMANJE" | null;
export type OrgType = "COMPANY" | "BUSINESS";

/** Moduli koje Solo upitnik pali (PDV ide preko isPdvObveznik). */
export type SoloModuli = {
  radnici: boolean;
  roba: boolean;
  blagajna: boolean;
  putniNalozi: boolean;
  stalnaSredstva: boolean;
};

export const SOLO_MODULI_PRAZNO: SoloModuli = {
  radnici: false,
  roba: false,
  blagajna: false,
  putniNalozi: false,
  stalnaSredstva: false,
};

export type OrganizationSummary = {
  id: number;
  name: string;
  taxNumber: string | null;
  type: OrgType;
  taxRegime: TaxRegime;
  logoUrl: string | null;
  isClientOrg: boolean;
  role: OrgRole;
  /** PK Office Solo: "vodim sam sebi" (suženi meni, lista obaveza) */
  soloMode?: boolean;
  /** null = upitnik još nije popunjen */
  soloModuli?: SoloModuli | null;
  isPdvObveznik?: boolean;
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
  /** datum zadnjeg učitanog izvoda (za pregled obrta na Početnoj) */
  lastStatementDate: string | null;
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
  /** nivo probe: "office_1" = Solo proba, null = Office Tim */
  trialPlan?: "office_1" | null;
  /** paket koji sistem preporučuje po broju obrta i načinu rada (ključ cjenovnika, npr. OFFICE_1) */
  preporuceniPlan?: string | null;
  preporuceniPlanNaziv?: string | null;
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

export function startPkOfficeTrial(plan?: "office_1" | null) {
  return request<{ trialEndsAt: string; trialPlan: "office_1" | null }>("/api/pk-office/trial", {
    method: "POST",
    body: JSON.stringify({ plan: plan ?? null }),
  });
}

/** Mijenja nivo AKTIVNE probe: "office_1" (Solo, jedan obrt) ili null (Office Tim). */
export function setPkOfficeTrialPlan(plan: "office_1" | null) {
  return request<{ trialPlan: "office_1" | null }>("/api/pk-office/trial/plan", {
    method: "POST",
    body: JSON.stringify({ plan }),
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
