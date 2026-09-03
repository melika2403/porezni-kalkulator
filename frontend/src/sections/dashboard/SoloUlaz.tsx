"use client";

import { IconBuildingStore, IconChecklist, IconFileInvoice, IconCoins } from "@tabler/icons-react";
import { ProfilTab } from "src/components/postavke/ProfilTab";

// Ulaz u PK Office bez ijednog obrta: umjesto modala koji šalje u Postavke,
// forma za prvi obrt je ugrađena u naslovnicu. Poslije kreiranja korisnik
// ostaje na naslovnici i dobija Solo upitnik (?solo=upitnik), pa meni i
// naslovnica odmah odgovaraju načinu na koji vodi knjige.
export function SoloUlaz() {
  return (
    <div className="px-8 py-8 lg:px-12 lg:py-10 max-w-[1100px] mx-auto">
      <div className="rounded-xl bg-cream-100 border border-cream-300 px-6 py-6 mb-6">
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 rounded-xl bg-brand-100 text-brand-700 inline-flex items-center justify-center shrink-0">
            <IconBuildingStore size={24} />
          </span>
          <div>
            <h1 className="font-serif-display text-[26px] leading-tight text-text-primary mb-1">
              Napravimo vaš obrt
            </h1>
            <p className="text-[13.5px] leading-6 text-text-secondary max-w-[640px]">
              Sve u PK Office-u (fakture, izvodi, KPR, doprinosi) vodi se po obrtu,
              pa je prvi korak da ga upišete ovdje. Trebaju vam naziv, JIB, grad i
              djelatnost; ostalo se može dopuniti kasnije. Odmah poslije toga vas
              čekaju dva kratka pitanja koja sužavaju meni na ono što stvarno
              koristite.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">
          {[
            { icon: IconChecklist, t: "1. Upišite obrt", d: "podaci sa rješenja o registraciji" },
            { icon: IconCoins, t: "2. Odgovorite na 2 pitanja", d: "ko vodi knjige i šta koristite" },
            { icon: IconFileInvoice, t: "3. Izdajte prvu fakturu", d: "ili učitajte prvi izvod" },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.t} className="rounded-lg border border-cream-300 bg-cream-50 px-3.5 py-3">
                <div className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
                  <Icon size={15} className="text-brand-600" />
                  {k.t}
                </div>
                <div className="text-[12px] text-text-tertiary mt-0.5">{k.d}</div>
              </div>
            );
          })}
        </div>
      </div>
      <ProfilTab createMode afterCreateHref="/app/dashboard?solo=upitnik" />
    </div>
  );
}
