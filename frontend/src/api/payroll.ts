import { type ApiResponse } from "src/api/auth";
import { trackEvent } from "src/api/activity";
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
  proRateFactor: number | null;
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

  // Korist u naravi (službeno vozilo). koristNetValue = V (neto sa porezom),
  // koristBruto = grossovana korist (dio osnovice). gross uključuje koristBruto.
  koristNetValue: number;
  koristBruto: number;

  mealAllowance: number;
  vacationBonus: number;
  travelExpense: number;

  // Obustave na platu (rate kredita i sl.): umanjuju samo iznos za isplatu,
  // ne diraju neto/doprinose/porez. Stavke su snapshot za platni listić.
  obustave: number;
  obustaveStavke: { naziv: string; iznos: number }[] | null;

  totalCost: number;

  bankAccount: string | null;
  status: PayrollStatus;
  // Uvezeni obračun (ranija plata iz drugog programa, samo za GIP). Pravi
  // obračun ga resetuje na false.
  imported: boolean;
  paymentDate: string | null;
  /** kad je MIP-1023 XML za mjesec preuzet (markMipDownloaded) */
  mipDownloadedAt?: string | null;
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
  obustave?: number;
  obustaveStavke?: { naziv: string; iznos: number }[] | null;
  // Pro-rate factor 0..1 — koristi se za mid-month prijavu/odjavu radnika
  // i vlasnika. Backend skalira osnovicu, minuli rad i min doprinosnu osnovu.
  // Default 1 (puni mjesec). Vidi computeProRateFactor u ObracunPlata.tsx.
  proRateFactor?: number;
  // Ciljni neto za isplatu (NETO_ISPLATA) — backend fening-search prilagodi
  // bruto osnovicu da finalni neto padne tačno na ovaj iznos.
  targetNet?: number;
  notes?: string | null;
  // Korist u naravi (službeno vozilo). Per-radnik konfiguracija; backend računa
  // vrijednost koristi i grossuje je u osnovicu (povećava doprinose i porez, ne neto).
  koristVoziloAktivna?: boolean;
  koristVoziloMetoda?: string;
  koristVoziloVrijednost?: number;
  koristVoziloSaPdv?: boolean;
  koristVoziloOpis?: string | null;
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

// Svi obračuni organizacije za godinu (godišnji pregled po mjesecima).
export function listYearPayrolls(organizationId: number, year: number) {
  const sp = new URLSearchParams({
    organizationId: String(organizationId),
    year: String(year),
  });
  return request<Payroll[]>(`/api/payroll?${sp.toString()}`);
}

// Svi obračuni jednog radnika za godinu (karton radnika po mjesecima).
export function listWorkerPayrolls(
  organizationId: number,
  year: number,
  workerId: number,
) {
  const sp = new URLSearchParams({
    organizationId: String(organizationId),
    year: String(year),
    workerId: String(workerId),
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
  obustave?: number;
  obustaveStavke?: { naziv: string; iznos: number }[] | null;
  taxCoefficient?: number;
  minuliRadRate?: number;
  koristVoziloAktivna?: boolean;
  koristVoziloMetoda?: string;
  koristVoziloVrijednost?: number;
  koristVoziloSaPdv?: boolean;
  koristVoziloOpis?: string | null;
};

export function savePayrollInputs(payload: SaveInputsPayload) {
  return request<Payroll>(`/api/payroll/save-inputs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Uvoz ranijih plata (za GIP) ─────────────────────────────────────────────
// Jedan red po (radnik, mjesec). compute mod: bruto + koeficijent, motor
// izračuna ostalo. manual mod: override literalnih iznosa.
export type ImportPayrollRow = {
  workerId: number;
  month: number;
  gross: number;
  taxCoefficient?: number;
  // Datum isplate (YYYY-MM-DD). Default zadnji dan mjeseca ako se ne pošalje.
  paymentDate?: string;
  mode?: "manual";
  empPio?: number;
  empZdravstvo?: number;
  empNezaposlenost?: number;
  deduction?: number;
  taxBase?: number;
  incomeTax?: number;
  net?: number;
};

export type ImportPayrollResult = {
  created: number;
  updated: number;
  skipped: Array<{ workerId: number | null; month: number | null; reason: string }>;
};

export function importPayrolls(payload: {
  organizationId: number;
  year: number;
  rows: ImportPayrollRow[];
}) {
  return request<ImportPayrollResult>(`/api/payroll/import`, {
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

// Zabilježi da je MIP-1023 XML za (org, year, month) preuzet. XML se generiše
// client-side pa backend sam ne vidi download; zove se nakon preuzimanja.
export function markMipDownloaded(payload: {
  organizationId: number;
  year: number;
  month: number;
}) {
  return request<{ updated: number }>(`/api/payroll/mark-mip-downloaded`, {
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
  obustave: number;
  obustaveStavke: { naziv: string; iznos: number }[] | null;
  status: PayrollStatus;
};

export type MonthlySummary = {
  organizationId: number;
  year: number;
  month: number;
  // Agencijska opcija: kantonalne uplatnice objedinjene po kantonu.
  combineKantonal?: boolean;
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
    obustave: number;
    // Neto + dodaci - obustave: novac koji stvarno ide radnicima.
    zaIsplatu: number;
    totalCost: number;
  };
  uplatnice: MonthlyUplatnicaSummary[];
  perWorker: MonthlyPerWorker[];
};

// Agencijska opcija: objedini kantonalne uplatnice po kantonu (sve org-e).
export function setCombineKantonal(combineKantonal: boolean) {
  return request<{ combineKantonal: boolean }>(
    "/api/payroll/combine-kantonal",
    { method: "PUT", body: JSON.stringify({ combineKantonal }) },
  );
}

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
  | {
 ok: true; blob: Blob; filename: string; pageCount: number }
  | { ok: false; error: string }
> {
  // statistika generisanja (admin Aktivnost); best-effort, ne blokira
  trackEvent("PLATNI_LISTIC_GENERATE", "Platni listići mjeseca", organizationId);
  // statistika generisanja (admin Aktivnost); best-effort, ne blokira
  trackEvent("UPLATNICE_GENERATE", "Zbirne uplatnice", organizationId);
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

// ── Izvoz naloga za e-bankarstvo ────────────────────────────────────────────

export type BankExportProfil = "halcom" | "unicredit" | "elba" | "raiffeisen";

export type BankExportPreskocen = {
  radnik: string;
  stavka: string;
  iznosKm: number;
  razlog: string;
};

export type BankExportDatoteka = {
  fileName: string;
  base64: string;
  /** Raiffeisen: koji paket i pod kojom vrstom/svrhom se uvozi; ostale banke null */
  naslov: string | null;
  brojNaloga: number;
  ukupnoKm: number;
};

export type BankExportRezultat = {
  /** prva (ili jedina) datoteka; kompletna lista je u datoteke[] */
  fileName: string;
  base64: string;
  /** sve datoteke izvoza: Raiffeisen se dijeli po paketu (doprinosi, plate,
   * topli obrok, prevoz, regres), ostale banke imaju jednu. Opcionalno jer
   * odgovor servera od prije deploya nema ovo polje (klijent tada koristi
   * fileName/base64 iznad). */
  datoteke?: BankExportDatoteka[];
  /** nalozi koji NISU u datoteci (npr. radnik bez žiro računa) + razlog */
  preskoceni: BankExportPreskocen[];
  meta: {
    profil: BankExportProfil;
    brojNaloga: number;
    brojDatoteka: number;
    ukupnoKm: number;
  };
};

// Datoteka sa nalozima mjeseca za uvoz u e-bankarstvo (isti nalozi kao zbirne
// uplatnice, format po izabranoj banci). datumValute je ISO YYYY-MM-DD.
// banka = izbor sa ekrana (bbi/asa/sparkasse dijele elba profil); server ga
// po uspjehu pamti na organizaciji za predpopunu sljedećeg izvoza.
export async function bankExport(payload: {
  organizationId: number;
  year: number;
  month: number;
  datumValute: string;
  profil: BankExportProfil;
  banka?: string;
}): Promise<ApiResponse<BankExportRezultat>> {
  const r = await request<BankExportRezultat>("/api/payroll/bank-export", {
    method: "POST",
    body: JSON.stringify({
      orgId: payload.organizationId,
      year: payload.year,
      month: payload.month,
      datumValute: payload.datumValute,
      profil: payload.profil,
      banka: payload.banka,
    }),
  });
  if (r.ok) {
    // statistika generisanja (admin Aktivnost); best-effort, ne blokira
    trackEvent(
      "IZVOZ_BANKA_GENERATE",
      "Izvoz naloga za e-bankarstvo",
      payload.organizationId,
    );
  }
  return r;
}

// ── Štampa naloga na matričnom pisaču ───────────────────────────────────────

export type StampaNalog = {
  rb: number;
  tip: "javniPrihod" | "prenos";
  naziv: string;
  mjesto: string;
  racun: string;
  svrha: string;
  iznosKm: number;
  jib: string;
  vrstaPrihoda: string;
  opcina: string;
  budzetskaOrganizacija: string;
  pozivNaBroj: string;
  /** ISO YYYY-MM-DD, prazno za prenos naloge */
  periodOd: string;
  periodDo: string;
};

export type StampaNalozi = {
  platilac: { racun: string; naziv: string; adresa: string; mjesto: string };
  datumValute: string;
  nalozi: StampaNalog[];
  preskoceni: BankExportPreskocen[];
};

// Nalozi mjeseca kao JSON (isti nalozi kao uplatnice i izvoz, bez formatiranja)
// za pregled i ESC/P štampu na matričnom pisaču. Objedinjavanje kantonalnih
// prati postavku korisnika, kao i kod izvoza.
export async function naloziZaStampu(payload: {
  organizationId: number;
  year: number;
  month: number;
  /** ISO YYYY-MM-DD */
  datumValute: string;
}): Promise<ApiResponse<StampaNalozi>> {
  return request<StampaNalozi>("/api/payroll/nalozi-za-stampu", {
    method: "POST",
    body: JSON.stringify({
      orgId: payload.organizationId,
      year: payload.year,
      month: payload.month,
      datumValute: payload.datumValute,
    }),
  });
}

// Mjesečni platni listići — kombinovani PDF (jedna stranica po radniku)
export async function generateMonthlyPayslips(
  organizationId: number,
  year: number,
  month: number,
  paymentDate?: string,
): Promise<
  | {
 ok: true; blob: Blob; filename: string; pageCount: number }
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

// ── Konta za nalog za knjiženje (agencijska konvencija) ─────────────────────
export type PostingItem = { key: string; label: string };
export type PostingAccount = { d: string; p: string | null };
export type PostingAccountsData = {
  items: PostingItem[];
  burdenItems: PostingItem[];
  defaults: Record<string, PostingAccount>;
  overrides: Record<string, Partial<PostingAccount>>;
  resolved: Record<string, PostingAccount>;
  splitByContribution: boolean;
};

export function getPostingAccounts() {
  return request<PostingAccountsData>("/api/payroll/posting-accounts");
}

export function savePostingAccounts(
  postingAccounts: Record<string, Partial<PostingAccount>>,
  splitByContribution: boolean,
) {
  return request<{
    overrides: Record<string, Partial<PostingAccount>>;
    splitByContribution: boolean;
  }>("/api/payroll/posting-accounts", {
    method: "PUT",
    body: JSON.stringify({ postingAccounts, splitByContribution }),
  });
}

// Nalog za knjiženje plate (PDF). Doprinosi iz+na osnovicu zbirno po vrsti,
// bez bruto reda. Vraća { ok, blob, filename }.
export async function generatePostingOrder(
  organizationId: number,
  year: number,
  month: number,
  datumKnjizenja?: string,
): Promise<
  {
 ok: true; blob: Blob; filename: string } | { ok: false; error: string }
> {
  // statistika generisanja (admin Aktivnost); best-effort, ne blokira
  trackEvent("NALOG_KNJIZENJE_GENERATE", "Nalog za knjiženje", organizationId);
  try {
    const res = await fetch(`${BACKEND_URL}/api/payroll/posting-order`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, year, month, datumKnjizenja }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      return { ok: false, error: j?.error || `HTTP ${res.status}` };
    }
    const blob = await res.blob();
    const filename = `Nalog_za_knjizenje_${String(month).padStart(2, "0")}_${year}.pdf`;
    return { ok: true, blob, filename };
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
// Uz `toEmail`: umjesto svakom radniku, SVI listići mjeseca idu u jednom
// PDF-u na tu adresu (npr. email firme za štampu i ručno uručenje).
export type BulkEmailPayslipsResult =
  | {
      ok: true;
      sent: number;
      skipped: Array<{ workerId: number; name: string; reason: string }>;
      failed: Array<{ workerId: number; name: string; reason: string }>;
      totalProcessed: number;
      /** "single" kad je sve poslano u jednom PDF-u na jednu adresu */
      mode?: "single";
      sentTo?: string;
      /** broj listića u poslanom PDF-u (single mod) */
      count?: number;
    }
  | { ok: false; error: string };

export async function emailMonthlyPayslipsBulk(
  organizationId: number,
  year: number,
  month: number,
  paymentDate?: string,
  toEmail?: string,
): Promise<BulkEmailPayslipsResult> {
  const res = await request<{
    sent: number;
    skipped: Array<{ workerId: number; name: string; reason: string }>;
    failed: Array<{ workerId: number; name: string; reason: string }>;
    totalProcessed: number;
    mode?: "single";
    sentTo?: string;
    count?: number;
  }>(`/api/payroll/email-payslips-bulk`, {
    method: "POST",
    body: JSON.stringify({ organizationId, year, month, paymentDate, toEmail }),
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, ...res.data };
}

// Pojedinačni platni listić za jednog radnika (po payrollId)
export async function generateWorkerPayslip(
  payrollId: number,
  paymentDate?: string,
  organizationId?: number | null,
): Promise<{ ok: true; blob: Blob; filename: string } | { ok: false; error: string }> {
  // statistika generisanja (admin Aktivnost); best-effort, ne blokira
  trackEvent("PLATNI_LISTIC_GENERATE", "Platni listić radnika", organizationId);
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
