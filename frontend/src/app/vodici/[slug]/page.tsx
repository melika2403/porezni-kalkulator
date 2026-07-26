import type { Metadata } from "next";
import { OG_IMAGE } from "src/lib/ogImage";
import ClanakStranica from "src/sections/vijesti/ClanakStranica";
import { getClanakServer, slikaUrl } from "src/lib/vijestiServer";

const SITE = "https://www.poreznikalkulator.ba";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const podaci = await getClanakServer(slug);
  if (!podaci) return {};
  const c = podaci.clanak;
  const url = `${SITE}/vodici/${c.slug}`;
  const slika = slikaUrl(c.naslovnaSlika);
  const opis = c.seoOpis || c.sazetak || undefined;
  return {
    title: c.seoNaslov || c.naslov,
    description: opis,
    alternates: { canonical: url },
    openGraph: {
      images: slika ? [{ url: slika, alt: c.naslovnaAlt || c.naslov }] : OG_IMAGE,
      type: "article",
      locale: "bs_BA",
      url,
      siteName: "Porezni Kalkulator BiH",
      title: c.seoNaslov || c.naslov,
      description: opis,
      publishedTime: c.datumObjave || undefined,
      modifiedTime: c.datumAzuriranja || undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: c.seoNaslov || c.naslov,
      description: opis,
    },
    robots: { index: true, follow: true },
  };
}

export default async function VodicRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ClanakStranica slug={slug} ocekivaniTip="VODIC" />;
}
