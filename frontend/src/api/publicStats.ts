import { getBackendUrl } from "src/utils/backendUrl";

export type PublicStats = {
  // Ukupno generisanih dokumenata, backend zaokružuje naniže na 50.
  documents: number;
  // aktivnost zadnjih 30 dana (zaokruženo naniže na 10)
  last30: number;
  // registrovani korisnici (zaokruženo naniže na 10)
  users: number;
  // organizacije (firme i obrti) na platformi (zaokruženo naniže na 10)
  organizations: number;
  // aktivnost po danima za mini grafikon (30 dana, hronološki)
  daily: { d: string; c: number }[];
  // zadnji događaji za live ticker (anonimizovano: samo tip i vrijeme)
  ticker: { label: string; at: string }[];
};

export async function getPublicStats(): Promise<PublicStats> {
  const res = await fetch(`${getBackendUrl()}/api/public/stats`);
  const json = await res.json().catch(() => null);
  if (!json?.ok) throw new Error(json?.error || "SERVER_ERROR");
  return json.data as PublicStats;
}
