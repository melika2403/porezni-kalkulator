"use client";

// Ekran prekoračenja: paket dozvoljava manje obrta nego što ih je aktivno u
// PK Office (downgrade paketa ili istek probe pa manji paket). Backend tada
// blokira sve office module (PREKO_LIMITA_PAKETA), pa umjesto sadržaja
// prikazujemo objašnjenje + slot panel za deaktivaciju viška obrta.
// Deaktivacija u prekoračenju odmah oslobađa slot (bez anti-rotacije).
import { IconAlertTriangle } from "@tabler/icons-react";
import { usePkOfficePristup } from "src/hooks/usePkOfficeMe";
import PkOfficeSlotPanel from "src/sections/organizacije/PkOfficeSlotPanel";

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000";

export function PkOfficePrekoLimita() {
  const { data: pristup } = usePkOfficePristup();
  if (!pristup) return null;

  const max = pristup.maxObrta ?? 0;
  const aktivnih = pristup.aktivnihObrta ?? 0;
  const visak = Math.max(0, aktivnih - max);

  return (
    <div className="px-6 py-10 max-w-[720px] mx-auto">
      <div className="text-center mb-7">
        <span className="w-12 h-12 rounded-xl bg-warning-bg text-warning inline-flex items-center justify-center mb-4">
          <IconAlertTriangle size={26} />
        </span>
        <h1 className="font-serif-display text-[clamp(1.6rem,3vw,2.1rem)] leading-[1.15] text-text-primary mb-3">
          Aktivno je više obrta nego što paket dozvoljava
        </h1>
        <p className="text-[14px] leading-6 text-text-secondary max-w-[540px] mx-auto">
          Paket <strong>{pristup.planNaziv ?? "Office"}</strong> dozvoljava{" "}
          <strong>{max}</strong> {max === 1 ? "obrt" : "obrta"}, a trenutno{" "}
          {aktivnih === 1 ? "je aktivan" : "su aktivna"}{" "}
          <strong>{aktivnih}</strong>. Deaktiviraj još{" "}
          <strong>{visak}</strong> {visak === 1 ? "obrt" : "obrta"} da nastaviš
          sa radom, ili pređi na veći paket. Podaci deaktiviranih obrta se ne
          brišu i vraćaju se ponovnom aktivacijom, a dok traje prekoračenje
          deaktivacija odmah oslobađa slot.
        </p>
      </div>

      <PkOfficeSlotPanel />

      <p className="text-center text-[12.5px] text-text-tertiary">
        Trebaš sve ove obrte?{" "}
        <a
          href={`${MARKETING_URL}/pretplate#pk-office`}
          className="font-medium text-brand-700 hover:underline"
        >
          Nadogradi paket
        </a>
      </p>
    </div>
  );
}
