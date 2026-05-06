import type { Metadata } from "next";
import AdminPretplate from "src/sections/admin/pretplate/AdminPretplate";

export const metadata: Metadata = {
  title: "Predračuni | Porezni Kalkulator BiH",
  description: "Lista svih predračuna za admina",
};

export default function AdminPretplatePage() {
  return <AdminPretplate />;
}
