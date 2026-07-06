"use client";

// Sav sadržaj je u dijeljenom PretplataPanel-u (koristi ga i tab Pretplata
// na marketing profilu); ovdje samo PK Office zaglavlje stranice.
import { PretplataPanel } from "src/sections/pretplata/PretplataPanel";

export default function PretplataPage() {
  return (
    <div className="px-8 py-10 lg:px-14 lg:py-14 max-w-[1100px] mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-100 text-brand-700 text-[11.5px] font-medium tracking-[0.04em] border border-brand-600/15 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
          Račun
        </div>
        <h1 className="font-serif-display text-[clamp(2.4rem,4.5vw,3.6rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
          Pretplata
          <span className="text-brand-600" style={{ fontStyle: "italic" }}>
            .
          </span>
        </h1>
        <p className="text-[15px] leading-7 text-text-tertiary mt-4 max-w-xl">
          Upravljanje planom, naplatom i iskorištenjem.
        </p>
      </div>
      <PretplataPanel />
    </div>
  );
}
