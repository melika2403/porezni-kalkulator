import type { Metadata } from "next";
import VijestiHeader from "src/sections/vijesti/VijestiHeader";
import Pretraga from "src/sections/vijesti/Pretraga";
import { MalaKartica } from "src/sections/vijesti/ClanakKartica";
import { getClanciServer } from "src/lib/vijestiServer";
import styles from "src/sections/vijesti/vijesti.module.css";

export const metadata: Metadata = {
  title: "Pretraga vijesti i vodiča",
  description:
    "Pretraga svih vijesti i vodiča o porezima, platama, PDV-u i vođenju obrta u FBiH.",
  // rezultati pretrage se ne indeksiraju, to su unutrašnje stranice
  robots: { index: false, follow: true },
};

export default async function PretragaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const pojam = (q || "").trim();
  // pretraga ide na backendu (naslov, sažetak i cijeli tekst)
  const rezultati = pojam
    ? ((await getClanciServer({ limit: 50, q: pojam }))?.items ?? [])
    : [];

  return (
    <div className={styles.page}>
      <VijestiHeader />

      <div className={styles.vodiciUvod}>
        <h1 className={styles.vodiciNaslov}>Pretraga</h1>
        <div style={{ marginTop: "0.85rem" }}>
          <Pretraga pocetni={pojam} />
        </div>
        {pojam && (
          <p className={styles.vodiciTekst} style={{ marginTop: "0.85rem" }}>
            {rezultati.length === 0
              ? `Nema rezultata za "${pojam}".`
              : `Rezultata za "${pojam}": ${rezultati.length}`}
          </p>
        )}
        {!pojam && (
          <p className={styles.vodiciTekst} style={{ marginTop: "0.85rem" }}>
            Upišite pojam, pretražuju se naslovi, sažeci i cijeli tekstovi.
          </p>
        )}
      </div>

      {rezultati.length > 0 && (
        <div className={styles.rijeka}>
          {rezultati.map((c) => (
            <MalaKartica key={c.id} c={c} uRijeci />
          ))}
        </div>
      )}
    </div>
  );
}
