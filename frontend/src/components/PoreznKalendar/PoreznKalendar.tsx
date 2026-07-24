import Link from "next/link";
import styles from "./PoreznKalendar.module.css";

type Item = {
  when: string;
  whenSub?: string;
  title: string;
  desc: string;
  href?: string;
  tag?: "uino" | "fbih" | "poslodavac";
};

const TAG_LABEL: Record<NonNullable<Item["tag"]>, string> = {
  uino: "UINO",
  fbih: "PU FBiH",
  poslodavac: "Poslodavac",
};

const MJESECNO: Item[] = [
  {
    when: "do 10.",
    whenSub: "u mjesecu",
    title: "PDV prijava i uplata",
    desc: "PDV prijava (UINO) za prethodni mjesec: predaja i uplata obaveze.",
    tag: "uino",
  },
  {
    when: "do 10.",
    whenSub: "u mjesecu",
    title: "Obrazac 2002: vlasnici obrta",
    desc: "Mjesečna prijava i uplata poreza i doprinosa za vlasnike obrta i samostalnih djelatnosti, za prethodni mjesec.",
    href: "/prijave-radnika?tab=obracun",
    tag: "fbih",
  },
  {
    when: "do 20.",
    whenSub: "u mjesecu",
    title: "e-KUF i e-KIF",
    desc: "Knjige ulaznih i izlaznih faktura za PDV obveznike, dostavljaju se UINO za prethodni mjesec.",
    tag: "uino",
  },
  {
    when: "do 30. / 31.",
    whenSub: "u mjesecu",
    title: "Obrazac 2001: plate radnika",
    desc: "Mjesečna specifikacija isplata plata, doprinosa i poreza, uplata i predaja PU FBiH za prethodni mjesec.",
    href: "/prijave-radnika?tab=obracun",
    tag: "fbih",
  },
  {
    when: "5 dana",
    whenSub: "od primitka",
    title: "AMS-1035: prihodi iz inostranstva",
    desc: "Akontacija poreza po odbitku za fizička lica koja primaju prihode iz inostranstva. Predaje se u nadležnu ispostavu PU FBiH prema mjestu prebivališta.",
    href: "/ams",
    tag: "fbih",
  },
];

const JS3100: Item[] = [
  {
    when: "dan prije",
    whenSub: "početka rada",
    title: "JS3100: prijava radnika",
    desc: "Prijava osiguranika u Jedinstveni sistem registracije, najkasnije dan prije nego što radnik počne raditi.",
    href: "/prijave-radnika",
    tag: "poslodavac",
  },
  {
    when: "7 dana",
    whenSub: "od prestanka",
    title: "JS3100: odjava radnika",
    desc: "Odjava osiguranika u roku od 7 dana od dana prestanka radnog odnosa.",
    href: "/prijave-radnika",
    tag: "poslodavac",
  },
];

const GODISNJE: Item[] = [
  {
    when: "do 31.03.",
    whenSub: "tekuće godine",
    title: "GPD-1051: godišnja prijava poreza na dohodak",
    desc: "Godišnja prijava poreza na dohodak za fizička lica za prethodnu kalendarsku godinu (npr. do 31.03.2026. za 2025. godinu).",
    href: "/gpd",
    tag: "fbih",
  },
  {
    when: "do 31.03.",
    whenSub: "tekuće godine",
    title: "SPR-1053: specifikacija dohotka",
    desc: "Specifikacija prihoda iz samostalne djelatnosti za prethodnu godinu, predaje se uz GPD-1051 (npr. do 31.03.2026. za 2025. godinu).",
    href: "/spr",
    tag: "fbih",
  },
];

function ItemCard({ item }: { item: Item }) {
  const content = (
    <article className={styles.card}>
      <div className={styles.when}>
        <span className={styles.whenMain}>{item.when}</span>
        {item.whenSub && <span className={styles.whenSub}>{item.whenSub}</span>}
      </div>
      <div className={styles.body}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <p className={styles.cardDesc}>{item.desc}</p>
        {item.tag && (
          <span className={`${styles.tag} ${styles[`tag_${item.tag}`]}`}>
            {TAG_LABEL[item.tag]}
          </span>
        )}
      </div>
    </article>
  );
  return item.href ? (
    <Link href={item.href} className={styles.cardLink}>
      {content}
    </Link>
  ) : (
    content
  );
}

export default function PoreznKalendar() {
  return (
    <section
      id="porezni-kalendar"
      className={styles.section}
      aria-labelledby="porezni-kalendar-title"
    >
      <div className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.head}>
            <div className={styles.label}>
              <span className={styles.labelDot} aria-hidden="true" />
              Rokovi obaveza
            </div>
            <h2 id="porezni-kalendar-title" className={styles.h2}>
              Porezni <em>kalendar</em> FBiH
            </h2>
            <p className={styles.lead}>
              Kada šta predati i uplatiti. Pregled najvažnijih mjesečnih,
              kvartalnih i godišnjih obaveza za obrte, samostalne djelatnosti
              i poslodavce u Federaciji BiH.
            </p>
          </div>

          <div className={styles.group}>
            <h3 className={styles.groupTitle}>
              Mjesečno
              <span className={styles.groupCount}>{MJESECNO.length}</span>
            </h3>
            <div className={styles.list}>
              {MJESECNO.map((it) => (
                <ItemCard key={it.title} item={it} />
              ))}
            </div>
          </div>

          <div className={styles.group}>
            <h3 className={styles.groupTitle}>
              Prijava i odjava radnika
              <span className={styles.groupCount}>{JS3100.length}</span>
            </h3>
            <div className={styles.list}>
              {JS3100.map((it) => (
                <ItemCard key={it.title} item={it} />
              ))}
            </div>
          </div>

          <div className={styles.group}>
            <h3 className={styles.groupTitle}>
              Godišnje
              <span className={styles.groupCount}>{GODISNJE.length}</span>
            </h3>
            <div className={styles.list}>
              {GODISNJE.map((it) => (
                <ItemCard key={it.title} item={it} />
              ))}
            </div>
          </div>

          <p className={styles.disclaimer}>
            Napomena: rokovi se mogu razlikovati ovisno o specifičnostima
            poslovanja i izmjenama propisa. Za obavezujuće informacije
            konsultujte nadležnu poreznu ispostavu ili svog knjigovođu.
          </p>
        </div>
      </div>
    </section>
  );
}
