import { type ApiResponse } from "src/api/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

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

// ─── User profile ────────────────────────────────────────────────────────────

export type ProfileUpdatePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  jmbg?: string | null;
};

export function updateProfile(userId: number, payload: ProfileUpdatePayload) {
  return request(`/api/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ─── Organizations ────────────────────────────────────────────────────────────

export type OrgOwner = {
  id: number;
  firstName: string;
  lastName: string;
  jmbg: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export type OrgOwnerPayload = {
  firstName: string;
  lastName: string;
  jmbg: string;
  email?: string;
  phone?: string;
  address?: string;
};

export type Organization = {
  id: number;
  name: string;
  type: "COMPANY" | "BUSINESS";
  taxNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  owner: OrgOwner | null;
  memberRole: "OWNER" | "ADMIN" | "MEMBER";
  createdAt: string;
  updatedAt: string;
};

export type OrgPayload = {
  name: string;
  type: "COMPANY" | "BUSINESS";
  taxNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  ownerData?: OrgOwnerPayload;
};

export function getOrganizations() {
  return request<Organization[]>("/api/organizations");
}

export function createOrganization(payload: OrgPayload) {
  return request<Organization>("/api/organizations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOrganization(id: number, payload: Partial<OrgPayload>) {
  return request<Organization>(`/api/organizations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// ─── Forms history ────────────────────────────────────────────────────────────

export type FormType = "GPD" | "SPR" | "ZO3" | "UGOVOR";
export type FormStatus = "DRAFT" | "GENERATED" | "SUBMITTED" | "ARCHIVED";

export type FormRecord = {
  id: number;
  type: FormType;
  status: FormStatus;
  year: number;
  month: number | null;
  title: string | null;
  pdfUrl: string | null;
  createdAt: string;
  organization: { id: number; name: string } | null;
  client: {
    id: number;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
  } | null;
};

export function getForms(type?: FormType) {
  const qs = type ? `?type=${type}` : "";
  return request<FormRecord[]>(`/api/forms${qs}`);
}

// ─── Person clients (fizičko lice) ───────────────────────────────────────────

export type PersonClient = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  jmbg: string | null;
  taxNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonClientPayload = {
  firstName: string;
  lastName: string;
  jmbg?: string;
  taxNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export function getPersonClients() {
  return request<PersonClient[]>("/api/clients");
}

export function createPersonClient(payload: PersonClientPayload) {
  return request<PersonClient>("/api/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePersonClient(
  id: number,
  payload: Partial<PersonClientPayload>,
) {
  return request<PersonClient>(`/api/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
