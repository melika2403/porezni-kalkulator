import type { Metadata } from "next";
import { Suspense } from "react";
import Organizacija from "src/sections/organizacija/Organizacija";

export const metadata: Metadata = {
  title: "Organizacija — Porezni Kalkulator BiH",
  robots: { index: false, follow: false },
};

export default async function OrganizacijaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orgId = Number(id);

  return (
    <Suspense>
      <Organizacija orgId={orgId} />
    </Suspense>
  );
}
