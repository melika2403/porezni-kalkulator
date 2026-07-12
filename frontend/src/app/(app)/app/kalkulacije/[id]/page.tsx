"use client";

// Uređivanje postojeće maloprodajne kalkulacije (KCM). Forma se montira tek
// kad detalj stigne (keyed remount) da state krene od snimljenih stavki.
import { use } from "react";
import Link from "next/link";
import { IconArrowLeft, IconLoader2 } from "@tabler/icons-react";
import { usePkOfficeMe } from "src/hooks/usePkOfficeMe";
import { useKalkulacija } from "src/hooks/useKalkulacije";
import { KalkulacijaForm } from "src/sections/kalkulacije/KalkulacijaForm";

export default function UrediKalkulacijuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const kalkulacijaId = Number(id) || null;

  const { data: me } = usePkOfficeMe();
  const activeOrg = me?.activeOrganization ?? me?.organizations?.[0] ?? null;
  const orgId = activeOrg?.id ?? null;

  const { data: detail, isLoading, isError } = useKalkulacija(orgId, kalkulacijaId);

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
          Kalkulacija {detail ? detail.oznaka : ""}
          <span className="text-brand-600" style={{ fontStyle: "italic" }}>
            .
          </span>
        </h1>
      </div>
      {isLoading && (
        <p className="inline-flex items-center gap-2 text-[13px] text-text-tertiary">
          <IconLoader2 size={16} className="animate-spin" />
          Učitavanje kalkulacije...
        </p>
      )}
      {isError && (
        <p className="text-[13px] text-accent-500">
          Kalkulacija nije pronađena.
        </p>
      )}
      {orgId != null && detail && (
        <KalkulacijaForm
          key={`${orgId}-${detail.id}`}
          orgId={orgId}
          initial={detail}
        />
      )}
    </div>
  );
}
