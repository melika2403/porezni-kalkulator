// ──────────────────────────────────────────────────────────────────────────────
//  Živi uplatni računi: povlačenje trenutnog stanja šifarnika iz baze
//  (GET /api/uplatni-racuni) i primjena preko primijeniZiveRacune u
//  src/data/uplatni-racuni.ts. Time izmjena u admin panelu odmah važi za sve
//  obrasce koji se generišu u browseru (AMS, GPD, UoD, ČOK/ONŠ) i za prikaz
//  na /javni-prihodi, bez deploya.
//
//  Ako backend nije dostupan, ostaju seed vrijednosti iz uplatni-racuni.ts.
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { getBackendUrl } from "src/utils/backendUrl";
import { primijeniZiveRacune, type ZiviRacuni } from "./uplatni-racuni";

export type RacuniMeta = { izvor: string | null; datum: string | null };

// Koliko dugo smatramo učitano stanje svježim prije ponovnog fetch-a (fokus).
const SVJEZE_MS = 5 * 60 * 1000;

let meta: RacuniMeta | null = null;
let uzivo = false; // true kad je živo stanje bar jednom primijenjeno
let zadnjiFetch = 0;
let uToku: Promise<boolean> | null = null;
const slusaoci = new Set<() => void>();

async function dohvatiIPrimijeni(): Promise<boolean> {
  try {
    const res = await fetch(`${getBackendUrl()}/api/uplatni-racuni`);
    const json = (await res.json().catch(() => null)) as {
      ok?: boolean;
      data?: ZiviRacuni & { meta?: RacuniMeta | null };
    } | null;
    if (!json?.ok || !json.data) return false;
    primijeniZiveRacune(json.data);
    meta = json.data.meta ?? null;
    uzivo = true;
    zadnjiFetch = Date.now();
    for (const cb of slusaoci) cb();
    return true;
  } catch {
    return false;
  }
}

/** Povuci živo stanje ako nije svježe (dedup: jedan fetch u letu).
 *  force = preskoči provjeru svježine; koristi ga admin panel poslije snimanja
 *  izmjene, jer bi inače druga izmjena u roku od 5 minuta bila preskočena i
 *  ostatak aplikacije bi u istom tabu držao stari broj. */
export function osvjeziUplatneRacune(force = false): Promise<boolean> {
  if (uToku) return uToku;
  if (!force && uzivo && Date.now() - zadnjiFetch < SVJEZE_MS) {
    return Promise.resolve(true);
  }
  uToku = dohvatiIPrimijeni().finally(() => {
    uToku = null;
  });
  return uToku;
}

export function racuniMeta(): RacuniMeta | null {
  return meta;
}

/** Hook za komponente koje prikazuju ili pune račune: pri mountu povuče živo
 *  stanje (i na povratku fokusa ako je staro), a re-renderuje kad stigne. */
export function useUplatniRacuni(): {
  verzija: number;
  uzivo: boolean;
  meta: RacuniMeta | null;
} {
  const [verzija, setVerzija] = useState(0);
  useEffect(() => {
    const cb = () => setVerzija((v) => v + 1);
    slusaoci.add(cb);
    void osvjeziUplatneRacune();
    const onFocus = () => void osvjeziUplatneRacune();
    window.addEventListener("focus", onFocus);
    return () => {
      slusaoci.delete(cb);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  return { verzija, uzivo, meta };
}
