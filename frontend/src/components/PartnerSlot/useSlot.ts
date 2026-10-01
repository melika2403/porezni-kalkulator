"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "src/api/auth";
import {
  getAktivneReklame,
  zabiljeziPrikaz,
  type JavnaReklama,
} from "src/api/partner";
import type { ReklamaPozicija, ReklamaStranica } from "src/data/partner";
import { usePocetneReklame } from "./Kontekst";

// Jedan zahtjev po stranici za sve pozicije (keš važi dok je korisnik na
// sajtu, pa se reklama ne mijenja pod rukom dok popunjava obrazac). Stranica
// omotana sa SlotServer donosi kreative sa HTML-om, pa zahtjeva i
// pomjeranja sadržaja nema.
export function useReklame(stranica: ReklamaStranica) {
  const pocetne = usePocetneReklame(stranica);
  return useQuery({
    queryKey: ["reklame-aktivne", stranica],
    queryFn: () => unwrap(getAktivneReklame(stranica)),
    initialData: pocetne,
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

// IAB standard vidljivosti: bar pola kreative na ekranu najmanje 1 sekundu
const VIDLJIVO_MS = 1000;

/**
 * Broji prikaz kad je reklama bar napola vidljiva najmanje 1 sekundu, jednom
 * po montiranju (proleti li posjetilac pored nje skrolom, ne broji se).
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

    let tajmer: ReturnType<typeof setTimeout> | null = null;
    const obs = new IntersectionObserver(
      (entries) => {
        const vidljiva = entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5);
        if (vidljiva && !tajmer) {
          tajmer = setTimeout(() => {
            zabiljezeno.current = reklama.id;
            void zabiljeziPrikaz(reklama.id, stranica, pozicija);
            obs.disconnect();
          }, VIDLJIVO_MS);
        } else if (!vidljiva && tajmer) {
          clearTimeout(tajmer);
          tajmer = null;
        }
      },
      { threshold: [0, 0.5] },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (tajmer) clearTimeout(tajmer);
    };
  }, [ref, reklama, stranica, pozicija, ukljuceno]);
}
