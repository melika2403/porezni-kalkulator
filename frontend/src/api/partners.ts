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

/** Lista partnera; year filtrira promet/aktivnost (dugovi su uvijek živi). */
export function listPartners(orgId: number, year?: number | null) {
  const qs = year ? `?year=${year}` : "";
  return jsonRequest<Partner[]>(`/api/partners/${orgId}${qs}`, {
    method: "GET",
  });
}

export function partnerSuggestions(orgId: number) {
  return jsonRequest<{
    fromStatements: PartnerSuggestion[];
    fromInvoices: PartnerSuggestion[];
  }>(`/api/partners/${orgId}/suggestions`, { method: "GET" });
}

/** "Nije partner": trajno skrij prijedlog (prepoznaje se po računu/nazivu). */
export function hidePartnerSuggestion(
  orgId: number,
  payload: { account?: string | null; name?: string | null },
) {
  return jsonRequest<{ hidden: number }>(
    `/api/partners/${orgId}/suggestions/hide`,
    { method: "POST", body: JSON.stringify(payload) },
  );
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

// ── grupni uvoz partnera (Com_Soft XML/CSV) ──
export type UvozPartneraResult = {
  ukupno: number;
  dodano: number;
  /** uvezeni bez ID broja (JIB): treba ih dopuniti prije KUF/KIF upotrebe */
  bezIdBroja: number;
  vezanoTransakcija: number;
  preskocenoUkupno: number;
  /** lista je ograničena server-side (max 300 stavki) */
  preskoceno: { sifra: string; naziv: string; razlog: string }[];
};

export function uvozPartnera(
  orgId: number,
  partneri: {
    sifra?: string;
    naziv: string;
    jib?: string;
    pdvBroj?: string;
    adresa?: string;
    mjesto?: string;
    telefon?: string;
    email?: string;
    racuni?: string[];
  }[],
) {
  return jsonRequest<UvozPartneraResult>(`/api/partners/${orgId}/uvoz`, {
    method: "POST",
    body: JSON.stringify({ partneri }),
  });
}

// ── Ukupni promet kupaca/dobavljača (izvještaj) ──────────────────────────────
export type PrometType = "kupac" | "dobavljac" | "svi";

export type PrometRow = {
  id: number;
  code: number | null;
  name: string;
  /** type kupac/dobavljac */
  duguje?: number;
  potrazuje?: number;
  saldo?: number;
  /** type svi: saldo kupca (fakture - uplate) i dobavljača (računi - plaćanja) */
  njihovDug?: number;
  nasDug?: number;
  razlika?: number;
};

export function prometPartnera(
  orgId: number,
  params: { type: PrometType; from?: string; to?: string },
) {
  const sp = new URLSearchParams({ type: params.type });
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  return jsonRequest<{
    type: PrometType;
    from: string;
    to: string;
    rows: PrometRow[];
  }>(`/api/partners/${orgId}/promet?${sp.toString()}`, { method: "GET" });
}

// ── Ulazni računi (fakture dobavljača) ──────────────────────────────────────

export type UlazniRacunStatus = "OTVOREN" | "PLACEN";
/** KUF vrsta fakture: domaći dobavljač, uvoz, ili poljoprivrednik (paušal) */
export type VrstaNabavke = "DOMACA" | "UVOZ" | "OD_NEOBVEZNIKA";
/** KUF tip dokumenta po UINO evidencijama */
export type TipDokumentaKuf =
  | "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09";
export type VrstaDokumenta =
  | "REDOVNA"
  | "AVANSNA"
  | "KNJIZNA_OBAVIJEST"
  | "STORNO_AVANSNE"
  | "PDV_NA_CEKANJU"
  | "OSTALO";
export type KpEntitet = "FBIH" | "RS" | "BD";

export const TIPOVI_DOKUMENTA_KUF: { value: TipDokumentaKuf; label: string }[] = [
  { value: "01", label: "01 · Ulazna faktura za robu i usluge iz zemlje" },
  { value: "02", label: "02 · Faktura za vlastitu potrošnju (vanposlovne svrhe)" },
  { value: "03", label: "03 · Avansna faktura (dati avansi)" },
  { value: "04", label: "04 · Uvozna faktura (JCI)" },
  { value: "05", label: "05 · Faktura za usluge primljene iz inostranstva" },
  { value: "06", label: "06 · Naknadna umanjenja i primljeni popusti" },
  { value: "07", label: "07 · Ispravak odbitka ulaznog poreza" },
  { value: "08", label: "08 · Ulazni PDV u posebnoj šemi građevinarstva" },
  { value: "09", label: "09 · Ostalo" },
];

export const VRSTE_DOKUMENTA: { value: VrstaDokumenta; label: string }[] = [
  { value: "REDOVNA", label: "Redovna faktura" },
  { value: "AVANSNA", label: "Avansna faktura" },
  { value: "KNJIZNA_OBAVIJEST", label: "Knjižna obavijest" },
  { value: "STORNO_AVANSNE", label: "Storno avansne fakture" },
  { value: "PDV_NA_CEKANJU", label: "PDV na čekanju" },
  { value: "OSTALO", label: "Ostalo" },
];

export const KP_ENTITETI: { value: KpEntitet; label: string }[] = [
  { value: "FBIH", label: "Federacija BiH" },
  { value: "RS", label: "Republika Srpska" },
  { value: "BD", label: "Distrikt Brčko" },
];

export type UlazniRacun = {
  id: number;
  organizationId: number;
  partnerId: number;
  brojRacuna: string;
  datumRacuna: string;
  rokPlacanja: string | null;
  iznos: string; // DECIMAL stiže kao string
  pdvIznos: string | null;
  vrstaNabavke: VrstaNabavke;
  /** naslijeđeni sve-ili-ništa flag; mjerodavan je pdvNeodbitniIznos */
  pdvNeodbitan: boolean;
  /** dio ulaznog PDV-a koji se NE može odbiti (ne ulazi u polje 61 prijave) */
  pdvNeodbitniIznos: string;
  /** KUF period ide po datumu prijema fakture */
  datumPrijema: string | null;
  tipDokumenta: TipDokumentaKuf;
  vrstaDokumenta: VrstaDokumenta;
  jciBroj: string | null;
  jciDatum: string | null;
  /** otkup od poljoprivrednika: paušalna naknada (polja 23/43 prijave) */
  pausalnaNaknada: string;
  kpEntitet: KpEntitet | null;
  kpIznos: string;
  /** samo PDV evidencija (uvoz/JCI): u KUF-u je, ali ne stvara obavezu */
  samoEvidencija: boolean;
  status: UlazniRacunStatus;
  paidAt: string | null;
  note: string | null;
  /** račun nastao iz kalkulacije: KLC oznaka, npr. "1/26" (kartica partnera) */
  kalkulacijaOznaka?: string | null;
  /** izvedeni status naplate (FIFO od potvrđenih plaćanja sa izvoda) */
  paymentStatus?: "OTVOREN" | "DJELIMICNO" | "PLACEN" | "KREDIT";
  preostalo?: number;
  placeno?: number;
  partner?: {
    id: number;
    name: string;
    jib?: string | null;
    pdvBroj?: string | null;
    code?: number | null;
    city?: string | null;
  };
};

export type UlazniRacunPayload = {
  partnerId: number;
  brojRacuna: string;
  datumRacuna: string; // YYYY-MM-DD
  rokPlacanja?: string | null;
  iznos: number;
  pdvIznos?: number | null;
  vrstaNabavke?: VrstaNabavke;
  pdvNeodbitniIznos?: number;
  datumPrijema?: string; // YYYY-MM-DD
  tipDokumenta?: TipDokumentaKuf;
  vrstaDokumenta?: VrstaDokumenta;
  jciBroj?: string | null;
  jciDatum?: string | null;
  pausalnaNaknada?: number;
  kpEntitet?: KpEntitet | null;
  kpIznos?: number;
  samoEvidencija?: boolean;
  note?: string;
};

export function listUlazniRacuni(
  orgId: number,
  query?: { partnerId?: number; status?: UlazniRacunStatus },
) {
  const sp = new URLSearchParams();
  if (query?.partnerId) sp.set("partnerId", String(query.partnerId));
  if (query?.status) sp.set("status", query.status);
  const qs = sp.toString();
  return jsonRequest<UlazniRacun[]>(
    `/api/partners/${orgId}/ulazni-racuni${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
}

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
  /** STANDARD | AVANSNA | STORNO_AVANSNE | KNJIZNA_OBAVIJEST (predznak iz vrste) */
  docType: string | null;
  /** izvedeni status naplate (FIFO od potvrđenih uplata sa izvoda) */
  paymentStatus?: "OTVOREN" | "DJELIMICNO" | "PLACEN" | "KREDIT";
  preostalo?: number;
  placeno?: number;
};

export type PartnerOpening = {
  /** stanje na kraj tog dana; kartica od narednog dana kreće s donosom */
  datum: string;
  kupacIznos: number;
  dobavljacIznos: number;
  napomena: string | null;
  /** otvoreni (nenaplaćeni) dio početnog stanja po FIFO raspodjeli */
  kupacPreostalo: number;
  dobavljacPreostalo: number;
};

export type KarticaData = {
  partner: Partner;
  transactions: KarticaTransaction[];
  invoices: KarticaInvoice[];
  ulazniRacuni: UlazniRacun[];
  /** period pregleda (null = sve) */
  period: { from: string | null; to: string | null };
  /** najranija godina sa podacima (za picker godina) */
  minYear: number | null;
  /** početno stanje partnera (migracija), null ako nije uneseno */
  opening: PartnerOpening | null;
  /** donos u izabrani period (samo kad je from zadan): saldo prije perioda */
  donos: { kupac: number; dobavljac: number } | null;
  totals: {
    totalIn: number;
    totalOut: number;
    openInvoicesTotal: number;
    openPayablesTotal: number;
    /** dio otvorenog duga koji je prošao rok plaćanja */
    openInvoicesLate: number;
    openPayablesLate: number;
  };
};

export function getPartnerKartica(
  orgId: number,
  partnerId: number,
  period: { from?: string | null; to?: string | null } = {},
) {
  const sp = new URLSearchParams();
  if (period.from) sp.set("from", period.from);
  if (period.to) sp.set("to", period.to);
  const qs = sp.toString();
  return jsonRequest<KarticaData>(
    `/api/partners/${orgId}/${partnerId}/kartica${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
}

// ── Početna stanja partnera (migracija iz starog programa) ──────────────────

export type OpeningBalanceRow = {
  partnerId: number;
  datum: string;
  kupacIznos: number;
  dobavljacIznos: number;
  napomena: string | null;
};

export function listOpeningBalances(orgId: number) {
  return jsonRequest<OpeningBalanceRow[]>(
    `/api/partners/${orgId}/opening-balances`,
    { method: "GET" },
  );
}

/** Snimi početno stanje partnera; oba iznosa 0 brišu zapis. */
export function setOpeningBalance(
  orgId: number,
  partnerId: number,
  payload: {
    datum: string;
    kupacIznos: number;
    dobavljacIznos: number;
    napomena?: string | null;
  },
) {
  return jsonRequest<OpeningBalanceRow | null>(
    `/api/partners/${orgId}/${partnerId}/opening-balance`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

/** Grupni unos početnih stanja (migracija). */
export function bulkSetOpeningBalances(
  orgId: number,
  items: {
    partnerId: number;
    datum: string;
    kupacIznos: number;
    dobavljacIznos: number;
  }[],
) {
  return jsonRequest<{ saved: number; skipped: number }>(
    `/api/partners/${orgId}/opening-balances`,
    { method: "POST", body: JSON.stringify({ items }) },
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

/** IOS: izvod otvorenih stavki na dan (prazno = danas). */
export async function downloadIosPdf(
  orgId: number,
  partnerId: number,
  type: KarticaType,
  naDan?: string | null,
): Promise<{ ok: true; blob: Blob; filename: string } | { ok: false; error: string }> {
  try {
    const sp = new URLSearchParams({ type });
    if (naDan) sp.set("naDan", naDan);
    const res = await fetch(
      `${BACKEND_URL}/api/partners/${orgId}/${partnerId}/ios.pdf?${sp.toString()}`,
      { method: "GET", credentials: "include" },
    );
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return { ok: false, error: json?.error ?? `HTTP ${res.status}` };
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") ?? "";
    const m = cd.match(/filename="([^"]+)"/);
    return { ok: true, blob, filename: m?.[1] ?? "IOS.pdf" };
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

/** Pošalji IOS na email partnera. */
export function emailIos(
  orgId: number,
  partnerId: number,
  type: KarticaType,
  naDan?: string | null,
) {
  return jsonRequest<{ sentTo: string }>(
    `/api/partners/${orgId}/${partnerId}/ios/email`,
    {
      method: "POST",
      body: JSON.stringify({ type, naDan: naDan || undefined }),
    },
  );
}

/** Opomena kupcu (nivo 1 = opomena, 2 = pred utuženje): PDF dospjelog duga. */
export async function downloadOpomenaPdf(
  orgId: number,
  partnerId: number,
  nivo: 1 | 2,
): Promise<{ ok: true; blob: Blob; filename: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/partners/${orgId}/${partnerId}/opomena.pdf?nivo=${nivo}`,
      { method: "GET", credentials: "include" },
    );
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      return { ok: false, error: json?.error ?? `HTTP ${res.status}` };
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") ?? "";
    const m = cd.match(/filename="([^"]+)"/);
    return { ok: true, blob, filename: m?.[1] ?? "Opomena.pdf" };
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

/** Pošalji opomenu na email partnera. */
export function emailOpomena(orgId: number, partnerId: number, nivo: 1 | 2) {
  return jsonRequest<{ sentTo: string }>(
    `/api/partners/${orgId}/${partnerId}/opomena/email`,
    { method: "POST", body: JSON.stringify({ nivo }) },
  );
}

/** Spoji partnera (source) u drugog (target): promet prelazi, source se briše. */
export function mergePartner(orgId: number, sourceId: number, targetId: number) {
  return jsonRequest<{ targetId: number }>(
    `/api/partners/${orgId}/${sourceId}/merge`,
    { method: "POST", body: JSON.stringify({ targetId }) },
  );
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
