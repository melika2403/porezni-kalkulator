"use client";

/* Broji jedan pregled kad čitalac stvarno otvori tekst.
   Radi iz preglednika, a ne na serveru, jer se stranica kešira pa bi jedan
   server render pokrivao više čitalaca. Jednom po sesiji i po tekstu, da
   osvježavanje stranice ne naduvava brojku. */

import { useEffect } from "react";
import { getBackendUrl } from "src/utils/backendUrl";

export default function PregledBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    if (!slug) return;
    const kljuc = `pk-pregled:${slug}`;
    try {
      if (sessionStorage.getItem(kljuc)) return;
      sessionStorage.setItem(kljuc, "1");
    } catch {
      // privatni način rada bez sessionStorage: broji se svaki put, nije strašno
    }
    const url = `${getBackendUrl()}/api/vijesti/${encodeURIComponent(slug)}/pregled`;
    void fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }, [slug]);

  return null;
}
