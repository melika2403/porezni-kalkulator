"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pk:lastOrgId";

function readStored(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Posljednje odabrana organizacija — perzistira između stranica (JS3100,
// Obračun plata, Aktivni radnici, Ugovor o radu…). Sinhronizovano izmedju
// tabova preko `storage` eventa.
export function useLastOrg(): {
  lastOrgId: number | null;
  setLastOrgId: (id: number | null) => void;
} {
  const [lastOrgId, setLastOrgIdState] = useState<number | null>(() => readStored());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setLastOrgIdState(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLastOrgId = useCallback((id: number | null) => {
    if (typeof window !== "undefined") {
      if (id == null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, String(id));
    }
    setLastOrgIdState(id);
  }, []);

  return { lastOrgId, setLastOrgId };
}
