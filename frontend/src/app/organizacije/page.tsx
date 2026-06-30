import type { Metadata } from "next";
import Organizacije from "src/sections/organizacije/Organizacije";

export const metadata: Metadata = {
  title: "Moje organizacije i klijenti",
  description:
    "Centralni pregled svih vaših organizacija i klijentskih organizacija u jednom mjestu, status obračunatih plata po mjesecu, broj radnika i brze akcije.",
};

export default function OrganizacijePage() {
  return <Organizacije />;
}
