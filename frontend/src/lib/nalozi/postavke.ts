// Postavke ESC/P štampe naloga i preuzimanje .prn fajla.
//
// Postavke se pamte PO RAČUNARU (localStorage), ne po korisniku ni firmi:
// kalibracija zavisi od konkretnog pisača i od toga kako je papir uvučen, pa
// knjigovođa sa dva računara ima dvije različite vrijednosti. Default je
// neutralan (bez pomaka), potvrđen na stvarnoj štampi.

export type EscpPostavke = {
  /** + udesno, - ulijevo; jedna kolona = 1/12 inča (oko 2,1 mm) */
  pomakKolona: number;
  /** samo nadolje, 0-3; jedna linija = 1/6 inča (oko 4,2 mm) */
  pomakLinija: number;
  /** true = PC852 (kvačice), false = ASCII transliteracija */
  nasaSlova: boolean;
  /** korisnik je potvrdio da je pisač podešen: uputstvo se više ne otvara samo */
  uputstvoSakrij: boolean;
};

export const LS_KEY = "pk_nalog_escp";

export const DEFAULT_POSTAVKE: EscpPostavke = {
  pomakKolona: 0,
  pomakLinija: 0,
  nasaSlova: true,
  uputstvoSakrij: false,
};

// Granice su iste kao u buildPrn (escpNalog.ts): vrijednost izvan njih se
// ionako odsiječe, pa se ovdje odsiječe i pri unosu da korisnik ne upiše broj
// koji tiho ne radi ništa.
export const MIN_POMAK_KOLONA = -10;
export const MAX_POMAK_KOLONA = 20;
export const MIN_POMAK_LINIJA = 0;
// Nalog zauzima 21 od 24 linije forme; pomak 3 bi dao tačno 24 pa bi FF
// preskočio jedan prazan nalog na traci (isto ograničenje kao u buildPrn).
export const MAX_POMAK_LINIJA = 2;

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(Number.isFinite(n) ? n : 0)));

export function normalizujPostavke(o: Partial<EscpPostavke>): EscpPostavke {
  return {
    pomakKolona: clamp(
      Number(o.pomakKolona ?? 0),
      MIN_POMAK_KOLONA,
      MAX_POMAK_KOLONA,
    ),
    pomakLinija: clamp(
      Number(o.pomakLinija ?? 0),
      MIN_POMAK_LINIJA,
      MAX_POMAK_LINIJA,
    ),
    nasaSlova: typeof o.nasaSlova === "boolean" ? o.nasaSlova : true,
    uputstvoSakrij: o.uputstvoSakrij === true,
  };
}

export function loadPostavke(): EscpPostavke {
  if (typeof window === "undefined") return DEFAULT_POSTAVKE;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_POSTAVKE;
    return normalizujPostavke(JSON.parse(raw));
  } catch {
    return DEFAULT_POSTAVKE;
  }
}

export function savePostavke(p: EscpPostavke) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(normalizujPostavke(p)));
  } catch {
    // privatni prozor ili puna kvota: postavke se ne pamte, štampa i dalje radi
  }
}

export function preuzmiPrn(bytes: Uint8Array, ime: string) {
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ime;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const PORUKA_STAMPA =
  "Fajl je poslan na štampu. Ako se štampa ne pokrene sama, kliknite na preuzeti fajl u traci preuzimanja.";

// Ime firme u dio imena datoteke (bez kvačica i razmaka).
export function slugFirme(naziv: string): string {
  return (
    String(naziv || "org")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "org"
  );
}
