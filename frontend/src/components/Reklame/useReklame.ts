"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  getAktivneReklame,
  zabiljeziPrikaz,
  type JavnaReklama,
} from "src/api/reklame";
import type { ReklamaPozicija, ReklamaStranica } from "src/data/reklame";

// Jedan zahtjev po stranici za sve pozicije; rotaciju radi backend pri
// svakom novom učitavanju (keš važi dok je korisnik na sajtu, pa se reklama
// ne mijenja pod rukom dok popunjava obrazac).
export function useReklame(stranica: ReklamaStranica) {
  return useQuery({
    queryKey: ["reklame-aktivne", stranica],
    queryFn: () => unwrap(getAktivneReklame(stranica)),
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useReklama(
  stranica: ReklamaStranica,
  pozicija: ReklamaPozicija,
): JavnaReklama | null {
  const { data } = useReklame(stranica);
  return data?.[pozicija] ?? null;
}

/**
 * Broji prikaz kad je reklama bar napola vidljiva, jednom po montiranju.
 * Stub koji CSS sakrije na uskom ekranu nema veličinu, pa se ni ne broji.
 */
export function usePrikaz(
  ref: RefObject<HTMLElement | null>,
  reklama: JavnaReklama | null,
  stranica: ReklamaStranica,
  pozicija: ReklamaPozicija,
  ukljuceno = true,
) {
  const zabiljezeno = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!ukljuceno || !reklama || !el) return;
    if (zabiljezeno.current === reklama.id) return;
    if (typeof IntersectionObserver === "undefined") return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)) {
          zabiljezeno.current = reklama.id;
          void zabiljeziPrikaz(reklama.id, stranica, pozicija);
          obs.disconnect();
        }
      },
      { threshold: [0.5] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, reklama, stranica, pozicija, ukljuceno]);
}
