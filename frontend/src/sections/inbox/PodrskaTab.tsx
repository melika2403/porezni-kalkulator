"use client";

// Podrška: live chat sa administracijom koji korisnik može pokrenuti.
// Sekcija je rezervisana, radi se odvojeno od uvoza izvoda.
import { IconHeadset } from "@tabler/icons-react";

export function PodrskaTab() {
  return (
    <div className="rounded-xl border border-cream-300 bg-cream-100 px-10 py-14 text-center">
      <span className="inline-flex w-14 h-14 rounded-full bg-brand-100 text-brand-700 items-center justify-center mb-4">
        <IconHeadset size={26} />
      </span>
      <div className="font-serif-display text-[22px] leading-tight text-text-primary">
        Podrška
      </div>
      <p className="text-[13.5px] leading-6 text-text-tertiary mt-2 max-w-md mx-auto">
        Live chat sa našim timom: postavite pitanje i dobijete odgovor bez
        napuštanja aplikacije. Sekcija je u izradi.
      </p>
    </div>
  );
}
