"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FREELANCER_QUERY_KEY } from "src/components/FreelancerTrialCta/FreelancerTrialCta";

export const TABOVI = [
  { key: "pregled", label: "Pregled" },
  { key: "uplate", label: "Uplate" },
  { key: "isplatioci", label: "Isplatioci" },
  { key: "godisnji", label: "Godišnji pregled i GPD" },
  { key: "kalendar", label: "Kalendar" },
  { key: "postavke", label: "Postavke" },
  { key: "uputstvo", label: "Uputstvo" },
] as const;
export type TabKey = (typeof TABOVI)[number]["key"];

export function useTab(): TabKey {
  const sp = useSearchParams();
  const t = sp.get("tab");
  return (TABOVI.find((x) => x.key === t)?.key ?? "pregled") as TabKey;
}

/** Godina iz URL-a (?godina=), dijeljena među tabovima. */
export function useGodina(): [number, (g: number) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tekuca = new Date().getFullYear();
  const raw = Number(sp.get("godina"));
  const godina = Number.isInteger(raw) && raw >= 2015 && raw <= 2100 ? raw : tekuca;
  const setGodina = (g: number) => {
    const q = new URLSearchParams(sp.toString());
    q.set("godina", String(g));
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  };
  return [godina, setGodina];
}

/** Link na tab, čuva izabranu godinu. */
export function tabHref(tab: TabKey, godina?: number, extra?: Record<string, string>) {
  const q = new URLSearchParams({ tab });
  if (godina) q.set("godina", String(godina));
  for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v);
  return `/freelancer?${q.toString()}`;
}

/** Poslije svake izmjene evidencije: osvježi sve poglede i brojače pristupa. */
export function useOsvjeziEvidenciju() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["freelancer-uplate"] });
    qc.invalidateQueries({ queryKey: ["freelancer-pregled"] });
    qc.invalidateQueries({ queryKey: ["freelancer-godine"] });
    qc.invalidateQueries({ queryKey: ["freelancer-gpd"] });
    qc.invalidateQueries({ queryKey: FREELANCER_QUERY_KEY });
  };
}
