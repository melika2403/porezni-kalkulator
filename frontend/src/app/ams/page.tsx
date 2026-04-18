import type { Metadata } from "next";
import AmsForm from "src/sections/ams/Ams";

export const metadata: Metadata = {
  title: "AMS-1035 obrazac — Akontacija poreza po odbitku | Porezni Kalkulator BiH",
  description:
    "Besplatna izrada AMS-1035 obrasca za akontaciju poreza po odbitku na druge samostalne djelatnosti na prihod iz inostranstva.",
};

export default function AmsPage() {
  return <AmsForm />;
}
