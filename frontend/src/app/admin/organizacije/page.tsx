import type { Metadata } from "next";
import AdminOrganizacije from "src/sections/admin/organizacije/AdminOrganizacije";

export const metadata: Metadata = {
  title: "Organizacije | Porezni Kalkulator BiH",
  description: "Lista svih organizacija za admina",
};

export default function OrganizacijePage() {
  return <AdminOrganizacije />;
}
