import type { Metadata } from "next";
import AdminUplatniRacuni from "src/sections/admin/uplatni-racuni/AdminUplatniRacuni";

export const metadata: Metadata = {
  title: "Uplatni računi | Porezni Kalkulator BiH",
  description: "Šifarnik uplatnih računa javnih prihoda: pregled, izmjene i provjere",
};

export default function AdminUplatniRacuniPage() {
  return <AdminUplatniRacuni />;
}
