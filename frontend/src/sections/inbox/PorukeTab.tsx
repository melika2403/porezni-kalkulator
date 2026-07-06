"use client";

// Poruke i obavijesti: sistemske napomene, upozorenja (rokovi, neobračunate
// plate, dospjele fakture) i live chat sa administracijom. Ovaj tab je
// rezervisan i radi se odvojeno od grupnog uvoza izvoda.
import { IconMessageCircle } from "@tabler/icons-react";

export function PorukeTab() {
  return (
    <div className="rounded-xl border border-cream-300 bg-cream-100 px-10 py-14 text-center">
      <span className="inline-flex w-14 h-14 rounded-full bg-brand-100 text-brand-700 items-center justify-center mb-4">
        <IconMessageCircle size={26} />
      </span>
      <div className="font-serif-display text-[22px] leading-tight text-text-primary">
        Poruke i obavijesti
      </div>
      <p className="text-[13.5px] leading-6 text-text-tertiary mt-2 max-w-md mx-auto">
        Ovdje stižu napomene, upozorenja o rokovima i chat sa podrškom.
        Sekcija je u izradi.
      </p>
    </div>
  );
}
