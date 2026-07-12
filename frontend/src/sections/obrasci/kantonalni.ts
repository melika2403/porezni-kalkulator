// Kantonalni podaci za obrasce ČOK i ONŠ: porezni uredi, obrtničke komore
// (nazivi + žiro računi za članarinu gdje su poznati) i vrste prihoda.
// Kanton se izvodi iz sjedišta obrta preko šifarnika općina (KANTONI).
import { KANTONI, type KantonKey } from "src/data/uplatni-racuni";

export type { KantonKey };

/** Sjedišta kantonalnih poreznih ureda PU FBiH. */
export const POREZNI_UREDI: Record<KantonKey, string> = {
  USK: "Bihać",
  POS: "Orašje",
  TUZ: "Tuzla",
  ZDK: "Zenica",
  BPK: "Goražde",
  SBK: "Travnik",
  HNK: "Mostar",
  ZHK: "Široki Brijeg",
  KS: "Sarajevo",
  K10: "Livno",
};

/** Vrsta prihoda za naknadu za općekorisne funkcije šuma (ONŠ). */
export const ONS_VRSTA_PRIHODA = "722471";
/** Vrsta prihoda za članarinu obrtničkoj komori (ČOK). */
export const COK_VRSTA_PRIHODA = "722567";

/** Žiro računi kantonalnih obrtničkih komora za uplatu članarine.
 *  Poznati: USK (dostavio vlasnik), KS (okks.ba). Ostale dopuniti kad
 *  komore dostave/objave račune; null = prikaz bez podataka za uplatu. */
export const KOMORA_RACUNI: Partial<Record<KantonKey, string>> = {
  USK: "1020220000053653",
  KS: "3387302220433691",
};

/** Naziv kantonalne obrtničke komore (za zaglavlje ČOK obrasca). */
export function komoraNaziv(kanton: KantonKey): string {
  return `Obrtnička komora ${KANTONI[kanton].genitiv}`;
}

// normalizacija za poređenje gradova: mala slova, bez dijakritike
// (Bihac == Bihać), da unos u profilu ne mora biti savršen
function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");
}

// nađi općinu za grad: prvo tačno poklapanje, pa djelimično u oba smjera
// ("Sarajevo" pogodi "Centar Sarajevo", "Grad Mostar" pogodi "Mostar")
function nadjiOpcinu(
  city: string | null | undefined,
): { kanton: KantonKey; kod: string } | null {
  const q = norm(String(city || ""));
  if (!q) return null;
  let djelimicno: { kanton: KantonKey; kod: string } | null = null;
  for (const key of Object.keys(KANTONI) as KantonKey[]) {
    for (const o of KANTONI[key].opcine) {
      const ime = norm(o.ime);
      if (ime === q) return { kanton: key, kod: o.kod };
      if (!djelimicno && (ime.includes(q) || q.includes(ime))) {
        djelimicno = { kanton: key, kod: o.kod };
      }
    }
  }
  return djelimicno;
}

/** Kanton po sjedištu obrta (poklapanje grada u šifarniku općina). */
export function kantonZaGrad(city: string | null | undefined): KantonKey | null {
  return nadjiOpcinu(city)?.kanton ?? null;
}

/** Šifra općine sjedišta (za podatke za uplatu). */
export function opcinaKod(city: string | null | undefined): string | null {
  return nadjiOpcinu(city)?.kod ?? null;
}

export const KANTON_OPTIONS = (Object.keys(KANTONI) as KantonKey[]).map(
  (k) => ({ value: k, label: KANTONI[k].ime }),
);

export function kantonBudzetRacun(kanton: KantonKey): string {
  return KANTONI[kanton].budzet;
}

export function kantonGenitiv(kanton: KantonKey): string {
  return KANTONI[kanton].genitiv;
}
