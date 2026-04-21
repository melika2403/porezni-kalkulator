import type { Metadata } from "next";
import Korisnici from "src/sections/admin/korisnici/Korisnici";

export const metadata: Metadata = {
  title: "Korisnici | Porezni Kalkulator BiH",
  description: "Lista korisnika za admina",
};

export default function KorisniciPage() {
  return <Korisnici />;
}
