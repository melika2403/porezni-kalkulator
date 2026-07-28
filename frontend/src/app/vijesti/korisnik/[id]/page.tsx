import type { Metadata } from "next";
import Link from "next/link";
import VijestiHeader from "src/sections/vijesti/VijestiHeader";
import ProfilNeotvoren from "src/sections/vijesti/ProfilNeotvoren";
import { Avatar, Kvacica } from "src/sections/vijesti/Potpis";
import ProfilPostavke from "src/sections/vijesti/ProfilPostavke";
import MojaObavjestenja from "src/sections/vijesti/MojaObavjestenja";
import { relativnoVrijeme } from "src/lib/vijestiServer";
import { putanjaClanka } from "src/data/vijesti";
import type { JavniProfil } from "src/api/vijestiKomentari";
import styles from "src/sections/vijesti/vijesti.module.css";

// Profil komentatora se ne indeksira: to je korisnički sadržaj, ne naš.
export const metadata: Metadata = {
  title: "Profil komentatora",
  robots: { index: false, follow: false },
};

async function dohvatiProfil(id: string): Promise<JavniProfil | null> {
  const backend =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:4000";
  try {
    const res = await fetch(`${backend}/api/vijesti/korisnik/${id}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok: boolean; data?: JavniProfil };
    return json.ok ? (json.data ?? null) : null;
  } catch {
    return null;
  }
}

function datum(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}.`;
}

export default async function ProfilKomentatoraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profil = await dohvatiProfil(id);
  // profil postoji tek kad korisnik izabere potpis; vlasniku naloga se tu
  // ponudi izbor korisničkog imena umjesto sirovog 404
  if (!profil) {
    return (
      <div className={styles.page}>
        <VijestiHeader bezAktivne />
        <ProfilNeotvoren profilId={Number(id) || 0} />
      </div>
    );
  }

  const { korisnik, komentari } = profil;

  return (
    <div className={styles.page}>
      <VijestiHeader bezAktivne />

      <div className={styles.profilHead}>
        <Avatar slika={korisnik.avatar} sluzbeni={korisnik.sluzbeni} ime={korisnik.potpis} velicina={54} />
        <div>
          <h1 className={styles.profilIme}>
            {korisnik.potpis}
            {korisnik.sluzbeni && <Kvacica velicina={17} />}
          </h1>
          <p className={styles.profilMeta}>
            Komentariše od {datum(korisnik.clanOd)} &middot;{" "}
            {korisnik.brojKomentara}{" "}
            {korisnik.brojKomentara === 1 ? "komentar" : "komentara"}
          </p>
        </div>
      </div>

      <ProfilPostavke profilId={korisnik.id} />
      <MojaObavjestenja profilId={korisnik.id} />

      {komentari.length === 0 ? (
        <p className={styles.prazno}>Ovaj korisnik još nema komentara.</p>
      ) : (
        <div className={styles.komLista} style={{ gap: "1rem" }}>
          {komentari.map((k) => (
            <div key={k.id} className={styles.profilKomentar}>
              {k.clanak && (
                <p className={styles.profilClanak}>
                  uz tekst{" "}
                  <Link href={`${putanjaClanka(k.clanak.tip, k.clanak.slug)}#komentari`}>
                    {k.clanak.naslov}
                  </Link>
                </p>
              )}
              {k.tema && (
                <p className={styles.profilClanak}>
                  u raspravi{" "}
                  <Link href={`/rasprave/${k.tema.slug}#komentari`}>
                    {k.tema.naslov}
                  </Link>
                </p>
              )}
              <p className={styles.komTekst}>{k.tekst}</p>
              <span className={styles.komVrijeme}>
                {relativnoVrijeme(k.createdAt)} &middot; {k.glasovi} glasova
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
