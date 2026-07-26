import type { Metadata } from "next";
import Link from "next/link";
import { OG_IMAGE } from "src/lib/ogImage";
import VijestiHeader from "src/sections/vijesti/VijestiHeader";
import PanelDesno from "src/sections/vijesti/PanelDesno";
import {
  VodecaKartica,
  KarticaSaSlikom,
  BocniZapis,
} from "src/sections/vijesti/ClanakKartica";
import PkOfficeCta from "src/sections/vijesti/PkOfficeCta";
import NovaTemaDugme from "src/sections/vijesti/NovaTemaDugme";
import {
  getNaslovnaServer,
  getTemeServer,
  relativnoVrijeme,
} from "src/lib/vijestiServer";
import { RUBRIKE, nazivRubrike } from "src/data/vijesti";
import styles from "src/sections/vijesti/vijesti.module.css";

const PAGE_URL = "https://www.poreznikalkulator.ba/vijesti";

export const metadata: Metadata = {
  title: "Vijesti: propisi, porezi i plate u FBiH",
  description:
    "Izmjene propisa, porezi i doprinosi, plate, PDV i rokovi u FBiH. Vijesti i objašnjenja za obrtnike, firme i knjigovođe, sa izvorima iz Službenih novina.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    images: OG_IMAGE,
    type: "website",
    locale: "bs_BA",
    url: PAGE_URL,
    siteName: "Porezni Kalkulator BiH",
    title: "Vijesti: propisi, porezi i plate u FBiH",
    description:
      "Izmjene propisa, porezi i doprinosi, plate, PDV i rokovi u FBiH, objašnjeni za obrtnike i knjigovođe.",
  },
};

export default async function VijestiPage() {
  const podaci = await getNaslovnaServer();
  // dvije posljednje aktivne teme (bez prikvačenih na vrhu) drže blok
  // kompaktnim; ostatak je klik dalje
  const teme = (await getTemeServer({ limit: 2, sort: "zadnje" }))?.items ?? [];

  if (!podaci || (!podaci.vodeca && podaci.najnovije.length === 0)) {
    return (
      <div className={styles.page}>
        <VijestiHeader />
        <p className={styles.prazno}>
          Još nema objavljenih tekstova. Uskoro stižu vijesti o propisima,
          porezima i platama.
        </p>
      </div>
    );
  }

  const { vodeca, izdvojeni, najnovije, najcitanije, vodici } = podaci;
  const uVrhu = new Set(
    [vodeca?.id, ...izdvojeni.map((c) => c.id)].filter(Boolean) as number[],
  );

  // blokovi po rubrikama ispod vrha, samo one koje imaju tekstova
  const ostatak = najnovije.filter((c) => !uVrhu.has(c.id));
  const blokovi = RUBRIKE.filter((r) => r.id !== "vodici")
    .map((r) => ({
      rubrika: r,
      // četiri kartice sa slikom plus dva kraća zapisa sa strane
      clanci: ostatak.filter((c) => c.rubrika === r.id).slice(0, 6),
    }))
    .filter((b) => b.clanci.length > 0);

  return (
    <div className={styles.page}>
      <VijestiHeader />

      <div className={styles.topGrid}>
        <div>
          {vodeca && <VodecaKartica c={vodeca} />}
          {izdvojeni.length > 0 && (
            <div className={styles.izdvojeniGrid}>
              {izdvojeni.map((c) => (
                <KarticaSaSlikom key={c.id} c={c} />
              ))}
            </div>
          )}
        </div>

        <div className={styles.side}>
          <PanelDesno najnovije={najnovije} najcitanije={najcitanije} />

          {/* zadnje aktivne rasprave: prostor korisnika vidljiv sa naslovne */}
          <div className={styles.sideBlok}>
            <h2 className={styles.sideNaslov}>Iz rasprava</h2>
            {teme.length === 0 ? (
              <p className={styles.vodiciTekst} style={{ fontSize: 13 }}>
                Postavite prvo pitanje ili otvorite raspravu sa drugim
                knjigovođama i obrtnicima.
              </p>
            ) : (
              <div className={styles.raspraveBlokLista}>
                {teme.map((t) => (
                  <Link
                    key={t.id}
                    href={`/rasprave/${t.slug}`}
                    className={styles.raspraveBlokItem}
                  >
                    <span
                      className={`${styles.raspraveBlokBedz} ${
                        t.vrsta === "PITANJE"
                          ? styles.temaBedzPitanje
                          : styles.temaBedzRasprava
                      }`}
                    >
                      {t.vrsta === "PITANJE" ? "Pitanje" : "Rasprava"}
                    </span>
                    {t.rijesena && (
                      <span
                        className={`${styles.raspraveBlokBedz} ${styles.temaBedzRijeseno}`}
                        style={{ marginLeft: 4 }}
                      >
                        ✓
                      </span>
                    )}
                    <span className={styles.raspraveBlokNaslov}>{t.naslov}</span>
                    <span className={styles.raspraveBlokMeta}>
                      <span>
                        {t.brojOdgovora}{" "}
                        {t.brojOdgovora === 1 ? "odgovor" : "odgovora"}
                      </span>
                      <span>·</span>
                      <span>aktivno {relativnoVrijeme(t.zadnjaAktivnost)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <NovaTemaDugme className={styles.raspraveBlokDugme} />
            <Link href="/rasprave" className={styles.raspraveBlokSve}>
              Sve rasprave &rarr;
            </Link>
          </div>
        </div>
      </div>

      {blokovi.map((b) => (
        <section key={b.rubrika.id} style={{ marginBottom: "2.5rem" }}>
          <div className={styles.blokHead}>
            <h2 className={styles.blokHeadNaslov}>
              <Link href={`/vijesti/rubrika/${b.rubrika.id}`}>
                {nazivRubrike(b.rubrika.id)}
              </Link>
            </h2>
            <Link
              href={`/vijesti/rubrika/${b.rubrika.id}`}
              className={styles.blokSve}
            >
              Pogledaj sve &rarr;
            </Link>
          </div>
          <div className={styles.blokGrid}>
            {b.clanci.slice(0, 4).map((c) => (
              <KarticaSaSlikom key={c.id} c={c} />
            ))}
            {b.clanci.length > 4 && (
              <div className={styles.blokBocni}>
                {b.clanci.slice(4, 6).map((c) => (
                  <BocniZapis key={c.id} c={c} />
                ))}
              </div>
            )}
          </div>
        </section>
      ))}

      {vodici.length > 0 && (
        <section style={{ marginBottom: "2.5rem" }}>
          <div className={styles.blokHead}>
            <h2 className={styles.blokHeadNaslov}>
              <Link href="/vodici">Vodiči</Link>
            </h2>
            <Link href="/vodici" className={styles.blokSve}>
              Pogledaj sve &rarr;
            </Link>
          </div>
          <div className={styles.blokGrid}>
            {vodici.slice(0, 4).map((c) => (
              <KarticaSaSlikom key={c.id} c={c} />
            ))}
            {vodici.length > 4 && (
              <div className={styles.blokBocni}>
                {vodici.slice(4, 6).map((c) => (
                  <BocniZapis key={c.id} c={c} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <PkOfficeCta varijanta="siroka" />
    </div>
  );
}
