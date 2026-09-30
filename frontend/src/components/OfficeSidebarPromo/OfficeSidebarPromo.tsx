"use client";

import Link from "next/link";
import { trackEvent } from "src/api/activity";
import { OFFICE_PLANS, PLAN_PRICING, calcGross, formatKmOkruglo as km } from "src/data/pricing";
import {
  useOfficeTrial,
  useProbaOdrediste,
  type ProbaOdrediste,
} from "src/components/OfficeTrialCta/OfficeTrialCta";
import styles from "./OfficeSidebarPromo.module.css";

// PK Office reklama uz SPR i GPD obrazac, u dva dijela: Solo (obrtnik vodi
// sam sebi) i paketi za knjigovođe. Ko upravo ručno prepisuje prihode i
// rashode je tačno publika: PK Office ove obrasce pravi sam iz KPR-a.
//
// Dvije forme istog sadržaja, CSS bira koja se vidi:
//  - bočna kolona izvan okvira stranice (860px), prati skrol, od 1440px
//  - traka ispod dugmeta za preuzimanje, ispod 1440px i na mobitelu
// Gosti i prijavljeni bez paketa je vide; ko već ima Office paket ili
// aktivnu Office probu ne vidi ništa. Boje su PK Office-ove (tamnozelena i
// terakota), iste kao PkOfficePromo i SoloReklama, da ne nastane treći stil.
// Cijene se vuku iz cjenovnika (src/data/pricing), pa prate svaku promjenu.

type Blok = "solo" | "tim";
type Stranica = "spr" | "gpd";

const DOGADJAJ: Record<Blok, string> = {
  solo: "OFFICE_SOLO_PROMO_KLIK",
  tim: "OFFICE_PROMO_KLIK",
};

const tim = OFFICE_PLANS.find((p) => p.id === "OFFICE_10")!;
const soloNeto = PLAN_PRICING.OFFICE_1.yearly;
const soloBruto = calcGross(soloNeto);
const timGodisnje = PLAN_PRICING.OFFICE_10.yearly;
// Knjigovođi je mjera trošak po klijentu mjesečno (klijentu naplaćuje
// mjesečno): Tim 800 / 10 obrta / 12 = 6,67, pa "ispod 7 KM"; ako bi cijena
// ikad bila okrugla, "ispod" ne bi bilo tačno, pa se tada piše sam iznos
const poKlijentu = timGodisnje / tim.maxObrta / 12;
const poKlijentuGranica = Math.ceil(poKlijentu);
const poKlijentuFraza =
  poKlijentuGranica > poKlijentu ? `ispod ${poKlijentuGranica} KM` : `${poKlijentuGranica} KM`;

const SADRZAJ: Record<
  Blok,
  { tag: string; naslov: [string, string]; stavke: string[]; traka: string }
> = {
  solo: {
    tag: "PK Office Solo",
    naslov: ["Imate obrt? Vodite ga ", "sami."],
    stavke: [
      "Automatsko knjiženje izvoda",
      "Automatska popuna KPR-a",
      "SPR i GPD jednim klikom iz KPR-a",
      "Fakture, doprinosi vlasnika i uplatnice",
    ],
    traka:
      "Imate obrt? Vodite ga sami: automatsko knjiženje izvoda i popuna KPR-a, SPR i GPD jednim klikom, fakture i doprinosi vlasnika svaki mjesec.",
  },
  tim: {
    tag: "PK Office za knjigovođe",
    naslov: ["Svi obrti ", "na jednom mjestu."],
    stavke: [
      "Grupni uvoz izvoda za sve obrte odjednom",
      "Plate, MIP i KPR iz knjiga",
      "KUF, KIF i PDV prijava",
      "Kalkulacije i zaliha robe",
      "SPR i GPD za svakog klijenta jednim klikom",
    ],
    traka: `Knjigovođa ste? Svi obrti na jednom mjestu: grupni uvoz izvoda, plate, PDV, SPR i GPD iz knjiga za svakog klijenta. Do ${tim.maxObrta} obrta za ${km(timGodisnje)} KM godišnje, ${poKlijentuFraza} mjesečno po klijentu.`,
  },
};

const CIJENA: Record<Blok, { iznos: string; napomena: React.ReactNode; traka: string }> = {
  solo: {
    iznos: `${km(soloNeto)} KM`,
    // "PDV-om" se ne smije prelomiti na crtici u uskoj koloni
    napomena: (
      <>
        godišnje + PDV za 1 obrt,{" "}
        <span className={styles.nb}>{km(soloBruto)} KM sa PDV-om</span>
      </>
    ),
    traka: `${km(soloNeto)} KM godišnje + PDV`,
  },
  tim: {
    iznos: `${km(timGodisnje)} KM`,
    // "ispod 7 KM" ostaje u jednom redu (broj se ne odvaja od KM)
    napomena: (
      <>
        godišnje + PDV za do {tim.maxObrta} obrta,{" "}
        <span className={styles.nb}>{poKlijentuFraza}</span> mjesečno po klijentu
      </>
    ),
    traka: `${km(timGodisnje)} KM godišnje + PDV, do ${tim.maxObrta} obrta`,
  },
};

function Kvacica() {
  return (
    <svg
      className={styles.kvacica}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Strelica() {
  return (
    <svg
      className={styles.strelica}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export default function OfficeSidebarPromo({
  stranica,
  bezBocnog = false,
}: {
  stranica: Stranica;
  /** desnu kolonu zauzima stub banke partnera: ostaje samo traka */
  bezBocnog?: boolean;
}) {
  const { isLoading, officeAktivan, trialActive } = useOfficeTrial();
  // kud vodi dugme po stanju korisnika: isti hook kao /solo i SoloReklama
  // (gost i prijavljen bez paketa na probu, potrošena proba na predračun,
  // Pro/Business na cjenovnik); Solo blok na Solo probu, knjigovođe na Tim
  const odrediste: Record<Blok, ProbaOdrediste> = {
    solo: useProbaOdrediste("office_1"),
    tim: useProbaOdrediste(null),
  };

  // pretplatnik PK Office-a i korisnik na Office probi ne trebaju reklamu za
  // ono što već imaju; bivši pretplatnik (istekao paket) je opet vidi
  if (isLoading || officeAktivan || trialActive) return null;

  const cta = (blok: Blok) => {
    const o = odrediste[blok];
    const tekst =
      o.vrsta === "predracun"
        ? "Zatraži predračun"
        : o.vrsta === "cjenovnik"
          ? "Pogledaj pakete i cijene"
          : "Isprobaj 30 dana besplatno";
    return { tekst, href: o.href };
  };

  const klik = (blok: Blok, mjesto: "sidebar" | "traka") => () =>
    trackEvent(DOGADJAJ[blok], `${stranica}-${mjesto}`);

  const blokovi: Blok[] = ["solo", "tim"];

  return (
    <>
      {/* bočna kolona: desno od obrasca, prati skrol (samo široki ekrani) */}
      {!bezBocnog && (
      <aside className={styles.bocno} aria-label="PK Office">
        {blokovi.map((blok) => {
          const s = SADRZAJ[blok];
          const c = CIJENA[blok];
          const d = cta(blok);
          return (
            <section key={blok} className={styles.blok} aria-label={s.tag}>
              <span className={styles.tag}>{s.tag}</span>
              <p className={styles.naslov}>
                {s.naslov[0]}
                <em>{s.naslov[1]}</em>
              </p>
              <div className={styles.iznos}>
                {c.iznos}
                <small>{c.napomena}</small>
              </div>
              <ul className={styles.lista}>
                {s.stavke.map((t) => (
                  <li key={t}>
                    <Kvacica />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href={d.href} className={styles.cta} onClick={klik(blok, "sidebar")}>
                {d.tekst}
                <Strelica />
              </Link>
            </section>
          );
        })}
      </aside>
      )}

      {/* traka ispod obrasca: uži ekrani i mobitel */}
      <div className={styles.traka} role="complementary" aria-label="PK Office">
        {blokovi.map((blok) => {
          const s = SADRZAJ[blok];
          const c = CIJENA[blok];
          const d = cta(blok);
          return (
            <div key={blok} className={styles.trakaDio}>
              <span className={styles.tag}>{s.tag}</span>
              <p className={styles.trakaTekst}>{s.traka}</p>
              <div className={styles.trakaDno}>
                <span className={styles.trakaCijena}>{c.traka}</span>
                <Link
                  href={d.href}
                  className={`${styles.cta} ${styles.ctaUsko}`}
                  onClick={klik(blok, "traka")}
                >
                  {d.tekst}
                  <Strelica />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
