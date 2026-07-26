import VijestEditor from "src/sections/admin/vijesti/VijestEditor";

// Next 16: params je Promise, pa se čeka prije upotrebe.
export default async function AdminVijestEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VijestEditor id={id} />;
}
