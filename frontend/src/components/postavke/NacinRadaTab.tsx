"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePkOfficeMe, usePkOfficePristup } from "src/hooks/usePkOfficeMe";
import {
  useOrganizationSettings,
  useUpdateOrganizationSettings,
} from "src/hooks/useOrganizationSettings";
import { SOLO_MODULI_PRAZNO, setPkOfficeTrialPlan, type SoloModuli } from "src/api/pkOffice";

// Postavke > Način rada: prekidač Solo režima ("vodim sam sebi") i moduli iz
// upitnika, isti podaci koje puni SoloUpitnik. Mijenja samo koji se ekrani
// vide, nikad obračune.

const MODULI: { key: keyof SoloModuli; naslov: string; opis: string }[] = [
  { key: "radnici", naslov: "Radnici", opis: "Zaposlenici, plate, JS3100 prijave, MIP, putni nalozi radnika" },
  { key: "roba", naslov: "Roba i maloprodaja", opis: "Kalkulacije, lager lista, popis" },
  { key: "blagajna", naslov: "Blagajna", opis: "Gotovinski nalozi i blagajnički dnevnik" },
  { key: "putniNalozi", naslov: "Putni nalozi", opis: "Službena putovanja i dnevnice" },
  { key: "stalnaSredstva", naslov: "Stalna sredstva", opis: "Oprema, vozila, amortizacija" },
];

export function NacinRadaTab() {
  const me = usePkOfficeMe();
  const { data: pristup } = usePkOfficePristup();
  const qc = useQueryClient();
  const activeOrgId =
    me.data?.activeOrganization?.id ?? me.data?.organizations?.[0]?.id ?? null;
  const settings = useOrganizationSettings(activeOrgId);
  const update = useUpdateOrganizationSettings(activeOrgId ?? 0);

  const [soloMode, setSoloMode] = useState(false);
  const [moduli, setModuli] = useState<SoloModuli>(SOLO_MODULI_PRAZNO);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [greska, setGreska] = useState<string | null>(null);

  useEffect(() => {
    if (!settings.data) return;
    setSoloMode(!!settings.data.soloMode);
    setModuli({ ...SOLO_MODULI_PRAZNO, ...(settings.data.soloModuli ?? {}) });
  }, [settings.data]);

  if (!activeOrgId) {
    return (
      <div className="rounded-xl bg-cream-100 border border-cream-300 px-5 py-6 text-[13.5px] text-text-secondary">
        Način rada se podešava po obrtu. Prvo dodajte obrt.
      </div>
    );
  }
  if (settings.isLoading) {
    return <div className="text-[13px] text-text-secondary">Učitavanje...</div>;
  }

  const snimi = async () => {
    setGreska(null);
    try {
      await update.mutateAsync({ soloMode, soloModuli: moduli });
      // na probi sa jednim obrtom način rada mijenja i nivo probe (Solo ili
      // Tim); neuspjeh ove sitnice ne smije poništiti snimljene postavke
      if (pristup?.trial && (me.data?.organizations ?? []).length <= 1) {
        await setPkOfficeTrialPlan(soloMode ? "office_1" : null).catch(() => null);
      }
      await qc.invalidateQueries({ queryKey: ["pk-office"] });
      setSavedAt(Date.now());
    } catch (e) {
      setGreska(e instanceof Error ? e.message : "Snimanje nije uspjelo.");
    }
  };

  return (
    <div className="max-w-[720px]">
      <section className="rounded-xl bg-cream-100 border border-cream-300 px-5 py-5 mb-4">
        <h2 className="font-serif-display text-[20px] text-text-primary mb-1">
          Solo režim, vodim knjige sam sebi
        </h2>
        <p className="text-[13px] text-text-tertiary mb-4 leading-6">
          Suženi meni (fakture, izvodi, doprinosi, KPR, obrasci) i mjesečna lista
          obaveza na naslovnici. Obračuni su isti kao u punom PK Office-u; ovdje se
          bira samo šta se vidi. Knjigovođa koji vodi više obrta ovo ostavlja
          isključeno.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 w-[18px] h-[18px] accent-brand-600"
            checked={soloMode}
            onChange={(e) => setSoloMode(e.target.checked)}
          />
          <span>
            <span className="block text-[14px] font-medium text-text-primary">
              Uključi Solo režim za ovaj obrt
            </span>
            <span className="block text-[12.5px] text-text-tertiary">
              Sidebar prikazuje samo module označene ispod, naslovnica postaje lista
              obaveza za tekući mjesec.
            </span>
          </span>
        </label>
      </section>

      <section className="rounded-xl bg-cream-100 border border-cream-300 px-5 py-5 mb-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-3">
          Moduli u meniju
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODULI.map((m) => (
            <label
              key={m.key}
              className={[
                "flex items-start gap-3 rounded-xl border px-3.5 py-3 cursor-pointer transition-colors",
                !soloMode ? "opacity-60 cursor-not-allowed" : "",
                moduli[m.key] ? "border-brand-600 bg-brand-100" : "border-cream-300 bg-cream-50 hover:bg-cream-200",
              ].join(" ")}
            >
              <input
                type="checkbox"
                className="mt-1 accent-brand-600"
                checked={moduli[m.key]}
                disabled={!soloMode}
                onChange={(e) => setModuli((x) => ({ ...x, [m.key]: e.target.checked }))}
              />
              <span>
                <span className="block text-[13.5px] font-medium text-text-primary">{m.naslov}</span>
                <span className="block text-[12px] text-text-tertiary mt-0.5">{m.opis}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="text-[12px] text-text-tertiary mt-3">
          PDV evidencije se pale statusom "PDV obveznik" na tabu Profil obrta. Bez
          Solo režima meni prikazuje sve module.
        </p>
      </section>

      {greska && <p className="text-[12.5px] text-danger mb-3">{greska}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void snimi()}
          disabled={update.isPending}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {update.isPending ? "Snimam..." : "Sačuvaj način rada"}
        </button>
        {savedAt && <span className="text-[12.5px] text-success">Sačuvano.</span>}
      </div>
    </div>
  );
}
