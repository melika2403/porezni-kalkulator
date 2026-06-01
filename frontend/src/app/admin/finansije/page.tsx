import type { Metadata } from "next";
import AdminFinansije from "src/sections/admin/finansije/AdminFinansije";

export const metadata: Metadata = {
  title: "Finansije | Porezni Kalkulator BiH",
  description: "Pregled uplata klijenata i troškova za admina",
};

export default function AdminFinansijePage() {
  return <AdminFinansije />;
}
