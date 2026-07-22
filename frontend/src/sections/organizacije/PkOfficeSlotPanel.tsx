"use client";

// Upravljanje PK Office slotovima (samo za Office pretplatnike, i samo kad je
// naplata uključena, PK_OFFICE_NAPLATA): brojač slotova po paketu i
// aktivacija/deaktivacija obrta. Deaktivacija oslobađa slot tek od narednog
// mjeseca (pravilo protiv rotiranja), podaci obrta se ne brišu.
// Za USER/PRO/BUSINESS korisnike i dok naplata nije uključena: ne prikazuje se.
import { useState } from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { usePkOfficePristup, usePkOfficeSlot } from "src/hooks/usePkOfficeMe";

// sa 50 obrta lista bi progutala stranicu: sažeti prikaz + "Prikaži sve"
const PRIKAZANO_SAZETO = 3;
const SAKRIVEN_KEY = "pkOfficeSlotPanelSakriven";

export default function PkOfficeSlotPanel() {
  const { data: pristup } = usePkOfficePristup();
  const { aktiviraj, deaktiviraj } = usePkOfficeSlot();
  const [error, setError] = useState<string | null>(null);
  // dvoklik potvrda za deaktivaciju (bez posebnog modala)
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [prosireno, setProsireno] = useState(false);
  // cijeli panel sklopljen na header (izbor se pamti po browseru);
  // lazy init je siguran: dok se pristup ne učita komponenta ionako renderuje null
  const [sakriven, setSakriven] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(SAKRIVEN_KEY) === "1",
  );

  if (!pristup?.enforced || !pristup.hasOffice || !pristup.slotovi) {
    return null;
  }
  const { slotovi, organizations } = pristup;
  // max null = bez limita (admin): panel se prikazuje, brojač bez maksimuma
  const pun = slotovi.max != null && slotovi.zauzeto >= slotovi.max;
  const vidljive = prosireno
    ? organizations
    : organizations.slice(0, PRIKAZANO_SAZETO);
  const skrivenih = organizations.length - vidljive.length;

  function toggleSakriven() {
    setSakriven((s) => {
      const novo = !s;
      localStorage.setItem(SAKRIVEN_KEY, novo ? "1" : "0");
      return novo;
    });
  }

  async function toggleOrg(orgId: number, enabled: boolean) {
    setError(null);
    try {
      if (enabled) {
        if (confirmId !== orgId) {
          setConfirmId(orgId);
          return;
        }
        setConfirmId(null);
        await deaktiviraj.mutateAsync(orgId);
      } else {
        await aktiviraj.mutateAsync(orgId);
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message === "LIMIT_PAKETA"
          ? "Svi slotovi paketa su popunjeni. Deaktiviraj neki obrt (slot se oslobađa od narednog mjeseca) ili nadogradi paket."
          : "Greška, pokušaj ponovo.",
      );
    }
  }

  return (
    <div className="pk-scope mb-5">
      <div className="rounded-xl border border-cream-300 bg-cream-100 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5 pb-2.5 border-b border-cream-300">
          <div>
            <div className="text-[14px] font-semibold text-text-primary">
              PK Office obrti
            </div>
            <div className="text-[12px] text-text-tertiary">
              {pristup.planNaziv ?? "Office paket"}
              {pristup.trial && pristup.trialEndsAt
                ? ` · proba do ${new Date(pristup.trialEndsAt).toLocaleDateString("de-DE")}`
                : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center px-3 py-1 rounded-full text-[12.5px] font-semibold tabular-nums",
                pun
                  ? "bg-warning-bg text-warning"
                  : "bg-success-bg text-success",
              ].join(" ")}
            >
              {slotovi.max != null
                ? `${slotovi.zauzeto} / ${slotovi.max} slotova`
                : `${slotovi.zauzeto} u PK Office · bez limita`}
            </span>
            <button
              type="button"
              onClick={toggleSakriven}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11.5px] font-medium text-text-tertiary hover:text-text-primary hover:bg-cream-200 transition-colors"
            >
              {sakriven ? (
                <>
                  Prikaži <IconChevronDown size={14} />
                </>
              ) : (
                <>
                  Sakrij <IconChevronUp size={14} />
                </>
              )}
            </button>
          </div>
        </div>
        {!sakriven && (
          <>
            <ul className="divide-y divide-cream-300">
              {vidljive.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center gap-2.5 px-4 py-2.5"
                >
                  <span className="flex-1 min-w-[180px] text-[13px] text-text-primary truncate">
                    {o.name}
                    {o.isClientOrg && (
                      <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded-[20px] bg-cream-200 text-text-tertiary text-[10.5px]">
                        klijent
                      </span>
                    )}
                  </span>
                  {o.pkOfficeEnabled ? (
                    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-success-bg text-success text-[11px] font-medium">
                      u PK Office
                    </span>
                  ) : o.zauzetDoKrajaMjeseca ? (
                    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-warning-bg text-warning text-[11px] font-medium">
                      slot zauzet do kraja mjeseca
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-[20px] bg-cream-200 text-text-secondary text-[11px] font-medium">
                      nije u PK Office
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={aktiviraj.isPending || deaktiviraj.isPending}
                    onClick={() => toggleOrg(o.id, o.pkOfficeEnabled)}
                    className={[
                      "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50 shrink-0",
                      o.pkOfficeEnabled
                        ? confirmId === o.id
                          ? "bg-accent-500 text-white"
                          : "border border-cream-300 text-text-secondary hover:text-text-primary hover:bg-cream-200"
                        : "border border-brand-600 text-brand-600 hover:bg-brand-100",
                    ].join(" ")}
                  >
                    {o.pkOfficeEnabled
                      ? confirmId === o.id
                        ? "Potvrdi deaktivaciju"
                        : "Deaktiviraj"
                      : o.zauzetDoKrajaMjeseca
                        ? "Ponovo aktiviraj"
                        : "Aktiviraj u PK Office"}
                  </button>
                </li>
              ))}
              {organizations.length === 0 && (
                <li className="px-4 py-3 text-[12.5px] text-text-tertiary">
                  Nemate nijedan obrt kojim upravljate.
                </li>
              )}
            </ul>
            {(skrivenih > 0 || prosireno) && (
              <button
                type="button"
                onClick={() => setProsireno((p) => !p)}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border-t border-cream-300 text-[12px] font-medium text-brand-700 hover:bg-cream-200 transition-colors"
              >
                {prosireno ? (
                  <>
                    Prikaži manje <IconChevronUp size={15} />
                  </>
                ) : (
                  <>
                    Prikaži sve ({organizations.length}){" "}
                    <IconChevronDown size={15} />
                  </>
                )}
              </button>
            )}
            <div className="px-4 py-2.5 border-t border-cream-300 text-[11.5px] leading-5 text-text-tertiary">
              Deaktivacija ne briše podatke obrta: knjige ostaju sačuvane i
              vraćaju se ponovnom aktivacijom.{" "}
              {pristup.prekoLimita
                ? "Dok je aktivno više obrta nego što paket dozvoljava, deaktivacija odmah oslobađa slot."
                : pristup.trial
                  ? "U probnom periodu deaktivacija odmah oslobađa slot."
                  : "Slot deaktiviranog obrta se oslobađa od narednog mjeseca."}
              {error && (
                <span className="block text-accent-500 mt-1">{error}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
