// Zajednički helperi za datume i radne dane (svi dokumenti ih dijele).

export function formatDdMmYyyy(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}.`;
}

export function formatDdMm(iso: string): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${d}.${m}.`;
}

// Dodaje N radnih dana na datum (preskače subotu/nedjelju). Vraća ISO datum
// zadnjeg radnog dana. Praznici se (za sad) ne preskaču.
export function dodajRadneDane(startIso: string, dana: number): string {
  if (!startIso || dana <= 0) return startIso;
  const [y, m, d] = startIso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  let counted = 0;
  while (counted < dana) {
    const dow = date.getUTCDay();
    if (dow !== 0 && dow !== 6) counted += 1;
    if (counted >= dana) break;
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}

// Broji radne dane (pon-pet) između dva datuma, uključujući oba kraja.
export function racunajRadneDane(odIso: string, doIso: string): number {
  if (!odIso || !doIso) return 0;
  const [y1, m1, d1] = odIso.split("-").map(Number);
  const [y2, m2, d2] = doIso.split("-").map(Number);
  const cur = new Date(Date.UTC(y1, m1 - 1, d1));
  const end = new Date(Date.UTC(y2, m2 - 1, d2));
  if (cur > end) return 0;
  let count = 0;
  while (cur <= end) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) count += 1;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

// Broji sve kalendarske dane između dva datuma, uključujući oba kraja
// (za neplaćeno odsustvo gdje se računaju kalendarski dani).
export function racunajKalendarskeDane(odIso: string, doIso: string): number {
  if (!odIso || !doIso) return 0;
  const [y1, m1, d1] = odIso.split("-").map(Number);
  const [y2, m2, d2] = doIso.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  if (a > b) return 0;
  return Math.round((b - a) / 86400000) + 1;
}
