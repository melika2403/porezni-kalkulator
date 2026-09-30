import type { ReklamaStanje } from "src/api/reklame";

const dvije = (n: number) => String(n).padStart(2, "0");

/** "30.09.2026. 08:00" (lokalno vrijeme preglednika) */
export function fmtTermin(iso: string, saVremenom = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  const datum = `${dvije(d.getDate())}.${dvije(d.getMonth() + 1)}.${d.getFullYear()}.`;
  return saVremenom ? `${datum} ${dvije(d.getHours())}:${dvije(d.getMinutes())}` : datum;
}

export function fmtBroj(n: number): string {
  return n.toLocaleString("de-DE");
}

export function fmtCtr(prikazi: number, klikovi: number): string {
  if (!prikazi) return "–";
  return `${((klikovi / prikazi) * 100).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })} %`;
}

export const STANJE: Record<ReklamaStanje, { label: string; cls: string }> = {
  UTOKU: { label: "U toku", cls: "badgeUspjeh" },
  ZAKAZANA: { label: "Zakazana", cls: "badgeInfo" },
  ISTEKLA: { label: "Istekla", cls: "badgeNeutral" },
  PAUZIRANA: { label: "Pauzirana", cls: "badgeUpozorenje" },
};

/** ISO -> vrijednosti za <input type="date"> i <input type="time"> (lokalno) */
export function isoUDatumVrijeme(iso: string | null | undefined): {
  datum: string;
  vrijeme: string;
} {
  if (!iso) return { datum: "", vrijeme: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { datum: "", vrijeme: "" };
  return {
    datum: `${d.getFullYear()}-${dvije(d.getMonth() + 1)}-${dvije(d.getDate())}`,
    vrijeme: `${dvije(d.getHours())}:${dvije(d.getMinutes())}`,
  };
}

/** lokalni datum + vrijeme -> ISO (null ako nije potpuno) */
export function datumVrijemeUIso(datum: string, vrijeme: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return null;
  const [g, m, d] = datum.split("-").map(Number);
  const [h, min] = (/^\d{2}:\d{2}$/.test(vrijeme) ? vrijeme : "00:00")
    .split(":")
    .map(Number);
  const rez = new Date(g, m - 1, d, h, min, 0, 0);
  return Number.isNaN(rez.getTime()) ? null : rez.toISOString();
}

export const GRESKE: Record<string, string> = {
  LIMIT_FILE_SIZE: "Slika je prevelika (najviše 2 MB).",
  INVALID_IMAGE_TYPE: "Dozvoljene su samo PNG, JPG i WEBP slike.",
  NETWORK_ERROR: "Nema veze sa serverom. Pokušajte ponovo.",
  FORBIDDEN: "Nemate pristup.",
  NOT_FOUND: "Reklama nije pronađena.",
};

export function porukaGreske(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e ?? "");
  return GRESKE[m] ?? (m || "Došlo je do greške.");
}
