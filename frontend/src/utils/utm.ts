// UTM atribucija — uhvati izvor posjete na prvom dolasku i zapamti ga do
// registracije. Capture-once: prvi utm_source/utm_campaign koji vidimo se čuva
// i ne prepisuje (da kasniji interni klikovi ne pregaze originalni izvor).

const KEY = "pk-utm";
const MAX_AGE_MS = 30 * 86400000; // 30 dana — atribucija zastari nakon mjesec dana

type StoredUtm = { source: string; campaign: string; ts: number };

function read(): StoredUtm | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as StoredUtm;
    if (!v || typeof v.ts !== "number") return null;
    return v;
  } catch {
    return null;
  }
}

/**
 * Pozvati jednom pri učitavanju aplikacije. Ako URL nosi utm_source/utm_campaign
 * i još nemamo svjež zapis, sačuvaj ga.
 */
export function captureUtm(): void {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const source = (params.get("utm_source") || "").trim().slice(0, 80);
    const campaign = (params.get("utm_campaign") || "").trim().slice(0, 120);
    if (!source && !campaign) return;

    const existing = read();
    // Ne prepisuj postojeću svježu atribuciju (prvi dodir pobjeđuje).
    if (existing && Date.now() - existing.ts < MAX_AGE_MS) return;

    window.localStorage.setItem(
      KEY,
      JSON.stringify({ source, campaign, ts: Date.now() }),
    );
  } catch {}
}

/** Vrati zapamćeni UTM za slanje pri registraciji (ili prazno ako istekao). */
export function getUtmForRegister(): { utmSource?: string; utmCampaign?: string } {
  const v = read();
  if (!v || Date.now() - v.ts >= MAX_AGE_MS) return {};
  return {
    utmSource: v.source || undefined,
    utmCampaign: v.campaign || undefined,
  };
}

/** Očisti nakon uspješne registracije. */
export function clearUtm(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
