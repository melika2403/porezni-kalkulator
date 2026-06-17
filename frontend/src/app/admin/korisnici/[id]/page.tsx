import type { Metadata } from "next";
import AdminUserDetail from "src/sections/admin/detail/AdminUserDetail";

export const metadata: Metadata = {
  title: "Detalj korisnika | Admin",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminUserDetail userId={Number(id)} />;
}
