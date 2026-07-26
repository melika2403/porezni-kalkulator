// Stranica jednog teksta, ista za vijest i vodič.
// Raspored kao na portalima: lijevo uska traka (autor, brojke, podijeli),
// u sredini tekst, desno najnovije i pozivi. Vodič umjesto "prije X sati"
// pokazuje datum ažuriranja.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import VijestiHeader from "./VijestiHeader";
import { MalaKartica } from "./ClanakKartica";
import PregledBeacon from "./PregledBeacon";
import { PodijeliDugme, UrediDugme } from "./ClanakAkcije";
import { ZnakPK, Kvacica, AvatarSlovo } from "./Potpis";
import Komentari from "./Komentari";
import BrojKomentara from "./BrojKomentara";
import BrojDijeljenja from "./BrojDijeljenja";
import PkOfficeCta from "./PkOfficeCta";
import {
  getClanakServer,
  getClanciServer,
  slikaUrl,
  relativnoVrijeme,
} from "src/lib/vijestiServer";
import { nazivRubrike, putanjaClanka } from "src/data/vijesti";
import styles from "./vijesti.module.css";

const SITE = "https://www.poreznikalkulator.ba";

function datumTekst(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}.`;
}

export default async function ClanakStranica({
  slug,
  ocekivaniTip,
}: {
  slug: string;
  ocekivaniTip: "VIJEST" | "VODIC";
}) {
  const podaci = await getClanakServer(slug);
  if (!podaci) notFound();

  const { clanak, povezani } = podaci;
  // vijest i vodič imaju svoje sekcije; pogrešna adresa vodi na ispravnu
  if (clanak.tip !== ocekivaniTip) {
    redirect(putanjaClanka(clanak.tip, clanak.slug));
  }

  const najnovije = (await getClanciServer({ limit: 6 }))?.items ?? [];
  const slika = slikaUrl(clanak.naslovnaSlika);
  const jeVodic = clanak.tip === "VODIC";
  // Potpis redakcije: prazan potpis znači naš tekst, pa ide naziv sajta.
  // Kvačica se pokazuje samo kad backend potvrdi da je tekst objavio
  // administrator. Tekst bez autora ne dobija kvačicu: oznaka mora imati
  // pokriće, a ne biti posljedica toga što podatak nedostaje.
  const potpis = clanak.autorPotpis || "Porezni Kalkulator";
  const sluzbeni = clanak.sluzbeni === true;
  const schema = {
    "@context": "https://schema.org",
    "@type": jeVodic ? "Article" : "NewsArticle",
    headline: clanak.naslov,
    description: clanak.seoOpis || clanak.sazetak || undefined,
    datePublished: clanak.datumObjave || undefined,
    dateModified: clanak.datumAzuriranja || clanak.datumObjave || undefined,
    image: slika ? [slika] : undefined,
    author: {
      "@type": "Organization",
      name: clanak.autorPotpis || "Porezni Kalkulator BiH",
    },
    publisher: {
      "@type": "Organization",
      name: "Porezni Kalkulator BiH",
      url: SITE,
    },
    mainEntityOfPage: `${SITE}${putanjaClanka(clanak.tip, clanak.slug)}`,
  };

  return (
    <div className={styles.page}>
      <VijestiHeader
        sekcija={jeVodic ? "Vodiči" : "Vijesti"}
        aktivnaRubrika={jeVodic ? undefined : clanak.rubrika}
      />

      {/* Povratak u sekciju: dugme u navbaru vodi na početnu sajta, a čitalac
          se odavde najčešće vraća na listu vijesti odnosno vodiča. */}
      <Link href={jeVodic ? "/vodici" : "/vijesti"} className={styles.nazad}>
        &larr; {jeVodic ? "Svi vodiči" : "Sve vijesti"}
      </Link>

      <header style={{ marginTop: "1.25rem" }}>
        <p className={styles.clanakNadnaslov}>
          <Link
            href={jeVodic ? "/vodici" : `/vijesti/rubrika/${clanak.rubrika}`}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {clanak.nadnaslov || nazivRubrike(clanak.rubrika)}
          </Link>
        </p>
        <h1 className={styles.clanakNaslov}>{clanak.naslov}</h1>
      </header>

      <div className={styles.clanakGrid}>
        {/* ── Lijeva traka ── */}
        <aside className={styles.lijeviRail}>
          <div className={styles.railAutor}>
            {sluzbeni ? <ZnakPK velicina={40} /> : <AvatarSlovo ime={potpis} velicina={40} />}
            <span>
              <span className={styles.railAutorIme}>
                {potpis}
                {sluzbeni && <Kvacica />}
              </span>
              <br />
              <span className={styles.railVrijeme}>
                {jeVodic && clanak.datumAzuriranja
                  ? `ažurirano ${datumTekst(clanak.datumAzuriranja)}`
                  : relativnoVrijeme(clanak.datumObjave)}
              </span>
            </span>
          </div>

          <div className={styles.railBrojke}>
            <BrojKomentara slug={clanak.slug} pocetni={clanak.brojKomentara} />
            <BrojDijeljenja slug={clanak.slug} pocetni={clanak.brojDijeljenja} />
          </div>

          <span className={styles.railOznaka}>
            {clanak.vrijemeCitanja.replace(/\D/g, "") || "1"} min čitanja
          </span>
          <PodijeliDugme naslov={clanak.naslov} slug={clanak.slug} />
          <UrediDugme id={clanak.id} />
        </aside>

        {/* ── Tekst ── */}
        <article className={styles.clanak}>
          {slika && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.clanakSlika}
                style={{ margin: 0 }}
                src={slika}
                alt={clanak.naslovnaAlt || clanak.naslov}
              />
              {clanak.naslovnaAlt && (
                <p className={styles.slikaOpis}>{clanak.naslovnaAlt}</p>
              )}
            </>
          )}

          {clanak.sazetak && <p className={styles.lead}>{clanak.sazetak}</p>}

          {/* sadržaj je sanitiziran na serveru prije upisa u bazu */}
          <div
            className={styles.clanakTijelo}
            dangerouslySetInnerHTML={{ __html: clanak.sadrzaj || "" }}
          />

          {clanak.izvorPropisa && (
            <p className={styles.izvor}>
              <strong>Izvor:</strong> {clanak.izvorPropisa}
            </p>
          )}

          {clanak.tagovi.length > 0 && (
            <div className={styles.tagovi}>
              {clanak.tagovi.map((t) => (
                <Link
                  key={t}
                  href={`/vijesti/pretraga?q=${encodeURIComponent(t)}`}
                  className={styles.tag}
                >
                  {t}
                </Link>
              ))}
            </div>
          )}

          <Komentari slug={clanak.slug} />

          {povezani.length > 0 && (
            <section style={{ marginTop: "2.5rem" }}>
              <div className={styles.blokHead}>
                <h2 className={styles.blokHeadNaslov}>Više na istu temu</h2>
              </div>
              <div className={styles.rijeka}>
                {povezani.map((c) => (
                  <MalaKartica key={c.id} c={c} uRijeci />
                ))}
              </div>
            </section>
          )}
        </article>

        {/* ── Desna traka ── */}
        <aside className={styles.desniRail}>
          <div className={styles.panel}>
            <div className={styles.panelTabs}>
              <span className={`${styles.panelTab} ${styles.panelTabAktivan}`}>
                Najnovije
              </span>
            </div>
            <ul className={styles.panelLista}>
              {najnovije
                .filter((c) => c.id !== clanak.id)
                .map((c) => (
                  <li key={c.id} className={styles.panelItem}>
                    <Link
                      href={putanjaClanka(c.tip, c.slug)}
                      className={styles.panelLink}
                    >
                      <span>
                        <span className={styles.panelNaslov}>{c.naslov}</span>
                        <span className={styles.panelMeta}>
                          <span className={styles.panelRubrika}>
                            {nazivRubrike(c.rubrika)}
                          </span>
                          <span>·</span>
                          <span>{relativnoVrijeme(c.datumObjave)}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
            <Link href="/vijesti" className={styles.panelSve}>
              Sve vijesti &rarr;
            </Link>
          </div>

          <PkOfficeCta />

        </aside>
      </div>

      <PregledBeacon slug={clanak.slug} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </div>
  );
}
