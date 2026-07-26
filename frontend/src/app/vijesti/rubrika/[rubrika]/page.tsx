import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OG_IMAGE } from "src/lib/ogImage";
import VijestiHeader from "src/sections/vijesti/VijestiHeader";
import RubrikaLista from "src/sections/vijesti/RubrikaLista";
import { getClanciServer } from "src/lib/vijestiServer";
import { RUBRIKE, RUBRIKA_PO_STRANI, nazivRubrike } from "src/data/vijesti";
import styles from "src/sections/vijesti/vijesti.module.css";

const SITE = "https://www.poreznikalkulator.ba";

export function generateStaticParams() {
  return RUBRIKE.filter((r) => r.id !== "vodici").map((r) => ({ rubrika: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ rubrika: string }>;
}): Promise<Metadata> {
  const { rubrika } = await params;
  const naziv = nazivRubrike(rubrika);
  const url = `${SITE}/vijesti/rubrika/${rubrika}`;
  const opis = `${naziv}: vijesti, izmjene propisa i objašnjenja za obrtnike, firme i knjigovođe u FBiH.`;
  return {
    title: `${naziv}, vijesti`,
    description: opis,
    alternates: { canonical: url },
    openGraph: {
      images: OG_IMAGE,
      type: "website",
      locale: "bs_BA",
      url,
      siteName: "Porezni Kalkulator BiH",
      title: `${naziv}, vijesti`,
      description: opis,
    },
  };
}

export default async function RubrikaPage({
  params,
}: {
  params: Promise<{ rubrika: string }>;
}) {
  const { rubrika } = await params;
  // "vodici" nije rubrika rijeke vijesti, vodiči imaju svoju stranicu /vodici.
  // Bez ovoga bi /vijesti/rubrika/vodici bio duplikat sadržaja van sitemapa.
  if (rubrika === "vodici" || !RUBRIKE.some((r) => r.id === rubrika)) notFound();

  // prvih 6 renderuje server, "Učitaj još" dovlači sljedećih 6 na klijentu
  const podaci = await getClanciServer({ rubrika, limit: RUBRIKA_PO_STRANI });
  const clanci = podaci?.items ?? [];

  return (
    <div className={styles.page}>
      <VijestiHeader aktivnaRubrika={rubrika} />
      <h1 className={styles.vodiciNaslov} style={{ margin: "1.75rem 0 1.25rem" }}>
        {nazivRubrike(rubrika)}
      </h1>
      {clanci.length === 0 ? (
        <p className={styles.prazno}>U ovoj rubrici još nema tekstova.</p>
      ) : (
        <RubrikaLista
          rubrika={rubrika}
          pocetni={clanci}
          ukupno={podaci?.total ?? clanci.length}
        />
      )}
    </div>
  );
}
