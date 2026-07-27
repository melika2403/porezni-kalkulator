// Povratak sa detalja izvoda vraća listu na taj red, ne na vrh.
// Živi izvan page.tsx: Next dozvoljava samo poznate exporte iz page modula.

/** Zadnje otvoreni izvod ("id|vrijeme"), da povratak vrati na taj red. */
export const ZADNJI_IZVOD_KLJUC = "pk:izvodi:zadnji";

/** Zapamti izvod u koji se ulazi; čita ga lista pri povratku. */
export function zapamtiOtvoreniIzvod(id: number) {
  try {
    sessionStorage.setItem(ZADNJI_IZVOD_KLJUC, `${id}|${Date.now()}`);
  } catch {
    // privatni režim bez sessionStorage: skrol se jednostavno ne pamti
  }
}

/** Zaboravi trag (skrol odrađen ili istekao). */
export function zaboraviOtvoreniIzvod() {
  try {
    sessionStorage.removeItem(ZADNJI_IZVOD_KLJUC);
  } catch {
    // bez sessionStorage nema ni traga za brisanje
  }
}

/** Trag ako postoji i nije stariji od 10 minuta, inače null (i briše se). */
export function procitajOtvoreniIzvod(): string | null {
  let zapis: string | null = null;
  try {
    zapis = sessionStorage.getItem(ZADNJI_IZVOD_KLJUC);
  } catch {
    return null;
  }
  if (!zapis) return null;
  const [id, vrijeme] = zapis.split("|");
  if (Date.now() - Number(vrijeme) > 10 * 60 * 1000) {
    zaboraviOtvoreniIzvod();
    return null;
  }
  return id || null;
}
