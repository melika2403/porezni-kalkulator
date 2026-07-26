import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import VijestiHeader from "src/sections/vijesti/VijestiHeader";
import TemaKlijent from "src/sections/vijesti/TemaKlijent";
import { Avatar, Kvacica } from "src/sections/vijesti/Potpis";
import { getTemaServer } from "src/lib/vijestiServer";
import { nazivRubrike } from "src/data/vijesti";
import styles from "src/sections/vijesti/vijesti.module.css";

const SITE = "https://www.poreznikalkulator.ba";

/** "26.07.2026. u 14:32", datum i satnica objave teme. */
function datumIVrijeme(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}. u ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTemaServer(slug);
  if (!t) return {};
  const opis = (t.tekst || "").replace(/\s+/g, " ").slice(0, 160);
  return {
    title: t.naslov,
    description: opis,
    alternates: { canonical: `${SITE}/rasprave/${t.slug}` },
    openGraph: {
      type: "article",
      locale: "bs_BA",
      url: `${SITE}/rasprave/${t.slug}`,
      siteName: "Porezni Kalkulator BiH",
      title: t.naslov,
      description: opis,
    },
  };
}

export default async function TemaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tema = await getTemaServer(slug);
  if (!tema) notFound();

  return (
    <div className={styles.page}>
      <VijestiHeader sekcija="Rasprave" />

      <Link href="/rasprave" className={styles.nazad}>
        &larr; Sve rasprave
      </Link>

      <div className={styles.clanak} style={{ maxWidth: 760, padding: 0, marginTop: "1.25rem" }}>
        <div className={styles.meta} style={{ marginBottom: "0.5rem" }}>
          <span
            className={`${styles.temaBedz} ${
              tema.vrsta === "PITANJE"
                ? styles.temaBedzPitanje
                : styles.temaBedzRasprava
            }`}
          >
            {tema.vrsta === "PITANJE" ? "Pitanje" : "Rasprava"}
          </span>
          {tema.rijesena && (
            <span className={`${styles.temaBedz} ${styles.temaBedzRijeseno}`}>
              ✓ Riješeno
            </span>
          )}
          {tema.zakljucana && (
            <span className={`${styles.temaBedz} ${styles.temaBedzZakljucana}`}>
              Zaključana
            </span>
          )}
          {tema.rubrika && (
            <span className={styles.metaRubrika}>{nazivRubrike(tema.rubrika)}</span>
          )}
        </div>

        <h1 className={styles.clanakNaslov}>{tema.naslov}</h1>

        <div className={styles.clanakMeta}>
          <Avatar
            slika={tema.autor.avatar}
            sluzbeni={tema.autor.sluzbeni}
            ime={tema.autor.potpis}
            velicina={28}
          />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {tema.autor.id ? (
              <Link
                href={`/vijesti/korisnik/${tema.autor.id}`}
                style={{ color: "inherit", fontWeight: 600 }}
              >
                {tema.autor.potpis}
              </Link>
            ) : (
              tema.autor.potpis
            )}
            {tema.autor.sluzbeni && <Kvacica velicina={13} />}
          </span>
          <span>·</span>
          <span>objavljena {datumIVrijeme(tema.createdAt)}</span>
          <span>·</span>
          <span>{tema.brojPregleda} pregleda</span>
        </div>

        {/* tekst teme renderuje TemaKlijent (i dalje je u prvom HTML-u kroz
            SSR), jer se tu po potrebi pretvara u formu za izmjenu */}
        <TemaKlijent tema={tema} />
      </div>
    </div>
  );
}
