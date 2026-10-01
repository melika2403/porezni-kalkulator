import type { ReactNode } from "react";
import type { ReklamaStranica } from "src/data/partner";
import { getAktivneReklameServer } from "src/lib/partnerServer";
import { PocetneReklame } from "./Kontekst";

/**
 * Omotač stranice sa slotovima partnera (server komponenta): kreative stižu
 * sa HTML-om stranice, pa se ništa ne pomjera kad se učitaju.
 */
export default async function SlotServer({
  stranica,
  children,
}: {
  stranica: ReklamaStranica;
  children: ReactNode;
}) {
  const podaci = await getAktivneReklameServer(stranica);
  return (
    <PocetneReklame stranica={stranica} podaci={podaci}>
      {children}
    </PocetneReklame>
  );
}
