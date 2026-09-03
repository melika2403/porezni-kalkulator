"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconBuildingStore, IconArrowRight } from "@tabler/icons-react";
import { Modal } from "./Modal";
import { usePkOfficeMe, usePkOfficePristup } from "src/hooks/usePkOfficeMe";

// Dobrodošlica za korisnika koji ima PK Office pristup (paket ili trial) a
// još nema nijedan obrt: na ulazu u /app ga dočeka poziv da doda prvi obrt.
// Vodi na postojeću punu formu (/app/postavke, tab "Novi obrt"), unos se ne
// duplira u modalu. "Razgledat ću prvo" sakrije modal do sljedećeg ulaska u
// app; pošto se pojavljuje samo dok nema nijednog obrta, poslije prvog
// snimljenog obrta nestaje zauvijek.
export function PrviObrtModal() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, isSuccess } = usePkOfficeMe();
  const { data: pristup } = usePkOfficePristup();
  const [dismissed, setDismissed] = useState(false);

  // bez pristupa se prikazuje upsell (AppShell), pa modal ne treba
  const zakljucano = Boolean(pristup?.enforced && !pristup.hasOffice);
  const nemaObrta = isSuccess && (me?.organizations?.length ?? 0) === 0;
  // na postavkama ne smeta: tamo je i forma za novi obrt; na naslovnici je
  // forma za prvi obrt ugrađena u samu stranicu (ulaz bez odlaska ikud)
  const naPostavkama = Boolean(pathname?.startsWith("/app/postavke"));
  const naNaslovnici = Boolean(pathname?.startsWith("/app/dashboard"));

  const open = nemaObrta && !zakljucano && !naPostavkama && !naNaslovnici && !dismissed;

  function dodajObrt() {
    setDismissed(true);
    router.push("/app/postavke?tab=nova-organizacija");
  }

  return (
    <Modal
      open={open}
      onClose={() => setDismissed(true)}
      title="Dobrodošli u PK Office"
      footer={
        <>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-text-secondary hover:bg-cream-200 transition-colors"
          >
            Razgledat ću prvo
          </button>
          <button
            type="button"
            onClick={dodajObrt}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            Dodaj obrt
            <IconArrowRight size={15} />
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 inline-flex items-center justify-center shrink-0">
          <IconBuildingStore size={20} />
        </span>
        <div className="text-[13.5px] leading-6 text-text-secondary">
          <p className="mb-2">
            Sve u PK Office (izvodi, fakture, KPR, plate...) vodi se po obrtu,
            pa je prvi korak da dodate obrt: svoj ili obrt klijenta kojem
            vodite knjige.
          </p>
          <p>
            Trebaju vam osnovni podaci: naziv, djelatnost, grad i podaci o
            vlasniku. Sve se kasnije može dopuniti u Postavkama.
          </p>
        </div>
      </div>
    </Modal>
  );
}
