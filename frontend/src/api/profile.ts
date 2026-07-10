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

// ─── User profile ────────────────────────────────────────────────────────────

export type ProfileUpdatePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  jmbg?: string | null;
  idCardNumber?: string | null;
};

export type Subscription = {
  id: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  /** free | pro | business | office_2 | office_10 | office_25 | office_50 */
  plan?: string | null;
  billingCycle?: "monthly" | "yearly" | null;
};

export type UsersListResponse = {
  items: Users[];
  total: number;
  page: number;
  limit: number;
};

export type Users = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  role: "USER" | "PRO" | "ADMIN" | "BUSINESS";
  phone: string | null;
  address: string | null;
  city: string | null;
  createdAt: string;
  isEmailVerified: boolean;
  trialUsedAt: string | null;
  pkOfficeTrialEndsAt?: string | null;
  subscription: Subscription | null;
};

export type UserUpdatePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  role?: "USER" | "PRO" | "ADMIN" | "BUSINESS";
};

export type SubscriptionPayload = {
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  /** PRO | BUSINESS | office_2 | office_10 | office_25 | office_50 */
  plan?: string;
  billingCycle?: "monthly" | "yearly";
};

export function updateProfile(userId: number, payload: ProfileUpdatePayload) {
  return request(`/api/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getUsers(params?: {
  firstName?: string;
  lastName?: string;
  email?: string;
  /** rola (USER/PRO/BUSINESS/ADMIN) ili office paket: office, office_2..office_50 */
  role?: string;
  sort?: "newest" | "oldest" | "name";
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.firstName) sp.set("firstName", params.firstName);
  if (params?.lastName) sp.set("lastName", params.lastName);
  if (params?.email) sp.set("email", params.email);
  if (params?.role) sp.set("role", params.role);
  if (params?.sort) sp.set("sort", params.sort);
  sp.set("page", String(params?.page ?? 1));
  sp.set("limit", String(params?.limit ?? 20));

  return request<UsersListResponse>(`/api/users?${sp.toString()}`);
}

export function adminUpdateUser(userId: number, payload: UserUpdatePayload) {
  return request<Users>(`/api/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(userId: number) {
  return request<null>(`/api/users/${userId}`, { method: "DELETE" });
}

export function upsertSubscription(
  userId: number,
  payload: SubscriptionPayload,
) {
  return request<Subscription>(`/api/users/${userId}/subscription`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSubscription(userId: number) {
  return request<null>(`/api/users/${userId}/subscription`, {
    method: "DELETE",
  });
}

// ─── Organizations ────────────────────────────────────────────────────────────

// Tip vlasnika (d.o.o.). Za obrt se ne koristi (vlasnik je obrtnik).
export type OwnerType =
  | "fizicko_domace"
  | "fizicko_strano"
  | "pravno_lice"
  | "vise_lica";

export type DirectorEngagement = "ugovor_o_radu" | "menadzerski";

// Jedno lice u "više lica" vlasništvu.
export type OwnerPerson = {
  firstName: string;
  lastName: string;
  jmbg?: string | null;
  idDoc?: string | null;
};

export type OrgOwner = {
  // id postoji samo kad je vlasnik Worker VLASNIK (opcija 1 / obrt).
  id?: number;
  type?: OwnerType;
  firstName: string | null;
  lastName: string | null;
  // Naziv firme (pravno_lice) ili zbirni naziv (vise_lica).
  name?: string | null;
  jmbg: string | null;
  // Broj pasoša / strani ID (fizicko_strano).
  idDoc?: string | null;
  // JIB (pravno_lice).
  jib?: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  idCardNumber: string | null;
  prijavaDate: string | null;
  salaryBruto: number | null;
  salaryNeto: number | null;
  salaryType?: SalaryType;
  employmentStatus: "DRAFT" | "PRIJAVLJEN" | "ODJAVLJEN" | null;
  taxCoefficient?: number;
  persons?: OwnerPerson[] | null;
};

// Razriješeni potpisnik poslodavca za dokumente (vlasnik ili radnik-direktor).
export type OrgSigner = {
  firstName: string | null;
  lastName: string | null;
  name: string;
  jmbg: string | null;
  idCardNumber: string | null;
  address: string | null;
  city: string | null;
} | null;

export type OrgOwnerPayload = {
  firstName?: string;
  lastName?: string;
  jmbg?: string;
  name?: string;
  jib?: string;
  idDoc?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  idCardNumber?: string;
  prijavaDate?: string | null;
  salaryBruto?: number | null;
  salaryNeto?: number | null;
  salaryType?: SalaryType;
  taxCoefficient?: number;
  persons?: OwnerPerson[];
};

export type TaxRegime = "STVARNI_DOHODAK" | "PAUSALNI" | "OSTALI";
export type TaxCategory =
  | "SLOBODNA_ZANIMANJA"
  | "OBRT_SRODNE"
  | "POLJOPRIVREDA_SUMARSTVO"
  | "TRGOVAC_POJEDINAC"
  | "ESNAFSKI_ZANATI"
  | "TAXI";

export type Jurisdiction = "FBIH" | "RS" | "BD";

export type Organization = {
  id: number;
  name: string;
  type: "COMPANY" | "BUSINESS";
  taxNumber: string | null;
  pdvNumber: string | null;
  isPdvObveznik: boolean;
  /** KPR prihod od pazara iz KP-1042 (dnevni promet) umjesto pologa sa izvoda */
  kprPazarIzKp?: boolean;
  jurisdiction: Jurisdiction | null;
  taxRegime: TaxRegime | null;
  activityCode: string | null;
  activityName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  bankAccount: string | null;
  /** Svi žiro računi (samo cifre); prvi je glavni (= bankAccount). */
  bankAccounts: string[] | null;
  logoUrl: string | null;
  taxCategory: TaxCategory | null;
  // Default tip plate za nove radnike u ovoj org-i. Vidi SalaryType u Worker.
  defaultSalaryType: SalaryType;
  // Dnevna stopa toplog obroka za firmu (KM/dan). Obračun je množi sa brojem
  // radnih dana iz šihterice. NULL = bez auto-stope.
  mealAllowancePerDay: number | null;
  // Model vlasništva/direktora (d.o.o.). Za obrt se ignoriše.
  ownerType?: OwnerType;
  ownerIsDirector?: boolean;
  directorEngagement?: DirectorEngagement;
  directorWorkerId?: number | null;
  owner: OrgOwner | null;
  // Razriješeni potpisnik poslodavca (vlasnik ili radnik-direktor).
  signer?: OrgSigner;
  memberRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  // Plan tier of the org's OWNER. In-org features (workers, members,
  // logo, JS3100, …) are gated by this rather than the viewer's own role.
  effectiveTier: "USER" | "PRO" | "BUSINESS" | "ADMIN" | null;
  createdAt: string;
  updatedAt: string;
};

export type OrgPayload = {
  name: string;
  type: "COMPANY" | "BUSINESS";
  taxNumber?: string;
  pdvNumber?: string;
  isPdvObveznik?: boolean;
  kprPazarIzKp?: boolean;
  jurisdiction?: Jurisdiction | null;
  taxRegime?: TaxRegime | null;
  activityCode?: string;
  activityName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  bankAccount?: string;
  /** Lista svih žiro računa; backend prvi tretira kao glavni (bankAccount). */
  bankAccounts?: string[] | null;
  taxCategory?: TaxCategory | null;
  defaultSalaryType?: SalaryType;
  mealAllowancePerDay?: number | null;
  ownerType?: OwnerType;
  ownerIsDirector?: boolean;
  directorEngagement?: DirectorEngagement;
  directorWorkerId?: number | null;
  ownerData?: OrgOwnerPayload;
};

export type OrgSettingsPayload = Partial<Omit<OrgPayload, "ownerData">>;

export function getOrganizationSettings(id: number) {
  return request<Organization>(`/api/organizations/${id}/settings`);
}

export function updateOrganizationSettings(
  id: number,
  payload: OrgSettingsPayload,
) {
  return request<Organization>(`/api/organizations/${id}/settings`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ─── PK Office: /api/profile (current user) ─────────────────────────────────

export type ProfilePreferences = {
  activeOrganizationId: number | null;
  theme: "light" | "dark" | "system";
  commandPaletteEnabled: boolean;
};

export type Profile = {
  id: number;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
  preferences: ProfilePreferences;
};

export type ProfilePatchPayload = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
};

export type PreferencesPatchPayload = {
  theme?: "light" | "dark" | "system";
  commandPaletteEnabled?: boolean;
};

export function getMyProfile() {
  return request<Profile>("/api/profile");
}

export function patchMyProfile(payload: ProfilePatchPayload) {
  return request<Profile>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function changeProfilePassword(
  currentPassword: string,
  newPassword: string,
) {
  return request<null>("/api/profile/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function patchPreferences(payload: PreferencesPatchPayload) {
  return request<ProfilePreferences>("/api/profile/preferences", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type MyStats = {
  djelatnosti: number;
  klijenti: number;
  radnici: number;
  dokumenti: number;
  fakture: number;
  obracuniMjesec: number;
  obracuniDelta: number;
};

export function getMyStats() {
  return request<MyStats>("/api/me/stats");
}

export function getOrganizations() {
  return request<Organization[]>("/api/organizations");
}

export function getClientOrganizations() {
  return request<Organization[]>("/api/organizations/clients");
}

// Status payroll-a za odabrani mjesec po organizaciji.
export type OrgPayrollStatus =
  | "no_workers"
  | "none"
  | "partial"
  | "obracunato"
  | "isplaceno";

export type OrganizationWithPayrollStatus = Organization & {
  workerCount: number;
  payrollObracunato: number;
  payrollIsplaceno: number;
  payrollStatus: OrgPayrollStatus;
};

export type OrganizationsPayrollStatusResponse = {
  own: OrganizationWithPayrollStatus[];
  clients: OrganizationWithPayrollStatus[];
  year: number;
  month: number;
};

export function getOrganizationsWithPayrollStatus(year: number, month: number) {
  const sp = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  return request<OrganizationsPayrollStatusResponse>(
    `/api/organizations/payroll-status?${sp.toString()}`,
  );
}

export function createOrganization(payload: OrgPayload) {
  return request<Organization>("/api/organizations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getOrganization(id: number) {
  return request<Organization>(`/api/organizations/${id}`);
}

export function updateOrganization(id: number, payload: Partial<OrgPayload>) {
  return request<Organization>(`/api/organizations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteOrganization(id: number) {
  return request<null>(`/api/organizations/${id}`, { method: "DELETE" });
}

// ─── Members ─────────────────────────────────────────────────────────────────

export type OrgMember = {
  userId: number;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  joinedAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
  };
};

export function getMembers(orgId: number) {
  return request<OrgMember[]>(`/api/organizations/${orgId}/members`);
}

export function addMember(
  orgId: number,
  payload: { email: string; role: "ADMIN" | "MEMBER" | "VIEWER" },
) {
  return request<OrgMember>(`/api/organizations/${orgId}/members`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateMemberRole(
  orgId: number,
  userId: number,
  role: "ADMIN" | "MEMBER" | "VIEWER",
) {
  return request<OrgMember>(`/api/organizations/${orgId}/members/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

export function removeMember(orgId: number, userId: number) {
  return request<null>(`/api/organizations/${orgId}/members/${userId}`, {
    method: "DELETE",
  });
}

// ─── Workers ─────────────────────────────────────────────────────────────────

export type ContractType = "NEODREDJENO" | "ODREDJENO";
export type EmploymentStatus = "DRAFT" | "PRIJAVLJEN" | "ODJAVLJEN";

// Tip plate — određuje šta polje "salaryBruto"/"salaryNeto" predstavlja:
//   BRUTO        — salaryBruto je osnovica iz ugovora; neto raste sa stažom
//   NETO_UGOVOR  — salaryNeto je bazni ugovorni neto; stvarni neto raste sa stažom
//   NETO_ISPLATA — salaryNeto je ciljni take-home; osnovica se prilagođava da matematika izađe
// Default NETO_ISPLATA jer 90% klijenata u BiH plaća minimalac kao fiksan iznos.
export type SalaryType = "BRUTO" | "NETO_UGOVOR" | "NETO_ISPLATA";

export const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  BRUTO: "Bruto osnovica",
  NETO_UGOVOR: "Neto po ugovoru",
  NETO_ISPLATA: "Cilj neto za isplatu",
};

export const SALARY_TYPE_DESCRIPTIONS: Record<SalaryType, string> = {
  BRUTO: "Bruto plata iz ugovora; neto raste sa godinama staža.",
  NETO_UGOVOR:
    "Neto iz ugovora; radnik dobija povišicu za svaku godinu staža.",
  NETO_ISPLATA:
    "Radnik svaki mjesec prima isti iznos, bez obzira na godine staža.",
};

export type Worker = {
  id: number;
  organizationId: number;
  role: "VLASNIK" | "RADNIK";
  firstName: string;
  lastName: string;
  jmbg: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  idCardNumber: string | null;
  bankAccount: string | null;
  startDate: string | null;
  endDate: string | null;
  defaultStartTime: string | null;
  defaultEndTime: string | null;
  defaultDaysOff: string | null;
  defaultPause: string | null;
  // Employment / ugovor o radu
  position: string | null;
  // Tip plate određuje semantiku salaryBruto/salaryNeto. Vidi SalaryType.
  salaryType: SalaryType;
  salaryBruto: number | null;
  salaryNeto: number | null;
  contractType: ContractType | null;
  contractEndDate: string | null;
  probationMonths: number | null;
  noticePeriod: string | null;
  contractNumber: string | null;
  employmentStatus: EmploymentStatus;
  prijavaDate: string | null;
  odjavaDate: string | null;
  spol: "M" | "Z" | null;
  strucnaSpremaIdx: number | null;
  osnovOsiguranjaOpis: string | null;
  osnovOsiguranjaSifra: string | null;
  zanimanjeOpis: string | null;
  zanimanjeSifra: string | null;
  taxCoefficient: number;
  minuliRadRate: number;
  // Ukupan radni staž (za minuli rad). Dva opciona unosa — user bira jedan:
  //  • firstEmploymentDate — datum prvog zaposljenja ikada (kontinuirani staž)
  //  • priorWorkYears — staž prije naše firme u godinama (decimal, podržava prekide)
  // Ako je oboje, priorWorkYears ima prednost.
  firstEmploymentDate: string | null;
  priorWorkYears: number | null;
  overtimeRate: number;
  nightRate: number;
  sundayRate: number;
  holidayRate: number;
  defaultMealAllowance: number;
  defaultTravelExpense: number;
  // Dnevna stopa toplog obroka za radnika (override firme). NULL = naslijedi
  // od organizacije.
  mealAllowancePerDay: number | null;
  // Fiksni mjesečni putni trošak (naknada za prevoz). NE prati šihtericu.
  // NULL = bez auto-popune u obračunu.
  travelAllowancePerMonth: number | null;
  contractedHours: number;
  // Entitet prebivališta: 'FBIH' (default) ili 'RS'. RS radniku kantonalni dio
  // zdravstva/nezaposlenosti ide na Budžet RS (vidi rs-opcine.ts).
  prebivalisteEntitet: "FBIH" | "RS";
  opcinaKod: string | null;
  // Korist u naravi (službeno vozilo u privatne svrhe). Master konfiguracija
  // koristi se u mjesečnom obračunu (povećava osnovicu za doprinose i porez).
  koristVoziloAktivna: boolean;
  koristVoziloMetoda: string | null;
  koristVoziloVrijednost: number | null;
  koristVoziloSaPdv: boolean;
  koristVoziloOpis: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkerPayload = {
  firstName: string;
  lastName: string;
  role?: "VLASNIK" | "RADNIK";
  jmbg?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  idCardNumber?: string;
  bankAccount?: string;
  startDate?: string | null;
  endDate?: string | null;
  defaultStartTime?: string | null;
  defaultEndTime?: string | null;
  defaultDaysOff?: string | null;
  defaultPause?: string | null;
  // Employment
  position?: string | null;
  salaryType?: SalaryType;
  salaryBruto?: number | string | null;
  salaryNeto?: number | string | null;
  contractType?: ContractType | null;
  contractEndDate?: string | null;
  probationMonths?: number | null;
  noticePeriod?: string | null;
  contractNumber?: string | null;
  employmentStatus?: EmploymentStatus;
  prijavaDate?: string | null;
  odjavaDate?: string | null;
  spol?: "M" | "Z" | null;
  strucnaSpremaIdx?: number | null;
  osnovOsiguranjaOpis?: string | null;
  osnovOsiguranjaSifra?: string | null;
  zanimanjeOpis?: string | null;
  zanimanjeSifra?: string | null;
  taxCoefficient?: number | string | null;
  minuliRadRate?: number | string | null;
  firstEmploymentDate?: string | null;
  priorWorkYears?: number | string | null;
  overtimeRate?: number | string | null;
  nightRate?: number | string | null;
  sundayRate?: number | string | null;
  holidayRate?: number | string | null;
  contractedHours?: number | string | null;
  // Dnevna stopa toplog obroka za ovog radnika (override stope firme).
  mealAllowancePerDay?: number | string | null;
  // Fiksni mjesečni putni trošak (naknada za prevoz). Prazno/null = bez auto-popune.
  travelAllowancePerMonth?: number | string | null;
  // Entitet prebivališta (FBIH/RS) + šifra RS opštine.
  prebivalisteEntitet?: "FBIH" | "RS";
  opcinaKod?: string | null;
};

export function getWorkers(orgId: number) {
  return request<Worker[]>(`/api/organizations/${orgId}/workers`);
}

// ── Matična evidencija o radniku ────────────────────────────────────────────
export type EvidencijaItem = { n: number; label: string; value: string };
export type EvidencijaEditable = {
  key: string;
  label: string;
  type: string;
  value: string;
  placeholder: string;
};
export type EvidencijaData = {
  workerId: number;
  workerName: string;
  items: EvidencijaItem[];
  editable: EvidencijaEditable[];
  zadnjaIzmjena: string | null;
};

export function getEvidencija(orgId: number, workerId: number) {
  return request<EvidencijaData>(
    `/api/organizations/${orgId}/workers/${workerId}/evidencija`,
  );
}

export function saveEvidencija(
  orgId: number,
  workerId: number,
  evidencijaPodaci: Record<string, string>,
) {
  return request<{ evidencijaPodaci: Record<string, string> }>(
    `/api/organizations/${orgId}/workers/${workerId}/evidencija`,
    { method: "PATCH", body: JSON.stringify({ evidencijaPodaci }) },
  );
}

export async function downloadEvidencijaPdf(
  orgId: number,
  workerId: number,
  workerName: string,
): Promise<
  { ok: true; blob: Blob; filename: string } | { ok: false; error: string }
> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/organizations/${orgId}/workers/${workerId}/evidencija-pdf`,
      { credentials: "include" },
    );
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      return { ok: false, error: j?.error || `HTTP ${res.status}` };
    }
    const blob = await res.blob();
    const safe = workerName.trim().replace(/\s+/g, "_") || String(workerId);
    return { ok: true, blob, filename: `Maticna_evidencija_${safe}.pdf` };
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export type WorkerWithOrg = Worker & {
  organizationId: number;
  organizationName: string;
};

export function getAllMyWorkers() {
  return request<WorkerWithOrg[]>(`/api/organizations/workers/mine`);
}

export function createWorker(orgId: number, payload: WorkerPayload) {
  return request<Worker>(`/api/organizations/${orgId}/workers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateWorker(
  orgId: number,
  workerId: number,
  payload: Partial<WorkerPayload>,
) {
  return request<Worker>(`/api/organizations/${orgId}/workers/${workerId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteWorker(orgId: number, workerId: number) {
  return request<null>(`/api/organizations/${orgId}/workers/${workerId}`, {
    method: "DELETE",
  });
}

// ─── Contract counter (broj ugovora o radu) ──────────────────────────────────

export type ContractCounterResult = {
  number: string; // npr. "5/2026"
  year: number;
  next: number;
};

export function peekContractNumber(orgId: number, year?: number) {
  const qs = year ? `?year=${year}` : "";
  return request<ContractCounterResult>(
    `/api/organizations/${orgId}/contract-counter${qs}`,
  );
}

export function takeContractNumber(orgId: number, year?: number) {
  return request<ContractCounterResult>(
    `/api/organizations/${orgId}/contract-counter/take`,
    {
      method: "POST",
      body: JSON.stringify(year ? { year } : {}),
    },
  );
}

// ─── Worker documents (ugovori / otkazi / JS3100 arhiva) ─────────────────────

export type WorkerDocumentType =
  | "UGOVOR"
  | "OTKAZ"
  | "JS3100_PRIJAVA"
  | "JS3100_ODJAVA"
  | "RJESENJE_GO"
  | "RJESENJE_GO_SRAZMJERNI"
  | "ODLUKA_REGRES"
  | "ODLUKA_PRIGODNA_NAGRADA"
  | "RJESENJE_PLACENO_ODSUSTVO"
  | "RJESENJE_NEPLACENO_ODSUSTVO"
  | "POTVRDA_ZAPOSLENJE"
  | "POTVRDA_PLATA"
  | "POTVRDA_STAZ"
  | "ODLUKA_VOZILO"
  | "ANEKS_UGOVORA"
  | "ODLUKA_PROMJENA_PLATE"
  | "UPOZORENJE_OTKAZ"
  | "RJESENJE_PORODILJSKO"
  | "ODLUKA_OTPREMNINA"
  | "ODLUKA_TOPLI_OBROK";

export type WorkerDocumentFormat = "DOCX" | "PDF";

export type WorkerDocument = {
  id: number;
  workerId: number;
  organizationId: number;
  type: WorkerDocumentType;
  format: WorkerDocumentFormat;
  number: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number | null;
  createdAt: string;
};

/** Upload generisanog dokumenta. Šalje multipart/form-data. */
export async function uploadWorkerDocument(
  workerId: number,
  blob: Blob,
  meta: {
    type: WorkerDocumentType;
    format: WorkerDocumentFormat;
    number?: string;
    originalName: string;
  },
): Promise<{ ok: true; data: WorkerDocument } | { ok: false; error: string }> {
  const fd = new FormData();
  fd.append("file", blob, meta.originalName);
  fd.append("type", meta.type);
  fd.append("format", meta.format);
  if (meta.number) fd.append("number", meta.number);
  fd.append("originalName", meta.originalName);

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/workers/${workerId}/documents`,
      {
        method: "POST",
        body: fd,
        credentials: "include",
      },
    );
    const json = await res.json();
    return json as { ok: true; data: WorkerDocument } | { ok: false; error: string };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function listWorkerDocuments(workerId: number) {
  return request<WorkerDocument[]>(`/api/workers/${workerId}/documents`);
}

export function deleteWorkerDocument(docId: number) {
  return request<null>(`/api/workers/documents/${docId}`, { method: "DELETE" });
}

/** URL za direktan download (auth cookie se prosljeđuje). */
export function workerDocumentDownloadUrl(docId: number): string {
  return `${BACKEND_URL}/api/workers/documents/${docId}/download`;
}

// ─── Forms history ────────────────────────────────────────────────────────────

export type FormType =
  | "GPD"
  | "SPR"
  | "ZO3"
  | "UGOVOR" // ugovor o pozajmici (legacy)
  | "UOD"    // ugovor o djelu (Faza 3)
  | "SIH"
  | "PLDI"
  | "AMS"
  | "JS3100";
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
  // Faza 3B: backend sad vraća autora forme; koristi se za "Autor" kolonu kad
  // pregledamo team-shared forme.
  createdById: number | null;
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

// ─── Cities (lookup) ─────────────────────────────────────────────────────────

export type City = {
  id: number;
  name: string;
  municipalityCode: string;
  postalCode: string | null;
  kanton: string;
};

export function getCities() {
  return request<City[]>("/api/cities");
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
  city: string | null;
  idCardNumber: string | null;
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
  city?: string;
  idCardNumber?: string;
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

export function deletePersonClient(id: number) {
  return request<null>(`/api/clients/${id}`, { method: "DELETE" });
}

export function getAmortizacijaClients() {
  return request<PersonClient[]>("/api/clients/amortizacija");
}

// ─── Admin: sve organizacije ──────────────────────────────────────────────────

export type AdminOrgCreator = {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
};

export type AdminOrganization = {
  id: number;
  name: string;
  type: "COMPANY" | "BUSINESS";
  taxNumber: string | null;
  activityCode: string | null;
  activityName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  bankAccount: string | null;
  isClientOrg: boolean;
  createdById: number;
  createdBy: AdminOrgCreator | null;
  owner: OrgOwner | null;
  workerCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminOrgsListResponse = {
  items: AdminOrganization[];
  total: number;
  page: number;
  limit: number;
};

export function adminGetOrganizations(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  sp.set("page", String(params?.page ?? 1));
  sp.set("limit", String(params?.limit ?? 20));
  return request<AdminOrgsListResponse>(`/api/organizations/admin/all?${sp.toString()}`);
}

// ─── Admin: sva fizička lica ──────────────────────────────────────────────────

export type AdminPersonClient = PersonClient & {
  idCardNumber: string | null;
  createdBy: AdminOrgCreator | null;
};

export type AdminPersonClientsListResponse = {
  items: AdminPersonClient[];
  total: number;
  page: number;
  limit: number;
};

export function adminGetPersonClients(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams();
  if (params?.search) sp.set("search", params.search);
  sp.set("page", String(params?.page ?? 1));
  sp.set("limit", String(params?.limit ?? 20));
  return request<AdminPersonClientsListResponse>(`/api/clients/admin/all?${sp.toString()}`);
}

// Faza 3: payload prima organizationId — klijent se kreira kao team-shared
// kad je org-id poslat (svi članovi te org-e vide klijenta). Ako nije, klijent
// je "lični" (legacy ponašanje, vidi samo tvorac).
export function createAmortizacijaClient(payload: {
  firstName?: string;
  organizationId?: number | null;
}) {
  return request<PersonClient>("/api/clients/amortizacija", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
