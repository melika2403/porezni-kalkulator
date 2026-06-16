import type { ApiResponse } from "src/api/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";

export type PartnerStats = {
  totalIn: number;
  totalOut: number;
  txCount: number;
  lastDate: string | null;
  /** otvorene (izdane nenaplaćene) fakture prema partneru: njihov dug */
  openInvoicesTotal: number;
  openInvoicesCount: number;
  /** sve fakture (izdane + naplaćene): dugovna strana kupca */
  invoicesTotal: number;
  /** otvoreni ulazni računi dobavljača: naš dug */
  openPayablesTotal: number;
  openPayablesCount: number;
  /** ukupan broj proknjiženih ulaznih računa (i plaćenih) */
  racuniCount: number;
  /** svi ulazni računi: potražna strana dobavljača */
  racuniTotal: number;
};

export type Partner = {
  id: number;
  organizationId: number;
  /** šifra partnera (redni broj u organizaciji), prikaz "0003" */
  code: number | null;
  name: string;
  jib: string | null;
  pdvBroj: string | null;
  address: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  accounts: string[];
  isKupac: boolean;
  isDobavljac: boolean;
  note: string | null;
  stats: PartnerStats;
};

export type PartnerPayload = {
  name: string;
  jib?: string;
  pdvBroj?: string;
  address?: string;
  city?: string;
  email?: string;
  phone?: string;
  accounts?: string[];
  // tip se ne bira ručno: kupac/dobavljač se izvodi iz prometa i faktura
  isKupac?: boolean;
  isDobavljac?: boolean;
  note?: string;
};

export type PartnerSuggestion = {
  source: "statement" | "invoice";
  name: string;
  account: string | null;
  jib: string | null;
  address?: string | null;
  city?: string | null;
  email?: string | null;
  isKupac: boolean;
  isDobavljac: boolean;
  txCount: number;
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

export function listPartners(orgId: number) {
  return jsonRequest<Partner[]>(`/api/partners/${orgId}`, { method: "GET" });
}

export function partnerSuggestions(orgId: number) {
  return jsonRequest<{
    fromStatements: PartnerSuggestion[];
    fromInvoices: PartnerSuggestion[];
  }>(`/api/partners/${orgId}/suggestions`, { method: "GET" });
}

export function createPartner(orgId: number, payload: PartnerPayload) {
  return jsonRequest<Partner & { linked: number }>(`/api/partners/${orgId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePartner(
  orgId: number,
  partnerId: number,
  payload: PartnerPayload,
) {
  return jsonRequest<Partner & { linked: number }>(
    `/api/partners/${orgId}/${partnerId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export function deletePartner(orgId: number, partnerId: number) {
  return jsonRequest<null>(`/api/partners/${orgId}/${partnerId}`, {
    method: "DELETE",
  });
}

// ── Ulazni računi (fakture dobavljača) ──────────────────────────────────────

export type UlazniRacunStatus = "OTVOREN" | "PLACEN";

export type UlazniRacun = {
  id: number;
  organizationId: number;
  partnerId: number;
  brojRacuna: string;
  datumRacuna: string;
  rokPlacanja: string | null;
  iznos: string; // DECIMAL stiže kao string
  pdvIznos: string | null;
  status: UlazniRacunStatus;
  paidAt: string | null;
  note: string | null;
  partner?: { id: number; name: string };
};

export type UlazniRacunPayload = {
  partnerId: number;
  brojRacuna: string;
  datumRacuna: string; // YYYY-MM-DD
  rokPlacanja?: string | null;
  iznos: number;
  pdvIznos?: number | null;
  note?: string;
};

export function createUlazniRacun(orgId: number, payload: UlazniRacunPayload) {
  return jsonRequest<UlazniRacun & { matched: boolean }>(
    `/api/partners/${orgId}/ulazni-racuni`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function updateUlazniRacun(
  orgId: number,
  racunId: number,
  patch: Partial<Omit<UlazniRacunPayload, "partnerId">> & {
    status?: UlazniRacunStatus;
    paidAt?: string;
  },
) {
  return jsonRequest<UlazniRacun>(
    `/api/partners/${orgId}/ulazni-racuni/${racunId}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

export function deleteUlazniRacun(orgId: number, racunId: number) {
  return jsonRequest<null>(`/api/partners/${orgId}/ulazni-racuni/${racunId}`, {
    method: "DELETE",
  });
}

// ── Kartica partnera ────────────────────────────────────────────────────────

export type KarticaTransaction = {
  id: number;
  date: string | null;
  description: string | null;
  amount: string;
  direction: "IN" | "OUT";
  status: "UNMATCHED" | "CONFIRMED" | "IGNORED";
  category: string | null;
  ulazniRacunId: number | null;
  statement?: {
    id: number;
    statementNumber: string | null;
    bankName: string | null;
  } | null;
};

export type KarticaInvoice = {
  id: number;
  fullNumber: string;
  buyerName: string;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  grossTotal: string;
  status: string;
};

export type KarticaData = {
  partner: Partner;
  transactions: KarticaTransaction[];
  invoices: KarticaInvoice[];
  ulazniRacuni: UlazniRacun[];
  totals: {
    totalIn: number;
    totalOut: number;
    openInvoicesTotal: number;
    openPayablesTotal: number;
  };
};

export function getPartnerKartica(orgId: number, partnerId: number) {
  return jsonRequest<KarticaData>(
    `/api/partners/${orgId}/${partnerId}/kartica`,
    { method: "GET" },
  );
}

export type KarticaType = "kupac" | "dobavljac";

export type KarticaPeriod = { from?: string | null; to?: string | null };

/** Preuzmi PDF kartice prometa (kupca ili dobavljača).
 *  Bez perioda se štampa cijeli period prometa. */
export async function downloadKarticaPdf(
  orgId: number,
  partnerId: number,
  type: KarticaType,
  period: KarticaPeriod = {},
): Promise<{ ok: true; blob: Blob; filename: string } | { ok: false; error: string }> {
  try {
    const sp = new URLSearchParams({ type });
    if (period.from) sp.set("from", period.from);
    if (period.to) sp.set("to", period.to);
    const res = await fetch(
      `${BACKEND_URL}/api/partners/${orgId}/${partnerId}/kartica.pdf?${sp.toString()}`,
      { method: "GET", credentials: "include" },
    );
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return { ok: false, error: json?.error ?? `HTTP ${res.status}` };
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") ?? "";
    const m = cd.match(/filename="([^"]+)"/);
    return { ok: true, blob, filename: m?.[1] ?? `Kartica_${type}.pdf` };
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

/** Pošalji karticu prometa na email partnera. */
export function emailKartica(
  orgId: number,
  partnerId: number,
  type: KarticaType,
  period: KarticaPeriod = {},
) {
  return jsonRequest<{ sentTo: string }>(
    `/api/partners/${orgId}/${partnerId}/kartica/email`,
    {
      method: "POST",
      body: JSON.stringify({
        type,
        from: period.from || undefined,
        to: period.to || undefined,
      }),
    },
  );
}
