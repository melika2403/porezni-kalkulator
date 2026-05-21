import { notFound } from "next/navigation";
import RadnikDossier from "src/sections/aktivni-radnici/RadnikDossier";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function RadnikDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workerId = Number(id);
  if (!Number.isInteger(workerId) || workerId <= 0) notFound();
  return <RadnikDossier workerId={workerId} />;
}
