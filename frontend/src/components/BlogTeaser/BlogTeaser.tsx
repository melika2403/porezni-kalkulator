// Najnovije vijesti na početnoj, u rasporedu portala: vodeći tekst sa slikom
// lijevo, tri kraća desno. Čita iz baze, pa se sadržaj mijenja objavom u
// adminu, bez deploya. Dok još nema objavljenih vijesti, sekcija pokazuje
// najnovije tekstove uopšte, da ne stoji prazna.
import Link from "next/link";
import styles from "./BlogTeaser.module.css";
import { getClanciServer, relativnoVrijeme, slikaUrl } from "src/lib/vijestiServer";
import { nazivRubrike, putanjaClanka } from "src/data/vijesti";
import type { Clanak } from "src/api/vijesti";

function Meta({ c }: { c: Clanak }) {
  return (
    <div className={styles.meta}>
      <span className={styles.metaRubrika}>{nazivRubrike(c.rubrika)}</span>
      <span>{relativnoVrijeme(c.datumObjave)}</span>
      {c.brojKomentara > 0 && (
        <span className={styles.metaBrojka} title="komentara">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {c.brojKomentara}
        </span>
      )}
    </div>
  );
}

export default async function BlogTeaser() {
  let podaci = await getClanciServer({ tip: "VIJEST", limit: 4 });
  if (!podaci?.items?.length) {
    podaci = await getClanciServer({ limit: 4 });
  }
  const posts = podaci?.items ?? [];
  if (posts.length === 0) return null;
  const [vodeca, ...ostale] = posts;
  const vodecaSlika = slikaUrl(vodeca.naslovnaSlika);

  return (
    <section className={styles.section} aria-labelledby="blog-teaser-title">
      <div className={styles.container}>
        <div className={styles.head}>
          <div className={styles.label}>Vijesti</div>
          <h2 id="blog-teaser-title" className={styles.h2}>
            Propisi i <em>objašnjenja</em>
          </h2>
          <p className={styles.lead}>
            Izmjene propisa, porezi, plate i obrasci u FBiH, sa primjerima,
            brojevima i zakonskom referencom.
          </p>
        </div>

        <div className={styles.portal}>
          <Link
            href={putanjaClanka(vodeca.tip, vodeca.slug)}
            className={styles.vodeca}
          >
            {vodecaSlika ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                className={styles.vodecaSlika}
                src={vodecaSlika}
                alt={vodeca.naslovnaAlt || ""}
              />
            ) : (
              <div className={`${styles.vodecaSlika} ${styles.bezSlike}`}>
                {nazivRubrike(vodeca.rubrika)}
              </div>
            )}
            <Meta c={vodeca} />
            <h3 className={styles.vodecaNaslov}>{vodeca.naslov}</h3>
            {vodeca.sazetak && (
              <p className={styles.vodecaSazetak}>{vodeca.sazetak}</p>
            )}
            <span className={styles.vodecaLink}>Pročitaj &rarr;</span>
          </Link>

          <div className={styles.lista}>
            {ostale.map((p) => {
              const slika = slikaUrl(p.naslovnaSlika);
              return (
                <Link
                  key={p.slug}
                  href={putanjaClanka(p.tip, p.slug)}
                  className={styles.red}
                >
                  {slika ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      className={styles.redSlika}
                      src={slika}
                      alt={p.naslovnaAlt || ""}
                    />
                  ) : (
                    <div className={`${styles.redSlika} ${styles.bezSlike}`} />
                  )}
                  <div className={styles.redTijelo}>
                    <h3 className={styles.redNaslov}>{p.naslov}</h3>
                    <Meta c={p} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className={styles.cta}>
          <Link href="/vijesti" className={styles.ctaBtn}>
            Sve vijesti &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
