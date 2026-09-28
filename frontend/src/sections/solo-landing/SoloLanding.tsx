import Link from "next/link";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBook,
  IconBuildingBank,
  IconCircleCheck,
  IconClock,
  IconCoins,
  IconFileInvoice,
  IconFileText,
  IconListCheck,
  IconPackage,
  IconTransfer,
  IconUsers,
  IconWallet,
  IconWorld,
} from "@tabler/icons-react";
import FaqSection from "src/components/FaqSection/FaqSection";
import SoloUsteda from "src/sections/freelancer/SoloUsteda";
import { formatKmOkruglo as km } from "src/data/pricing";
import { FeatGrid, type FeatItem } from "src/sections/pk-office-landing/FeatGrid";
import { SOLO_BRUTO, SOLO_FAQ, SOLO_MJESECNO, SOLO_NETO } from "./faq";
import SoloCta from "./SoloCta";
// Isti vizuelni jezik kao /pk-office (tamnozelena, sage, terakota): landing
// Sola je varijanta istog proizvoda, pa dijeli i CSS modul, bez trećeg stila.
import styles from "src/sections/pk-office-landing/pkOffice.module.css";

// Mjesečna rutina, isti redoslijed kao u uputstvu "Vodim knjige sam sebi".
const KORACI: FeatItem[] = [
  {
    icon: IconFileInvoice,
    name: "1. Faktura kupcu",
    desc: "Nova faktura je uvijek jedan klik. Kupca izabereš iz šifarnika, PDF preuzmeš ili pošalješ na email. Za stranog kupca jedan prekidač: bez PDV-a, u eurima, dvojezično.",
  },
  {
    icon: IconBuildingBank,
    name: "2. Izvod se sam proknjiži",
    desc: "Početkom mjeseca učitaš PDF izvod iz e-bankinga. Uplate kupaca se vežu za fakture, troškovi dobiju kategoriju, ti samo potvrdiš. Tek potvrđeno ulazi u KPR.",
  },
  {
    icon: IconCoins,
    name: "3. Doprinosi do 10. u mjesecu",
    desc: "Doprinosi vlasnika za prošli mjesec se obračunaju sami, uplatnice preuzmeš i platiš, Obrazac 2002 predaš. Kad uplata stigne na izvod, stavka na listi se zazeleni.",
  },
  {
    icon: IconFileText,
    name: "4. Kraj godine iz knjiga",
    desc: "U januaru SPR-1053 nastaje iz KPR-a, GPD-1051 iz SPR-a, uz podatke za uplatu. Zaključak godine i arhiva u ZIP-u su na istom ekranu, sa vodičem korak po korak.",
    wide: true,
  },
];

const FUNKCIJE: FeatItem[] = [
  {
    icon: IconFileInvoice,
    name: "Fakture i predračuni",
    desc: "Numeracija, kartice kupaca, dospjele obaveze, ponavljajuće fakture koje se same izdaju svakog mjeseca. Na bosanskom, engleskom ili dvojezično.",
  },
  {
    icon: IconBuildingBank,
    name: "Bankovni izvodi",
    desc: "PDF izvodi UniCredit, Raiffeisen, Intesa, Sparkasse, KIB, BBI, MF i Ziraat banke se učitaju i proknjiže sami. Prepoznavanje uči iz tvojih potvrda.",
  },
  {
    icon: IconFileText,
    name: "KPR-1041 i obrasci",
    desc: "Knjiga prihoda i rashoda se vodi sama. SPR, GPD, ČOK i ONŠ se pripreme iz knjiga, sa iznosima i računima za uplatu.",
  },
  {
    icon: IconCoins,
    name: "Doprinosi vlasnika",
    desc: "Mjesečni obračun doprinosa vlasnika obrta, uplatnice spremne za banku i Obrazac 2002 za Poreznu upravu.",
  },
  {
    icon: IconListCheck,
    name: "Lista obaveza i uputstva",
    desc: "Naslovnica ti svakog mjeseca kaže šta treba uraditi i dokle si stigao. Uputstva Prvi mjesec, Kraj godine i Rječnik pojmova pisana su bez žargona.",
  },
  {
    icon: IconWorld,
    name: "PK Freelancer uključen",
    desc: "Honorar iz inostranstva van djelatnosti obrta? Evidencija AMS-1035 uplata, rokovi i GPD su u paketu.",
  },
  {
    icon: IconPackage,
    name: "Dodatni moduli kad zatrebaju",
    desc: "Radnici i plate (listići na email, MIP, prijave), roba i maloprodaja (kalkulacije, lager, popis), blagajna, putni nalozi, stalna sredstva. Uključiš u upitniku, obračun je isti kao u punom PK Office-u.",
    wide: true,
  },
];

const ZA_KOGA: FeatItem[] = [
  {
    icon: IconUsers,
    name: "Najbolje odgovara",
    desc: "Obrt sa jednim vlasnikom, bez radnika, usluge za domaće ili strane kupce: IT, dizajn, prevođenje, konsalting, marketing, frizer, servis, zanat.",
  },
  {
    icon: IconPackage,
    name: "Radi i kad imaš",
    desc: "Radnike, robu u maloprodaji, blagajnu, službena putovanja ili PDV. Uključiš odgovarajući modul i dobiješ iste ekrane koje koriste knjigovođe.",
  },
  {
    icon: IconBook,
    name: "Kad ipak treba knjigovođa",
    desc: "D.o.o. (dvojno knjigovodstvo), više djelatnosti sa posebnim porezima ili situacije koje traže savjet. Tada knjigovođu dodaš kao korisnika i radite u istim knjigama.",
  },
];

// Primjer Solo naslovnice: lista obaveza mjeseca sa statusom, kao u aplikaciji.
const OBAVEZE = [
  { t: "Izvod za august učitan", m: "Raiffeisen, izvod br. 8", ok: true },
  { t: "Transakcije povezane i proknjižene", m: "14 stavki, sve razvrstano", ok: true },
  { t: "Doprinosi vlasnika za august, Obrazac 2002", m: "rok 10.09.2026.", ok: false },
  { t: "Akontacija poreza na dohodak", m: "rok 10.09.2026.", ok: false },
];

const CIJENA_STAVKE: [string, string][] = [
  ["30 dana besplatno", "proba se aktivira jednim klikom"],
  ["Lista obaveza svaki mjesec", "rok, status i link na ekran gdje se rješava"],
  ["Izvodi i KPR sami", "ti samo potvrdiš stavke"],
  ["Doprinosi vlasnika", "uplatnice i Obrazac 2002 svaki mjesec"],
  ["Besplatan uvoz", "partneri, artikli, radnici i izvodi iz starog programa"],
  ["Rast bez seobe", "prelaz na Start ili Tim, podaci ostaju"],
];

export default function SoloLanding() {
  return (
    <main className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.badge}>
          <span className={styles.badgeDot} />
          PK Office Solo
        </span>
        <h1 className={styles.h1}>
          Vodiš obrt sam? <em>Knjige bez knjigovođe.</em>
        </h1>
        <p className={styles.sub}>
          Jedan obrt, kratak meni i lista šta treba uraditi svakog mjeseca.
          Fakture, izvodi koji se sami knjiže, KPR, doprinosi vlasnika i obrasci
          na kraju godine. {km(SOLO_NETO)} KM godišnje + PDV, prvih 30 dana
          besplatno.
        </p>
        <div className={styles.ctaRow}>
          <SoloCta izvor="solo-hero" />
          <Link href="/pk-office" className={styles.btnGhost}>
            Knjigovođa si? Puni PK Office
          </Link>
        </div>
        <p className={styles.heroNote}>
          Bez kartice, plaćanje po predračunu. Prikazani podaci u pregledu su
          primjer.
        </p>
      </section>

      {/* Preview: Solo naslovnica sa listom obaveza */}
      <section className={styles.previewWrap}>
        <div className={styles.window}>
          <div className={styles.windowBar}>
            <span className={styles.dot} style={{ background: "#e06c5a" }} />
            <span className={styles.dot} style={{ background: "#e3b341" }} />
            <span className={styles.dot} style={{ background: "#5aa86f" }} />
            <span className={styles.windowUrl}>app.poreznikalkulator.ba</span>
          </div>
          <div className={styles.windowBody}>
            <p className={styles.greet}>Dobar dan.</p>
            <p className={styles.greetSub}>
              septembar 2026. · Moj obrt · vodim sam sebi
            </p>

            <div className={styles.rows}>
              <div className={styles.rowsHead}>Šta trebam ovaj mjesec</div>
              {OBAVEZE.map((o) => {
                const status = o.ok ? styles.statusOk : styles.statusCeka;
                return (
                  <div key={o.t} className={styles.row}>
                    <span className={`${styles.rowIcon} ${status}`}>
                      {o.ok ? <IconCircleCheck size={16} /> : <IconClock size={16} />}
                    </span>
                    <div className={styles.rowMain}>
                      <p className={styles.rowTitle}>{o.t}</p>
                      <p className={styles.rowMeta}>{o.m}</p>
                    </div>
                    <span className={`${styles.catChip} ${styles.catChipURedu} ${status}`}>
                      {o.ok ? "gotovo" : "čeka"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className={`${styles.kpiGrid} ${styles.kpiGridPoslijeListe}`}>
              <div className={styles.kpi}>
                <span className={styles.kpiIcon} style={{ background: "#d6e8d9", color: "#3a5c42" }}>
                  <IconArrowDownLeft size={17} />
                </span>
                <p className={styles.kpiLabel}>Naplaćeno</p>
                <p className={styles.kpiValue}>4.250,00</p>
              </div>
              <div className={styles.kpi}>
                <span className={styles.kpiIcon} style={{ background: "#ede8db", color: "#7a8a7d" }}>
                  <IconArrowUpRight size={17} />
                </span>
                <p className={styles.kpiLabel}>Plaćeno</p>
                <p className={styles.kpiValue}>1.180,40</p>
              </div>
              <div className={styles.kpi}>
                <span className={styles.kpiIcon} style={{ background: "#f7e9df", color: "#c8622a" }}>
                  <IconFileInvoice size={17} />
                </span>
                <p className={styles.kpiLabel}>Otvorene fakture</p>
                <p className={styles.kpiValue}>1</p>
              </div>
              <div className={styles.kpi}>
                <span className={styles.kpiIcon} style={{ background: "#d6e8d9", color: "#3a5c42" }}>
                  <IconWallet size={17} />
                </span>
                <p className={styles.kpiLabel}>Stanje računa</p>
                <p className={styles.kpiValue}>6.930,15</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mjesec u četiri koraka */}
      <section className={styles.features}>
        <h2 className={styles.featuresTitle}>Mjesec u četiri koraka</h2>
        <p className={styles.featuresSub}>
          Isti redoslijed koji ti Solo pokazuje na naslovnici. Većina stavki se
          sama zazeleni čim potvrdiš uplate sa izvoda.
        </p>
        <FeatGrid items={KORACI} />
      </section>

      {/* Šta je u paketu */}
      <section className={styles.features}>
        <h2 className={styles.featuresTitle}>Šta je u Solu</h2>
        <p className={styles.featuresSub}>
          Isti motor kao PK Office koji koriste knjigovođe, samo sa kraćim
          menijem i vođenjem za ruku.
        </p>
        <FeatGrid items={FUNKCIJE} />
        <p className={styles.featNapomena}>
          Napomena: aplikacija računa i priprema obrasce, ali ih ne predaje
          umjesto tebe. Obrazac 2002, PDV prijavu i godišnje obrasce predaješ
          sam, elektronski ili na šalteru. Nema integracije sa fiskalnim kasama,
          dnevni pazar se unosi ili povlači sa izvoda.
        </p>
      </section>

      {/* Za koga je */}
      <section className={styles.features}>
        <h2 className={styles.featuresTitle}>Za koga je Solo</h2>
        <p className={styles.featuresSub}>
          Pojednostavljenje znači manje ekrana i jasan redoslijed, ne manje
          knjigovodstva. Obračun je uvijek isti.
        </p>
        <FeatGrid items={ZA_KOGA} />
      </section>

      {/* Cijena + kalkulator uštede */}
      <section className={styles.plan} id="cijena">
        <div className={styles.planCard}>
          <span className={styles.planBadge}>
            <span className={styles.planBadgeDot} />
            Cijena
          </span>
          <h2>
            {km(SOLO_NETO)} KM godišnje + PDV. Jedan obrt.
          </h2>
          <p className={styles.planLead}>
            {km(SOLO_BRUTO)} KM sa PDV-om, oko {km(SOLO_MJESECNO)} KM mjesečno.
            Sve PK Office funkcije za tvoj obrt, Business funkcije na Poreznom
            Kalkulatoru i PK Freelancer. Bez kartice, plaćanje po predračunu.
          </p>
          <div className={styles.planFeatures}>
            {CIJENA_STAVKE.map(([title, desc]) => (
              <div key={title} className={styles.planFeat}>
                <IconCircleCheck size={19} className={styles.planFeatIcon} />
                <span className={styles.planFeatText}>
                  <strong>{title}</strong>, {desc}
                </span>
              </div>
            ))}
          </div>
          <SoloUsteda className={styles.ustedaOkvir} />
          <div className={styles.planCtaRow}>
            <SoloCta className={styles.planCtaBtn} izvor="solo-cijena" />
            <Link href="/pretplate#pk-office" className={styles.planCtaGhost}>
              Svi PK Office paketi i cijene
            </Link>
          </div>
          <p className={styles.planFine}>
            Solo uključuje PK Freelancer. Viši paketi (Start, Tim, Agencija)
            uključuju Solo režim za svaki obrt koji ga zatraži.
          </p>
        </div>
      </section>

      {/* FAQ, u istoj širini kao ostale sekcije */}
      <section className={`${styles.features} ${styles.featuresBezVrha}`}>
        <FaqSection items={SOLO_FAQ} />
      </section>

      {/* Završni CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaCard}>
          <h2>Prvi mjesec sam, uz vodstvo.</h2>
          <p>
            Registruj se, aktiviraj 30 dana Solo probe i učitaj prvi izvod.
            Uputstvo Prvi mjesec vodi korak po korak, a ako zapneš, podrška je
            u aplikaciji.
          </p>
          <div className={styles.ctaRow}>
            <SoloCta izvor="solo-dno" />
            <Link href="/freelancer" className={styles.btnGhost}>
              <IconTransfer size={16} />
              Nemaš obrt? PK Freelancer
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
