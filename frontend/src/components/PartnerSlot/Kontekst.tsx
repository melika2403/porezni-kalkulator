"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AktivneReklame } from "src/api/partner";
import type { ReklamaStranica } from "src/data/partner";

// Početne kreative po stranici, dohvaćene na serveru (SlotServer). useReklame
// ih koristi kao initialData, pa slot crta kreativu već u prvom renderu.
type Pocetne = Partial<Record<ReklamaStranica, AktivneReklame>>;

const Ctx = createContext<Pocetne>({});

export function PocetneReklame({
  stranica,
  podaci,
  children,
}: {
  stranica: ReklamaStranica;
  podaci: AktivneReklame | null;
  children: ReactNode;
}) {
  const roditelj = useContext(Ctx);
  const vrijednost = useMemo(
    () => (podaci ? { ...roditelj, [stranica]: podaci } : roditelj),
    [roditelj, stranica, podaci],
  );
  return <Ctx.Provider value={vrijednost}>{children}</Ctx.Provider>;
}

export function usePocetneReklame(stranica: ReklamaStranica): AktivneReklame | undefined {
  return useContext(Ctx)[stranica];
}
