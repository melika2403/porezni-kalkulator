// Aktivne kreative partnera, dohvaćene na serveru zajedno sa stranicom.
// Kreativa je tako u HTML-u od prvog trenutka: nema praznog mjesta koje se
// popuni kad stigne odgovor, pa se sadržaj stranice ne pomjera. Osvježava se
// svakih 60 sekundi kao i vijesti (rotacija više kreativa je zato po minuti,
// ne po učitavanju).
import type { AktivneReklame } from "src/api/partner";
import type { ReklamaStranica } from "src/data/partner";
import { backendUrl } from "src/lib/vijestiServer";

const REVALIDATE = 60;

export async function getAktivneReklameServer(
  stranica: ReklamaStranica,
): Promise<AktivneReklame | null> {
  try {
    const res = await fetch(`${backendUrl()}/api/p/s?st=${encodeURIComponent(stranica)}`, {
      next: { revalidate: REVALIDATE },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok: boolean; data?: AktivneReklame };
    return json.ok && json.data ? json.data : null;
  } catch {
    // backend nedostupan (npr. pri buildu): klijent dohvati sam, kao i prije
    return null;
  }
}
