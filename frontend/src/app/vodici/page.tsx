import type { Metadata } from "next";
import { OG_IMAGE } from "src/lib/ogImage";
import VijestiHeader from "src/sections/vijesti/VijestiHeader";
import { VodicKartica } from "src/sections/vijesti/ClanakKartica";
import { getClanciServer } from "src/lib/vijestiServer";
import styles from "src/sections/vijesti/vijesti.module.css";

const PAGE_URL = "https://www.poreznikalkulator.ba/vodici";

export const metadata: Metadata = {
  title: "Vodiči: porezi, plate i vođenje obrta u FBiH",
  description:
    "Praktični vodiči kroz poreze, doprinose, plate, PDV i vođenje obrta u FBiH. Objašnjeni postupci, rokovi i iznosi, sa izvorima i primjerima.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    images: OG_IMAGE,
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Vodiči: porezi, plate i vođenje obrta u FBiH",
    description:
      "Praktični vodiči kroz poreze, plate, PDV i vođenje obrta u FBiH, sa rokovima i primjerima.",
  },
};

// Vodiči se slažu po temi, ne po datumu: stari vodič ne postoji, postoji
// ažuriran vodič. Teme su izvedene iz tagova (stara kategorija sa bloga).
function poTemama(vodici: { tagovi: string[] }[]) {
  const teme = new Map<string, number>();
  for (const v of vodici) {
    const tema = v.tagovi[0] || "Ostalo";
    teme.set(tema, (teme.get(tema) ?? 0) + 1);
  }
  return [...teme.keys()];
}

export default async function VodiciPage() {
  const podaci = await getClanciServer({ tip: "VODIC", limit: 50 });
  const vodici = podaci?.items ?? [];
  const teme = poTemama(vodici);

  return (
    <div className={styles.page}>
      <VijestiHeader sekcija="Vodiči" />

      <div className={styles.vodiciUvod}>
        <h1 className={styles.vodiciNaslov}>Vodiči</h1>
        <p className={styles.vodiciTekst}>
          Objašnjenja koja ne zastarijevaju: postupci, rokovi i iznosi za obrte i
          firme u FBiH. Kad se propis promijeni, vodič se ažurira, pa je datum uz
          tekst datum posljednje provjere.
        </p>
      </div>

      {vodici.length === 0 ? (
        <p className={styles.prazno}>Vodiči uskoro stižu.</p>
      ) : (
        teme.map((tema) => {
          const uTemi = vodici.filter((v) => (v.tagovi[0] || "Ostalo") === tema);
          return (
            <section key={tema} style={{ marginBottom: "2.5rem" }}>
              <h2 className={styles.blokNaslov}>{tema}</h2>
              <div className={styles.vodiciGrid}>
                {uTemi.map((c) => (
                  <VodicKartica key={c.id} c={c} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
