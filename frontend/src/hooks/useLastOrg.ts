"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pk:lastOrgId";
const CHANGE_EVENT = "pk:lastOrgChanged";

function readStored(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Posljednje odabrana organizacija — perzistira između stranica (JS3100,
// Obračun plata, Aktivni radnici, Ugovor o radu…). Sinhronizovano:
//   • između tabova preko `storage` eventa,
//   • unutar ISTOG taba preko custom `pk:lastOrgChanged` eventa
//     (jer browser ne emituje `storage` event u tabu koji je upisao value).
export function useLastOrg(): {
  lastOrgId: number | null;
  setLastOrgId: (id: number | null) => void;
} {
  // VAŽNO: initial state mora biti null i na serveru i na klijentu da bi
  // SSR i prvi client render bili identični (inače hydration mismatch).
  // Stvarna vrijednost se učitava iz localStorage tek u useEffect-u poslije
  // hidracije.
  const [lastOrgId, setLastOrgIdState] = useState<number | null>(null);

  useEffect(() => {
    setLastOrgIdState(readStored());

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setLastOrgIdState(readStored());
    };
    const onCustom = () => setLastOrgIdState(readStored());
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, onCustom as EventListener);
    };
  }, []);

  const setLastOrgId = useCallback((id: number | null) => {
    if (typeof window !== "undefined") {
      if (id == null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, String(id));
      // Notify other useLastOrg() instances in the same tab.
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
    }
    setLastOrgIdState(id);
  }, []);

  return { lastOrgId, setLastOrgId };
}
