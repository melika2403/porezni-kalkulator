import type { Metadata } from "next";
import AdminFizickaLica from "src/sections/admin/fizicka-lica/AdminFizickaLica";

export const metadata: Metadata = {
  title: "Fizička lica | Porezni Kalkulator BiH",
  description: "Lista svih fizičkih lica za admina",
};

export default function FizickaLicaPage() {
  return <AdminFizickaLica />;
}
