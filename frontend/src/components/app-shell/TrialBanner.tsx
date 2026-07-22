"use client";

import { useState } from "react";
import { IconClock, IconX } from "@tabler/icons-react";
import { usePkOfficePristup } from "src/hooks/usePkOfficeMe";
import { MARKETING_URL } from "src/lib/pkOfficeUrl";

function fmtDatum(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}.${m}.${y}.` : iso;
}

function preostaloDana(iso: string) {
  const end = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

// Traka na vrhu PK Office-a dok traje probni period: potvrda da je proba
// aktivna, do kad vrijedi, i put do upravljanja (profil, tab Pretplata) i
// pravog paketa (predračun na /pretplate#pk-office). Zatvaranje se pamti u
// localStorage po datumu isteka, ali se u zadnjih 7 dana traka vrati (drugi
// ključ) da istek ne prođe neprimijećen.
export function TrialBanner() {
  const { data: pristup } = usePkOfficePristup();
  const [closed, setClosed] = useState(false);

  const aktivan = Boolean(
    pristup?.enforced && pristup.trial && pristup.hasOffice,
  );
  const endIso = pristup?.trialEndsAt
    ? String(pristup.trialEndsAt).slice(0, 10)
    : null;
  if (!aktivan || !endIso) return null;

  const dana = preostaloDana(endIso);
  if (dana < 0) return null;

  const kljuc =
    dana <= 7 ? `pk-trial-banner-${endIso}-kraj` : `pk-trial-banner-${endIso}`;
  const sakriven =
    closed ||
    (typeof window !== "undefined" &&
      window.localStorage.getItem(kljuc) === "1");
  if (sakriven) return null;

  function zatvori() {
    try {
      window.localStorage.setItem(kljuc, "1");
    } catch {
      // ignore (privatni mod)
    }
    setClosed(true);
  }

  const uskoro = dana <= 7;

  return (
    <div
      className={[
        "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 text-[12.5px] leading-5 border-b",
        uskoro
          ? "bg-warning-bg text-warning border-warning/25"
          : "bg-info-bg text-info border-info/20",
      ].join(" ")}
    >
      <IconClock size={15} className="shrink-0" />
      <span className="min-w-0">
        <strong className="font-semibold">
          Probni period PK Office je aktivan
        </strong>{" "}
        i vrijedi do {fmtDatum(endIso)}
        {dana === 0 ? " (ističe danas)." : ` (još ${dana} d).`}
      </span>
      <span className="ml-auto flex items-center gap-2 shrink-0">
        {/* pun <a href> (marketing je druga subdomena u prod-u; puni reload
            čisti /app stilove, inače profil ostane bijel) */}
        <a
          href={`${MARKETING_URL}/profil?tab=pretplata`}
          className={[
            "px-3 py-1 rounded-full text-[12px] font-medium border transition-colors",
            uskoro
              ? "border-warning/40 text-warning hover:bg-warning/10"
              : "border-info/40 text-info hover:bg-info/10",
          ].join(" ")}
        >
          Upravljaj pretplatom
        </a>
        <a
          href={`${MARKETING_URL}/pretplate#pk-office`}
          className="px-3 py-1 rounded-full text-[12px] font-medium bg-brand-600 text-white hover:opacity-90 transition-opacity"
        >
          Zatraži predračun
        </a>
        <button
          type="button"
          onClick={zatvori}
          aria-label="Sakrij obavještenje"
          className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
        >
          <IconX size={14} />
        </button>
      </span>
    </div>
  );
}
