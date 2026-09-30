import ReklamaEditor from "src/sections/promoter/ReklamaEditor";

// Next 16: params je Promise, pa se čeka prije upotrebe.
export default async function UrediReklamuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReklamaEditor id={id} />;
}
