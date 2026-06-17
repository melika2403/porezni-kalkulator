import type { Metadata } from "next";
import AdminOrgDetail from "src/sections/admin/detail/AdminOrgDetail";

export const metadata: Metadata = {
  title: "Detalj organizacije | Admin",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminOrgDetail orgId={Number(id)} />;
}
