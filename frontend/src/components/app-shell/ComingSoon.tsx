import { IconClock } from "@tabler/icons-react";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="px-10 py-12 lg:px-16 lg:py-16 max-w-6xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-100 text-brand-700 text-[11.5px] font-medium tracking-[0.04em] border border-brand-600/15 mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
        PK Office · u izradi
      </div>
      <h1 className="font-serif-display text-[clamp(2.4rem,4.5vw,3.6rem)] leading-[1.05] tracking-[-0.02em] text-text-primary max-w-2xl">
        {title}<span className="text-brand-600" style={{ fontStyle: "italic" }}>.</span>
      </h1>
      <p className="text-[15px] leading-7 text-text-tertiary mt-5 max-w-xl">
        Ova sekcija stiže uskoro. Sidebar i navigacija već rade — sadržaj
        dolazi u sljedećem koraku.
      </p>

      <div className="mt-12 rounded-xl border border-cream-300 bg-cream-100 px-10 py-14 lg:px-16 lg:py-20 text-center hover:bg-white transition-colors">
        <span className="inline-flex w-16 h-16 rounded-full bg-brand-100 text-brand-700 items-center justify-center mb-5">
          <IconClock size={28} />
        </span>
        <div className="font-serif-display text-[24px] leading-tight text-text-primary">
          Radimo na ovome
        </div>
        <p className="text-[14px] leading-6 text-text-tertiary mt-2 max-w-sm mx-auto">
          U međuvremenu, koristi besplatne alate na marketing stranici ili Postavke
          za podešavanje obrta.
        </p>
      </div>
    </div>
  );
}
