"use client";

// Unos nove maloprodajne kalkulacije (KCM). Uz ?kopiraj=<id> forma se
// predpopuni postojećom kalkulacijom (dobavljač + sve stavke); broj računa i
// datumi se unose iznova, a spremanjem nastaje NOVA kalkulacija.
import { use } from "react";
import Link from "next/link";
import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { useKalkulacija } from "src/hooks/useKalkulacije";
import { KalkulacijaForm } from "src/sections/kalkulacije/KalkulacijaForm";

export default function NovaKalkulacijaPage({
  searchParams,
}: {
  searchParams: Promise<{ kopiraj?: string }>;
}) {
  const { kopiraj } = use(searchParams);
  const kopirajId = Number(kopiraj) || null;

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const {
    data: predlozak,
    isLoading,
    isError,
  } = useKalkulacija(orgId, kopirajId);

  return (
    <div className="px-8 py-8 lg:px-12 lg:py-10">
      <div className="mb-6">
        <Link
          href="/app/kalkulacije"
          className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-info-bg text-info text-[13px] font-medium mb-4 transition-colors hover:brightness-95"
        >
          <IconArrowLeft
            size={16}
            className="transition-transform group-hover:-translate-x-0.5"
          />
          Nazad na kalkulacije
        </Link>
        <h1 className="font-serif-display text-[clamp(1.8rem,3vw,2.4rem)] leading-[1.05] tracking-[-0.02em] text-text-primary">
          Nova kalkulacija
          <span className="text-brand-600" style={{ fontStyle: "italic" }}>
            .
          </span>
        </h1>
        {kopirajId != null && predlozak && (
          <p className="text-[13px] text-text-tertiary mt-2">
            Kopija kalkulacije {predlozak.oznaka} (
            {predlozak.partner?.name ?? "bez dobavljača"}). Stavke i dobavljač
            su preneseni; unesite broj i datum novog računa.
          </p>
        )}
      </div>
      {kopirajId != null && isLoading && (
        <p className="inline-flex items-center gap-2 text-[13px] text-text-tertiary">
          <IconLoader2 size={16} className="animate-spin" />
          Učitavanje kalkulacije za kopiranje...
        </p>
      )}
      {kopirajId != null && isError && (
        <p className="text-[13px] text-accent-500">
          Kalkulacija za kopiranje nije pronađena.
        </p>
      )}
      {orgId != null && kopirajId == null && (
        <KalkulacijaForm key={orgId} orgId={orgId} initial={null} />
      )}
      {orgId != null && kopirajId != null && predlozak && (
        <KalkulacijaForm
          key={`${orgId}-kopija-${predlozak.id}`}
          orgId={orgId}
          initial={predlozak}
          kopija
        />
      )}
    </div>
  );
}
