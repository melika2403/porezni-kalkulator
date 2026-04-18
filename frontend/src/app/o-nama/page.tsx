import type { Metadata } from "next";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "O nama — Porezni Kalkulator BiH",
  description:
    "Saznajte više o Porezni Kalkulator BiH — besplatnoj online platformi za poduzetnike, obrtnike i računovođe u Federaciji Bosne i Hercegovine.",
  alternates: { canonical: "https://poreznikalkulator.ba/o-nama" },
};

export default function ONamaPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>O nama</div>
        <h1 className={styles.h1}>Porezni Kalkulator <em>BiH</em></h1>
        <p className={styles.lead}>
          Besplatna online platforma za poduzetnike, obrtnike i računovođe u Federaciji Bosne i Hercegovine.
        </p>
      </div>

      <div className={styles.body}>
        <h2>Šta je Porezni Kalkulator BiH?</h2>
        <p>
          Porezni Kalkulator BiH je besplatna web aplikacija namijenjena fizičkim i pravnim licima koja obavljaju
          privrednu djelatnost u Federaciji Bosne i Hercegovine. Naša platforma nudi skup praktičnih alata koji
          olakšavaju svakodnevne porezne i računovodstvene obaveze - bez potrebe za instalacijom softvera,
          pretplatom ili registracijom za osnovne funkcije.
        </p>

        <h2>Naša misija</h2>
        <p>
          Vjerujemo da pristup jasnim i tačnim poreznim podacima bi trebao biti dostupan svima. Naša misija je da malim poduzetnicima, obrtnicima i freelancerima u BiH omogućimo da
          razumiju svoje porezne obaveze, ispravno popune obrasce i izračunaju troškove brzo, tačno i besplatno.
        </p>

        <h2>Šta nudimo?</h2>
        <ul>
          <li><strong>SPR-1053 obrazac</strong> — automatska izrada i generator obrasca za porez na dohodak iz samostalne djelatnosti</li>
          <li><strong>GPD-1051 obrazac</strong> — automatska izrada i generator godišnje prijava poreza na dohodak fizičkih lica</li>
          <li><strong>ZO3 obrazac</strong> — automatska izrada i generator ZO3 obrasca za prijavu/promjenu zdravstvenog osiguranja</li>
          <li><strong>AMS-1035 obrazac</strong> — automatska izrada i generator AMS-1035 obrasca za prijavu poreza na uplate iz inostranstva</li>
          <li><strong>Ugovor o pozajmici</strong> — besplatan template/primjer ugovora s mogućnosti prilagođavanja prema Vašim potrebama</li>
          <li><strong>Preračun neto/bruto plate</strong> — kalkulator doprinosa i poreza po važećim stopama u FBiH</li>
          <li><strong>PDV kalkulator</strong> — preračun PDV-a u oba smjera uz prikaz u KM i EUR</li>
          <li><strong>Stalna sredstva i amortizacija</strong> — evidencija i automatski obračun (dolazi uskoro)</li>
          <li><strong>Šihterica</strong> — evidencija radnog vremena (dolazi uskoro)</li>
        </ul>

        <h2>Tačnost podataka</h2>
        <p>
          Sve stope doprinosa, porezni odbitci i obrasci ažuriraju se u skladu s važećim propisima Federacije BiH.
          Sadržaj platforme je informativnog karaktera i ne zamjenjuje savjet ovlaštenog poreznog savjetnika ili
          računovođe. Za specifične porezne situacije preporučujemo konzultaciju sa stručnjakom.
        </p>

        <h2>Kontakt</h2>
        <p>
          Za pitanja, prijedloge ili prijavu grešaka možete nas kontaktirati putem stranice{" "}
          <a href="/kontakt">Kontakt</a> ili direktno na{" "}
          <a href="mailto:info@poreznikalkulator.ba">info@poreznikalkulator.ba</a>.
        </p>
      </div>
    </div>
  );
}
