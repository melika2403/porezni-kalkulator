import type { Metadata } from "next";
import AdminObavijesti from "src/sections/admin/obavijesti/AdminObavijesti";

export const metadata: Metadata = {
  title: "Obavijesti | Porezni Kalkulator BiH",
  description: "Objave i obavijesti korisnicima",
};

export default function AdminObavijestiPage() {
  return <AdminObavijesti />;
}
