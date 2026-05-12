"use client";

import { IconArrowLeft } from "@tabler/icons-react";

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000";

export function BackToMarketingButton() {
  return (
    <a
      href={MARKETING_URL}
      className="group inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-cream-50 hover:bg-cream-200 border border-cream-300 text-[12.5px] text-text-secondary hover:text-text-primary transition-colors"
    >
      <IconArrowLeft
        size={15}
        className="transition-transform group-hover:-translate-x-0.5"
      />
      <span className="font-medium">Porezni Kalkulator</span>
    </a>
  );
}
