// Formatiranje za PK Freelancer (marketing tema): iznosi u KM, datumi DD.MM.GGGG.
import type { UplataStatus } from "src/api/freelancer";

/** Valute koje server prihvata za uplatu (isti spisak kao backend, freelancerUplate.VALUTE). */
export const VALUTE = [
  "BAM", "EUR", "USD", "GBP", "CHF", "CAD", "AUD", "SEK", "NOK", "DKK",
  "JPY", "PLN", "CZK", "HUF", "TRY", "RSD", "CNY", "RUB",
];
/** EUR je fiksan (currency board), ne ide na kursnu listu. */
export const EUR_KURS = 1.95583;

/**
 * Čitljiva poruka kad povlačenje kursa ne uspije. Server šalje ili rečenicu za
 * korisnika (npr. budući datum) ili kod (KURS_NIJE_DOSTUPAN, NETWORK_ERROR),
 * a kodovi se ne pokazuju korisniku.
 * @param rezervno šta ponuditi kad razlog nije čitljiv (razlikuje se po formi)
 */
export function kursGreskaTekst(e: unknown, rezervno: string): string {
  const m = e instanceof Error ? e.message : "";
  if (m === "PREVISE_ZAHTJEVA")
    return "Previše pokušaja u kratkom vremenu, sačekajte minutu pa probajte ponovo.";
  return !m || /^[A-Z_0-9 ]+$/.test(m) ? rezervno : m;
}

export const fmtKm = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * DD.MM.GGGG. iz ISO datuma. Datum bez vremena ("2026-10-03", DATEONLY kolone)
 * se čita doslovno, a vremenska oznaka ("...T21:30:00.000Z", npr. kraj probe)
 * se prevodi u LOKALNI dan: inače bi probi aktiviranoj poslije ponoći pisao
 * dan ranije, jer je UTC dio stringa tada još prethodni dan.
 */
export const fmtDatum = (iso: string | null | undefined) => {
  if (!iso) return "–";
  const s = String(iso);
  if (s.includes("T")) {
    const dt = new Date(s);
    if (Number.isNaN(dt.getTime())) return "–";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(dt.getDate())}.${p(dt.getMonth() + 1)}.${dt.getFullYear()}.`;
  }
  const [y, m, d] = s.slice(0, 10).split("-");
  return y && m && d ? `${d}.${m}.${y}.` : "–";
};

/** Lokalni dan (YYYY-MM-DD) iz ISO datuma ili vremenske oznake. */
export const isoDan = (iso: string | null | undefined) => {
  if (!iso) return "";
  const s = String(iso);
  if (!s.includes("T")) return s.slice(0, 10);
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
};

export const danasIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const MJESECI = [
  "Januar",
  "Februar",
  "Mart",
  "April",
  "Maj",
  "Juni",
  "Juli",
  "August",
  "Septembar",
  "Oktobar",
  "Novembar",
  "Decembar",
];

// Tok posla: obračunato, pa predano (obrazac predan Poreznoj), pa predano i
// plaćeno (i porez sa doprinosom uplaćeni). Redoslijed ključeva je redoslijed
// u padajućem izborniku. Vrijednost PLACENO u bazi znači "predano i plaćeno".
export const STATUS_TEKST: Record<UplataStatus, string> = {
  OBRACUNATO: "Obračunato",
  PREDANO: "Predano",
  PLACENO: "Predano i plaćeno",
};

/** Isti obračun kao na /ams i na backendu, za živi prikaz u formi. */
export function obracunajAms(iznosKm: number, stopaRashoda: number, porezniKredit = 0) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const bruto = r2(iznosKm || 0);
  const rashodi = r2(bruto * (stopaRashoda / 100));
  const dohodak = r2(bruto - rashodi);
  const zdravstveno = r2(dohodak * 0.04);
  const osnovica = r2(dohodak - zdravstveno);
  const porez = r2(osnovica * 0.1);
  const kredit = r2(Math.max(porezniKredit || 0, 0));
  const razlika = r2(porez - kredit);
  return {
    bruto,
    rashodi,
    dohodak,
    zdravstveno,
    zdravstvenoKanton: r2(zdravstveno * 0.898),
    zdravstvenoFbih: r2(zdravstveno * 0.102),
    osnovica,
    porez,
    porezniKredit: kredit,
    razlika,
    neto: r2(bruto - zdravstveno - razlika),
  };
}

/** Tekst i ton badge-a za rok predaje. */
export function rokInfo(daniDoRoka: number | null, status: UplataStatus) {
  // rok vrijedi samo dok obrazac nije predan
  if (status !== "OBRACUNATO" || daniDoRoka === null) return null;
  if (daniDoRoka < 0) return { tekst: `rok prošao prije ${-daniDoRoka} d`, ton: "kasni" as const };
  if (daniDoRoka === 0) return { tekst: "rok je danas", ton: "hitno" as const };
  if (daniDoRoka === 1) return { tekst: "rok je sutra", ton: "hitno" as const };
  return { tekst: `još ${daniDoRoka} d do roka`, ton: "ok" as const };
}
