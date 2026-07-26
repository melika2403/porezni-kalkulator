import type { Metadata } from "next";
import Link from "next/link";
import { OG_IMAGE } from "src/lib/ogImage";
import VijestiHeader from "src/sections/vijesti/VijestiHeader";
import RaspraveLista from "src/sections/vijesti/RaspraveLista";
import NovaTemaDugme from "src/sections/vijesti/NovaTemaDugme";
import { getTemeServer } from "src/lib/vijestiServer";
import { RUBRIKE } from "src/data/vijesti";
import styles from "src/sections/vijesti/vijesti.module.css";

const PAGE_URL = "https://www.poreznikalkulator.ba/rasprave";

export const metadata: Metadata = {
  title: "Rasprave: pitanja i iskustva knjigovođa i obrtnika",
  description:
    "Pitanja i odgovori o porezima, platama, PDV-u i vođenju obrta u FBiH. Rasprave knjigovođa i obrtnika, uz odgovore redakcije Poreznog Kalkulatora.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    images: OG_IMAGE,
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Rasprave: pitanja i iskustva knjigovođa i obrtnika",
    description:
      "Pitanja i odgovori o porezima, platama, PDV-u i vođenju obrta u FBiH.",
  },
};

const FILTERI: { id: string; naziv: string }[] = [
  { id: "", naziv: "Sve teme" },
  { id: "PITANJE", naziv: "Pitanja" },
  { id: "RASPRAVA", naziv: "Rasprave" },
  { id: "rijesene", naziv: "Riješeno" },
];

export default async function RaspravePage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string; rubrika?: string }>;
}) {
  const { f, rubrika } = await searchParams;
  const filter = f || "";
  // prva strana; dalje listanje ide kroz paginaciju u RaspraveLista (20/strani)
  const podaci = await getTemeServer({
    vrsta: filter === "PITANJE" || filter === "RASPRAVA" ? filter : undefined,
    filter: filter === "rijesene" ? "rijesene" : undefined,
    rubrika: rubrika || undefined,
    limit: 20,
  });
  const teme = podaci?.items ?? [];

  // gradi adresu iz kombinacije vrste i oblasti; null znači "ukloni"
  const linkZa = (noviF: string | null, novaRubrika: string | null) => {
    const q = new URLSearchParams();
    if (noviF) q.set("f", noviF);
    if (novaRubrika) q.set("rubrika", novaRubrika);
    const qs = q.toString();
    return `/rasprave${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className={styles.page}>
      <VijestiHeader sekcija="Rasprave" />

      <div className={styles.vodiciUvod} style={{ marginBottom: "1.25rem" }}>
        <div className={styles.komHead}>
          <h1 className={styles.vodiciNaslov}>Rasprave</h1>
          <NovaTemaDugme />
        </div>
        <p className={styles.vodiciTekst}>
          Pitanja, iskustva iz prakse i rasprave o porezima, platama i vođenju
          obrta. Odgovori korisnika nisu službeni savjet; odgovori redakcije
          nose našu oznaku.
        </p>
      </div>

      {/* prvi red: vrsta teme; drugi red: oblast (klik na aktivnu je uklanja) */}
      <div className={styles.filterTrake}>
        <div className={styles.rubrike}>
          {FILTERI.map((x) => (
            <Link
              key={x.id}
              href={linkZa(x.id || null, rubrika || null)}
              className={`${styles.rubrikaLink} ${filter === x.id ? styles.rubrikaAktivna : ""}`}
            >
              {x.naziv}
            </Link>
          ))}
        </div>
        <div className={styles.rubrike}>
          <span className={styles.filterOznaka}>Oblast:</span>
          {RUBRIKE.filter((r) => r.id !== "vodici").map((r) => {
            const aktivna = rubrika === r.id;
            return (
              <Link
                key={r.id}
                href={linkZa(filter || null, aktivna ? null : r.id)}
                className={`${styles.oblastPill} ${aktivna ? styles.oblastPillAktivna : ""}`}
                title={aktivna ? "Ukloni filter" : `Prikaži samo ${r.naziv}`}
              >
                {r.naziv}
                {aktivna && <span aria-hidden="true"> ✕</span>}
              </Link>
            );
          })}
        </div>
      </div>

      <RaspraveLista
        pocetne={teme}
        ukupno={podaci?.total ?? teme.length}
        vrsta={filter === "PITANJE" || filter === "RASPRAVA" ? filter : undefined}
        rubrika={rubrika || undefined}
        filter={filter === "rijesene" ? "rijesene" : undefined}
      />
    </div>
  );
}
