import { getBackendUrl } from "src/utils/backendUrl";

export type PublicStats = {
  // Ukupno generisanih dokumenata, backend zaokružuje naniže na 50.
  documents: number;
};

export async function getPublicStats(): Promise<PublicStats> {
  const res = await fetch(`${getBackendUrl()}/api/public/stats`);
  const json = await res.json().catch(() => null);
  if (!json?.ok) throw new Error(json?.error || "SERVER_ERROR");
  return json.data as PublicStats;
}
