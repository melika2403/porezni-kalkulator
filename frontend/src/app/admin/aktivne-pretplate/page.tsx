import type { Metadata } from "next";
import AdminAktivnePretplate from "src/sections/admin/aktivne-pretplate/AdminAktivnePretplate";

export const metadata: Metadata = {
  title: "Pretplate | Porezni Kalkulator BiH",
  description: "Sve pretplate: paketi, periodi i PK Office slotovi",
};

export default function AdminAktivnePretplatePage() {
  return <AdminAktivnePretplate />;
}
