import type { Metadata } from "next";
import AdminPodrska from "src/sections/admin/podrska/AdminPodrska";

export const metadata: Metadata = {
  title: "Podrška | Porezni Kalkulator BiH",
  description: "Live chat podrška sa korisnicima",
};

export default function AdminPodrskaPage() {
  return <AdminPodrska />;
}
