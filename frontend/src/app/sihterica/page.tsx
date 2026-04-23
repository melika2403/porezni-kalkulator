import type { Metadata } from "next";
import Sihterica from "src/sections/sihterica/Sihterica";

export const metadata: Metadata = {
  title: "Šihterica — Evidencija radnog vremena | Porezni Kalkulator BiH",
  description: "Online evidencija radnog vremena. Popunite šihtericu za radnike i preuzmite popunjeni obrazac u PDF formatu.",
};

export default function SihtenicaPage() {
  return <Sihterica />;
}
