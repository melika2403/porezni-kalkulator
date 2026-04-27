import type { Metadata } from "next";
import Sihterica from "src/sections/sihterica/Sihterica";

export const metadata: Metadata = {
  title: "Šihterica — evidencija radnog vremena radnika u FBiH | Porezni Kalkulator BiH",
  description:
    "Kako popuniti šihtericu? Online evidencija radnog vremena za radnike po propisima FBiH. Popunite mjesečnu šihtericu i preuzmite popunjeni PDF obrazac, besplatno i bez registracije.",
  alternates: { canonical: "https://poreznikalkulator.ba/sihterica" },
};

export default function SihtenicaPage() {
  return <Sihterica />;
}
