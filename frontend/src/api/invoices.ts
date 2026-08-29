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

export type InvoiceType = "INVOICE" | "PROFORMA";
export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";

/**
 * Vrsta izlaznog dokumenta. Avansne + storno avansnih dijele A- seriju
 * brojeva, knjižne obavijesti imaju KO- seriju. Storno i KO ulaze u knjige
 * NEGATIVNO (iznosi u bazi su pozitivni, predznak nosi vrsta).
 */
export type InvoiceDocType =
  | "STANDARD"
  | "AVANSNA"
  | "STORNO_AVANSNE"
  | "KNJIZNA_OBAVIJEST"
  | "PAZAR"
  | "PDV_EVIDENCIJA";

export const DOC_TYPE_LABEL: Record<InvoiceDocType, string> = {
  STANDARD: "Faktura",
  AVANSNA: "Avansna faktura",
  STORNO_AVANSNE: "Storno avans",
  KNJIZNA_OBAVIJEST: "Knjižna obavijest",
  PAZAR: "Pazar",
  PDV_EVIDENCIJA: "PDV evidencija",
};

export type InvoiceItem = {
  id: number;
  invoiceId: number;
  ordinal: number;
  name: string;
  unit: string | null;
  quantity: string | number;
  unitPrice: string | number;
  discountPct: string | number;
  vatPct: string | number;
  netLine: string | number;
  discountLine: string | number;
  vatLine: string | number;
  grossLine: string | number;
};

// ── KIF klasifikacije (PDV evidencije) ──────────────────────────────────────
export type TipDokumentaKif =
  | "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09";
export type KifVrstaFakture =
  | "DOMACI_KUPAC"
  | "INOSTRANI_KUPAC"
  | "VANPOSLOVNE_SVRHE"
  | "OSTALO_NEOPOREZOVANO"
  | "GOTOVINSKA_UZ_RACUN"
  | "GOTOVINSKA_BEZ_RACUNA";
export type KifVrstaDokumenta =
  | "REDOVNA"
  | "AVANSNA"
  | "KNJIZNA_OBAVIJEST"
  | "STORNO_AVANSNE"
  | "OSTALO";
export type KifKpEntitet = "FBIH" | "RS" | "BD" | "NISTA";

export const TIPOVI_DOKUMENTA_KIF: { value: TipDokumentaKif; label: string }[] = [
  { value: "01", label: "01 · Faktura za robu i usluge iz zemlje" },
  { value: "02", label: "02 · Faktura za vlastitu potrošnju (vanposlovne svrhe)" },
  { value: "03", label: "03 · Avansna faktura (primljeni avansi)" },
  { value: "04", label: "04 · Izvozna faktura (JCI)" },
  { value: "05", label: "05 · Faktura za usluge izvršene stranom licu" },
  { value: "06", label: "06 · Umanjenje PDV po PDV-SL-2 obrascima" },
  { value: "07", label: "07 · Manjak (član 11. Pravilnika)" },
  { value: "08", label: "08 · Izvršene donacije" },
  { value: "09", label: "09 · Ostalo" },
];

export const KIF_VRSTE_FAKTURE: { value: KifVrstaFakture; label: string }[] = [
  { value: "DOMACI_KUPAC", label: "Domaći kupac" },
  { value: "INOSTRANI_KUPAC", label: "Inostrani kupac" },
  { value: "VANPOSLOVNE_SVRHE", label: "Vanposlovne svrhe" },
  { value: "OSTALO_NEOPOREZOVANO", label: "Ostalo neoporezovano" },
  { value: "GOTOVINSKA_UZ_RACUN", label: "Gotovinska naplata uz račun" },
  { value: "GOTOVINSKA_BEZ_RACUNA", label: "Gotovinska naplata bez računa" },
];

export const KIF_VRSTE_DOKUMENTA: { value: KifVrstaDokumenta; label: string }[] = [
  { value: "REDOVNA", label: "Redovna faktura" },
  { value: "AVANSNA", label: "Avansna faktura" },
  { value: "KNJIZNA_OBAVIJEST", label: "Knjižna obavijest" },
  { value: "STORNO_AVANSNE", label: "Storno avansne fakture" },
  { value: "OSTALO", label: "Ostalo" },
];

export type Invoice = {
  id: number;
  userId: number;
  organizationId: number | null;
  clientId: number | null;
  type: InvoiceType;
  /** STANDARD | AVANSNA | STORNO_AVANSNE | KNJIZNA_OBAVIJEST */
  docType: InvoiceDocType;
  /** storno → avansna koju stornira; KO → izvorna faktura */
  linkedInvoiceId: number | null;
  /** broj izvornog dokumenta (uz linkedInvoiceId), popunjava backend */
  linkedFullNumber?: string | null;
  /** avansna: id i broj njenog storna ako postoji (već stornirana) */
  stornoInvoiceId?: number | null;
  stornoFullNumber?: string | null;
  year: number;
  sequence: number;
  fullNumber: string;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  applyVat: boolean;
  /** vrsta isporuke za KIF/PDV prijavu */
  vrstaIsporuke: "OPOREZIVA" | "IZVOZ" | "OSLOBODJENA";
  /** KIF klasifikacije; null = izvedeno iz vrste isporuke */
  kifTipDokumenta: TipDokumentaKif | null;
  kifVrstaFakture: KifVrstaFakture | null;
  kifVrstaDokumenta: KifVrstaDokumenta | null;
  /** NISTA = izričito bez KP; null = automatski (kupac bez PDV broja) */
  kifKpEntitet: KifKpEntitet | null;
  kifKpIznos: string | null;
  /** izvozna faktura (tip 04): jedinstvena carinska isprava */
  kifJciBroj: string | null;
  kifJciDatum: string | null;
  currency: "BAM" | "EUR";
  status: InvoiceStatus;
  emailSentAt: string | null;
  emailSentTo: string | null;

  sellerName: string;
  sellerAddress: string | null;
  sellerCity: string | null;
  sellerPhone: string | null;
  sellerEmail: string | null;
  sellerTaxNumber: string | null;
  sellerVatNumber: string | null;
  sellerBankAccount: string | null;
  sellerLogoUrl: string | null;

  buyerName: string;
  buyerAddress: string | null;
  buyerCity: string | null;
  buyerPostalCode: string | null;
  buyerPhone: string | null;
  buyerEmail: string | null;
  buyerIdNumber: string | null;
  buyerVatNumber: string | null;

  netTotal: string | number;
  discountTotal: string | number;
  vatTotal: string | number;
  grossTotal: string | number;

  notes: string | null;
  convertedFromProformaId: number | null;
  convertedToInvoiceId?: number | null;
  convertedToFullNumber?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
};

export type CreateInvoicePayload = {
  type: InvoiceType;
  /** direktno se kreira samo STANDARD ili AVANSNA (storno/KO idu iz dokumenta) */
  docType?: "STANDARD" | "AVANSNA";
  applyVat: boolean;
  vrstaIsporuke?: "OPOREZIVA" | "IZVOZ" | "OSLOBODJENA";
  currency?: "BAM" | "EUR";
  issueDate?: string;
  dueDate?: string | null;
  notes?: string | null;
  saveBuyerAsClient?: boolean;
  buyerKind?: "PERSON" | "COMPANY";
  seller: {
    organizationId?: number | null;
    name: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
    taxNumber?: string | null;
    vatNumber?: string | null;
    bankAccount?: string | null;
    logoUrl?: string | null;
  };
  buyer: {
    clientId?: number | null;
    name: string;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    phone?: string | null;
    email?: string | null;
    idNumber?: string | null;
    vatNumber?: string | null;
  };
  items: Array<{
    name: string;
    unit?: string | null;
    quantity: number;
    unitPrice: number;
    discountPct?: number;
    vatPct?: number;
  }>;
};

export function listInvoices(params?: {
  type?: InvoiceType;
  status?: InvoiceStatus;
  year?: number;
  /** PK Office: samo fakture jedne (aktivne) organizacije */
  organizationId?: number;
}) {
  const q = new URLSearchParams();
  if (params?.type) q.set("type", params.type);
  if (params?.status) q.set("status", params.status);
  if (params?.year) q.set("year", String(params.year));
  if (params?.organizationId) q.set("organizationId", String(params.organizationId));
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return request<Invoice[]>(`/api/invoices${suffix}`);
}

export function getInvoice(id: number) {
  return request<Invoice>(`/api/invoices/${id}`);
}

export function createInvoice(payload: CreateInvoicePayload) {
  return request<Invoice>("/api/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function patchInvoice(
  id: number,
  body: {
    status?: InvoiceStatus;
    paidAt?: string | null;
    notes?: string | null;
    kifTipDokumenta?: TipDokumentaKif;
    kifVrstaFakture?: KifVrstaFakture;
    kifVrstaDokumenta?: KifVrstaDokumenta;
    kifKpEntitet?: KifKpEntitet | null;
    kifKpIznos?: number | null;
    kifJciBroj?: string | null;
    kifJciDatum?: string | null;
  },
) {
  return request<Invoice>(`/api/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// Puni edit sadržaja fakture/predračuna (kupac, stavke, iznosi) uz ponovni
// obračun; fiskalni broj ostaje isti. Dozvoljeno samo za nenaplaćene standardne
// dokumente (backend vraća 409 sa razlogom ako nije dozvoljeno).
export function updateInvoiceContent(id: number, payload: CreateInvoicePayload) {
  return request<Invoice>(`/api/invoices/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteInvoice(id: number) {
  return request<null>(`/api/invoices/${id}`, { method: "DELETE" });
}

export function convertProformaToInvoice(id: number) {
  return request<Invoice>(`/api/invoices/${id}/convert`, { method: "POST" });
}

/** Storno postojeće avansne fakture (jedan storno po avansnoj). */
export function stornoAvansneFakture(
  id: number,
  body?: { issueDate?: string; note?: string },
) {
  return request<Invoice>(`/api/invoices/${id}/storno-avans`, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

/**
 * Zbirno mjesečno knjiženje pazara u KIF (gotovinski promet, PDV 17/117
 * iz bruto iznosa). Čista PDV evidencija, ne stvara potraživanje.
 */
export function proknjiziPazar(body: {
  organizationId: number;
  month?: number;
  year?: number;
  /** dnevni unos pazara: ISO datum umjesto month/year */
  datum?: string;
  /** bruto pazar sa PDV-om */
  iznos: number;
  brojDokumenta?: string;
  note?: string;
  /** upiši isti iznos i u TKM (trgovačka knjiga na malo) */
  uTkm?: boolean;
}) {
  return request<Invoice>("/api/invoices/pazar", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Direktno "samo PDV" knjiženje u KIF (ogledalo KUF opcije "samo PDV
 * evidencija"): osnovica i ukupno 0, samo izlazni PDV. Glavni slučaj je
 * posebna šema u građevinarstvu (čl. 40).
 */
export function proknjiziKifPdv(body: {
  organizationId: number;
  partnerId: number;
  /** ISO datum knjiženja (kad je PDV uplaćen) */
  datum: string;
  pdvIznos: number;
  brojDokumenta: string;
  note?: string;
}) {
  return request<Invoice>("/api/invoices/kif-pdv", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Knjižna obavijest (umanjenje) uz postojeću standardnu fakturu. */
export function izdajKnjiznuObavijest(
  id: number,
  body: { iznos: number; razlog?: string; issueDate?: string },
) {
  return request<Invoice>(`/api/invoices/${id}/knjizna-obavijest`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function emailInvoice(id: number, body: { to?: string; message?: string }) {
  return request<{ sentTo: string }>(`/api/invoices/${id}/email`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function invoicePdfUrl(id: number, currency?: "BAM" | "EUR") {
  const q = currency ? `?currency=${currency}` : "";
  return `${BACKEND_URL}/api/invoices/${id}/pdf${q}`;
}

// Otvori/preuzmi PDF (uz cookie auth). currency = opciona protuvaluta.
export async function downloadInvoicePdf(
  id: number,
  filename?: string,
  currency?: "BAM" | "EUR",
) {
  const q = currency ? `?currency=${currency}` : "";
  const res = await fetch(`${BACKEND_URL}/api/invoices/${id}/pdf${q}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `Faktura-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Logo upload za organizaciju ────────────────────────────────────────────
export async function uploadOrganizationLogo(
  orgId: number,
  file: File,
): Promise<ApiResponse<{ id: number; logoUrl: string }>> {
  const fd = new FormData();
  fd.append("logo", file);
  try {
    const res = await fetch(`${BACKEND_URL}/api/organizations/${orgId}/logo`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const json = (await res.json().catch(() => null)) as
      | ApiResponse<{ id: number; logoUrl: string }>
      | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export function removeOrganizationLogo(orgId: number) {
  return request<{ id: number; logoUrl: null }>(`/api/organizations/${orgId}/logo`, {
    method: "DELETE",
  });
}

// ── Memorandum klijenta (slika zaglavlja platne liste) ─────────────────────
export async function uploadOrganizationMemorandum(
  orgId: number,
  file: File,
): Promise<ApiResponse<{ id: number; memorandumUrl: string }>> {
  const fd = new FormData();
  fd.append("memorandum", file);
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/organizations/${orgId}/memorandum`,
      {
        method: "POST",
        credentials: "include",
        body: fd,
      },
    );
    const json = (await res.json().catch(() => null)) as
      | ApiResponse<{ id: number; memorandumUrl: string }>
      | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export function removeOrganizationMemorandum(orgId: number) {
  return request<{ id: number; memorandumUrl: null }>(
    `/api/organizations/${orgId}/memorandum`,
    { method: "DELETE" },
  );
}

export function backendUrl() {
  return BACKEND_URL;
}
