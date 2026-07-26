// Poziv na Rasprave na početnoj: promo tekst lijevo, žive teme desno, da
// posjetilac vidi da se tamo stvarno nešto dešava i uđe. Teme se čitaju sa
// kešom od minute (revalidate), da početna ostane statička stranica.
import Link from "next/link";
import styles from "./RaspraveTeaser.module.css";
import { getTemeServer, relativnoVrijeme } from "src/lib/vijestiServer";

/** 1 odgovor, 2 odgovora, 5 odgovora. */
function rijecOdgovor(n: number): string {
  return n % 10 === 1 && n % 100 !== 11 ? "odgovor" : "odgovora";
}

export default async function RaspraveTeaser() {
  const podaci = await getTemeServer({ sort: "zadnje", limit: 3, revalidate: 60 });
  const teme = podaci?.items ?? [];

  return (
    <section className={styles.section} aria-labelledby="rasprave-teaser-title">
      <div className={styles.container}>
        <div className={styles.band}>
          <div className={styles.promo}>
            <div className={styles.label}>Zajednica</div>
            <h2 id="rasprave-teaser-title" className={styles.h2}>
              Imate pitanje iz prakse? <em>Pitajte kolege.</em>
            </h2>
            <p className={styles.tekst}>
              U Raspravama knjigovođe i obrtnici razmjenjuju iskustva o
              porezima, platama, PDV-u i vođenju obrta. Postavite pitanje,
              odgovorite iz svog iskustva ili samo pročitajte šta muči druge.
            </p>
            <ul className={styles.lista}>
              <li>Odgovori kolega iz prakse, ne teorija</li>
              <li>Najbolji odgovor se označava kao rješenje</li>
              <li>Odgovori redakcije nose službenu oznaku</li>
            </ul>
            <div className={styles.akcije}>
              <Link href="/rasprave/nova" className={styles.btnGlavno}>
                Postavi pitanje &rarr;
              </Link>
              <Link href="/rasprave" className={styles.btnSporedno}>
                Pogledaj rasprave
              </Link>
            </div>
          </div>

          {teme.length > 0 && (
            <div className={styles.zive}>
              <div className={styles.ziveNaslov}>
                <span className={styles.zivaTacka} aria-hidden="true" />
                Aktivno u raspravama
              </div>
              {teme.map((t) => (
                <Link
                  key={t.id}
                  href={`/rasprave/${t.slug}`}
                  className={styles.tema}
                >
                  <div className={styles.temaBedzevi}>
                    <span
                      className={`${styles.bedz} ${
                        t.vrsta === "PITANJE" ? styles.bedzPitanje : styles.bedzRasprava
                      }`}
                    >
                      {t.vrsta === "PITANJE" ? "Pitanje" : "Rasprava"}
                    </span>
                    {t.rijesena && (
                      <span className={`${styles.bedz} ${styles.bedzRijeseno}`}>
                        ✓ Riješeno
                      </span>
                    )}
                  </div>
                  <h3 className={styles.temaNaslov}>{t.naslov}</h3>
                  <div className={styles.temaMeta}>
                    <span>{t.autor.potpis}</span>
                    <span>·</span>
                    <span>aktivno {relativnoVrijeme(t.zadnjaAktivnost)}</span>
                    <span>·</span>
                    <span>
                      {t.brojOdgovora} {rijecOdgovor(t.brojOdgovora)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
