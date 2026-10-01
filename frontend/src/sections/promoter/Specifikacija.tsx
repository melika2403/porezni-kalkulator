"use client";

import Link from "next/link";
import { POZICIJE_PO_STRANICI, STRANICE, nazivPozicije, type ReklamaPozicija } from "src/data/partner";
import p from "./portal.module.css";

// Specifikacija formata za agenciju i marketing partnera: šta treba
// pripremiti za koju poziciju (gotov baner ili šablon koji mi iscrtavamo).
// Brojevi prate stvarna ograničenja editora i prikaza (maxLength, upload do
// 2 MB, PNG/JPG/WEBP).

type Red = {
  pozicija: ReklamaPozicija;
  gdje: string;
  slika: string;
  sablon: string;
};

const REDOVI: Red[] = [
  {
    pozicija: "SIDEBAR_LIJEVO",
    gdje: "Visoka kartica pored obrasca, prati skrol. Samo široki ekrani (od 1440 px, na AMS-u od 1340 px).",
    slika: "Uspravni baner 300 × 600 px (prikaz širine 250 px).",
    sablon: "Logo, naslov do 120 znakova (najbolje do 40), tekst do 400 (najbolje do 120), ilustracija opcionalno, dugme do 40 znakova.",
  },
  {
    pozicija: "SIDEBAR_DESNO",
    gdje: "Kao lijevi stub; na Vijestima stoji u desnoj koloni, a na šifarnicima skroz desno, izvan sadržaja (ekrani od 1780 px).",
    slika: "Uspravni baner 300 × 600 px.",
    sablon: "Isto kao lijevi stub.",
  },
  {
    pozicija: "INLINE",
    gdje: "Mala kartica \"Sponzorisano\" u obrascu ili ispod rezultata kalkulatora. Vidljiva i na mobitelu.",
    slika: "Vodoravni baner 640 × 120 px.",
    sablon: "Mali logo, naslov (najbolje do 50 znakova) i jedna rečenica teksta (do 120).",
  },
  {
    pozicija: "BANER",
    gdje: "Najveća pozicija, samo na početnoj stranici ispod Pretplata. Cijela kartica je link i na prelaz mišem se blago uveća.",
    slika: "Koristi vodoravni baner; za ovu poziciju preporučujemo šablon (oštriji na svim širinama).",
    sablon: "Oznaka iznad naslova do 60 znakova, do dva logotipa, naslov (dio u *zvjezdicama* se ističe), tekst do 400 (najbolje do 200), dugme do 40.",
  },
  {
    pozicija: "BANER_ISPOD",
    gdje: "Vodoravna kartica ispod obrasca na alatima (AMS, SPR, GPD, ZO-3, kalkulatori, pozajmica) i na dnu vodiča i rasprava. Glavno mjesto na mobitelu.",
    slika: "Koristi vodoravni baner; za ovu poziciju preporučujemo šablon (oštriji na svim širinama).",
    sablon: "Oznaka iznad naslova do 60 znakova, do dva logotipa, naslov (dio u *zvjezdicama* se ističe), tekst do 400 (najbolje do 200), dugme do 40.",
  },
  {
    pozicija: "DUGME",
    gdje: "\"Preuzimanje omogućila <brend>\" na dugmetu za preuzimanje PDF-a. Klik je preuzimanje, ne odlazak na vaš link (brending).",
    slika: "Ne koristi se.",
    sablon: "Samo logo (PNG sa prozirnom pozadinom, visina bar 36 px) i naziv brenda.",
  },
  {
    pozicija: "MODAL",
    gdje: "Sponzorisana poruka u prozoru \"Vaš obrazac je spreman\", najviše jednom po posjeti i stranici.",
    slika: "Ne koristi se.",
    sablon: "Logo, naslov (najbolje do 60 znakova), tekst do 400 (najbolje do 200), glavno dugme i opcionalno drugi link.",
  },
];

export default function Specifikacija() {
  const stranicePozicije = (poz: ReklamaPozicija) =>
    STRANICE.filter((s) => POZICIJE_PO_STRANICI[s.id]?.includes(poz))
      .map((s) => s.kratko)
      .join(", ");

  return (
    <>
      <div className={p.zaglavlje}>
        <div>
          <h1 className={p.naslov}>Specifikacija formata</h1>
          <p className={p.podnaslov}>
            Šta pripremiti za koju poziciju. Kreativa može biti gotov baner (slika) ili šablon:
            vi unesete tekst i logo, a mi je iscrtavamo u boji brenda, i u tamnoj temi sajta.
          </p>
        </div>
      </div>

      <section className={p.kartica}>
        <div className={`${p.tabelaOkvir} ${p.tabelaBezNaslova}`}>
          <table className={p.tabela}>
            <thead>
              <tr>
                <th>Pozicija</th>
                <th>Gdje i kako se vidi</th>
                <th>Gotov baner</th>
                <th>Šablon</th>
              </tr>
            </thead>
            <tbody>
              {REDOVI.map((r) => (
                <tr key={r.pozicija}>
                  <td className={p.specPozicija}>
                    <strong>{nazivPozicije(r.pozicija)}</strong>
                    <span className={p.kreativaMeta}>{stranicePozicije(r.pozicija)}</span>
                  </td>
                  <td>{r.gdje}</td>
                  <td>{r.slika}</td>
                  <td>{r.sablon}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className={p.specMreza}>
        <section className={p.kartica}>
          <h2 className={`${p.karticaNaslov} ${p.karticaNaslovRazmak}`}>Slike</h2>
          <ul className={p.specLista}>
            <li>PNG, JPG ili WEBP, najviše 2 MB po slici.</li>
            <li>Pripremite dvostruku rezoluciju (npr. 600 × 1200 za stub) da slika bude oštra na retina ekranima.</li>
            <li>Na gotovom baneru ostavite donji desni ugao (oko 60 × 24 px) bez teksta: tu stoji oznaka &quot;Oglas&quot;.</li>
            <li>Gotov baner se ne mijenja u tamnoj temi sajta, pa neka ima vlastitu podlogu (ne prozirnu).</li>
            <li>Logo za šablon i dugme: PNG sa prozirnom pozadinom.</li>
          </ul>
        </section>
        <section className={p.kartica}>
          <h2 className={`${p.karticaNaslov} ${p.karticaNaslovRazmak}`}>Tekst, linkovi i mjerenje</h2>
          <ul className={p.specLista}>
            <li>Boja brenda se unosi kao HEX (npr. #d9232d); sve nijanse kartice se izvode iz nje.</li>
            <li>Link mora biti https. Na klik dodajemo UTM oznake (utm_source=poreznikalkulator.ba), osim onih koje ste već stavili.</li>
            <li>Oznaku &quot;Oglas&quot; ili &quot;Sponzorisano&quot; dodajemo sami, ne treba je pisati u kreativu.</li>
            <li>Prikaz se broji kad je kreativa bar napola vidljiva najmanje 1 sekundu; botovi i naš interni pristup se ne broje.</li>
            <li>Kreativa je uživo čim je sačuvate i vrti se samo u svom terminu.</li>
          </ul>
        </section>
      </div>

      <div className={p.napomenaRed}>
        <p className={p.napomenaTekst}>Gdje je koja pozicija na sajtu i šta je trenutno zauzima vidite na stranici Pozicije.</p>
        <Link href="/partner/pozicije" className={p.dugmeMalo}>
          Pozicije
        </Link>
      </div>
    </>
  );
}
