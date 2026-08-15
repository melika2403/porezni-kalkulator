// Popunjavanje obrasca PK-1001 (zahtjev za izdavanje porezne kartice, PUFBiH).
//
// Šablon ima 150 AcroForm polja, ali su im imena uglavnom automatska
// ("undefined_N"), pa je mapa izvedena iz KOORDINATA polja u šablonu i
// provjerena red po red. Zato imena ispod izgledaju besmisleno: ne mijenjati
// ih napamet, mapa je zapisana i u docs/pk1001-porezna-kartica.md.
//
// Novčani iznosi i koeficijenti su na obrascu podijeljeni u dva polja
// (cijeli dio + decimale) jer je zarez pred-štampan.

import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  datumRodjenjaIzJmbg,
  desnoPoravnaj,
  izracunaj,
  parsirajIznos,
  podijeliBroj,
  type PkClan,
  type PkPodaci,
} from "./pk1001Podaci";
import {
  POLJE_DATUM_PODNOSENJA,
  POLJE_DATUM_PRIMJENE,
  POLJE_UKUPAN_KOEF,
  RED_ALIMENTACIJE,
  RED_BRACNI,
  RED_DJECA,
  RED_INVALIDNOST,
  RED_OSTALI,
  type RedPolja,
} from "./pk1001Polja";

export type Pk1001Data = {
  /** zaglavlje: koja je vrsta zahtjeva */
  vrsta: "PRVO" | "IZMJENA" | "PONISTAVANJE";
  // Dio 1
  prezime: string;
  ime: string;
  imeRoditelja: string;
  jmbg: string;
  adresa: string;
  opcina: string;
  telefon: string;
  // Dio 2
  jibPoslodavca: string;
  nazivPoslodavca: string;
  zaposlen: boolean;
  // Dijelovi 3 do 7
  podaci: PkPodaci;
  /** Dio 8: datum od kojeg se koeficijent primjenjuje (ISO) */
  datumPrimjeneIso: string;
  /** Dio 9: datum podnošenja zahtjeva (ISO) */
  datumPodnosenjaIso: string;
};

const cifre = (s: string) => String(s ?? "").replace(/\D/g, "");

function isoUDijelove(iso: string): [string, string, string] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? ""));
  return m ? [m[3], m[2], m[1]] : ["", "", ""];
}

export type Pk1001Rezultat = {
  bytes: Uint8Array;
  /** polja koja nisu popunjena ili su skraćena; prikazuju se korisniku */
  upozorenja: string[];
};

export async function fillPk1001(data: Pk1001Data): Promise<Pk1001Rezultat> {
  const [templateBytes, fontBytes] = await Promise.all([
    fetch("/templates/PK-1001.pdf").then((r) => r.arrayBuffer()),
    // sve što mi upišemo ide podebljano, da se odvoji od pred-štampanog teksta
    fetch("/templates/arialbd.ttf").then((r) => r.arrayBuffer()),
  ]);

  const doc = await PDFDocument.load(templateBytes);
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes);
  const form = doc.getForm();

  // Veličina fonta se MORA zadati izričito. Comb polja u ovom šablonu nemaju
  // /DA zapis, pa setFontSize baca grešku, a pdf-lib tada veličinu bira po
  // VISINI polja: dijelovi 3 i 4 imaju viša polja (9,6 i 9,2) pa su dobijali
  // font 13 i cifre su ispunjavale kućicu do ivice, dok su dijelovi 5 do 7
  // (visina 7,3) dobijali 10 i izgledali uredno. Zato poljima bez /DA prvo
  // napravimo /DA, pa im zadamo istu veličinu.
  const zadajVelicinu = (polje: ReturnType<typeof form.getTextField>, velicina: number) => {
    try {
      polje.setFontSize(velicina);
    } catch {
      polje.acroField.setDefaultAppearance(`/Helv ${velicina} Tf 0 g`);
      polje.setFontSize(velicina);
    }
  };

  // Greške se sakupljaju i vraćaju pozivaocu. Ranije su išle samo u
  // console.warn, pa je korisnik dobijao obrazac sa praznim poljem i poruku
  // da je sve u redu.
  const upozorenja: string[] = [];

  const set = (
    ime: string,
    vrijednost: string,
    velicina = 9,
    /** ljudski naziv polja, koristi se samo u upozorenjima */
    opis?: string,
  ) => {
    if (!ime) return;
    let polje;
    try {
      polje = form.getTextField(ime);
    } catch {
      upozorenja.push(`Polje "${opis || ime}" ne postoji u šablonu obrasca.`);
      return;
    }
    try {
      // Vrijednost duža od broja kućica bi bacila grešku i polje bi ostalo
      // prazno; radije je skratimo i to kažemo naglas.
      let v = vrijednost;
      const max = polje.getMaxLength();
      if (max != null && v.length > max) {
        upozorenja.push(
          `${opis || ime}: vrijednost "${v}" ne staje u ${max} mjesta na obrascu, upisano je "${v.slice(0, max)}".`,
        );
        v = v.slice(0, max);
      }
      zadajVelicinu(polje, velicina);
      polje.setText(v || undefined);
      polje.updateAppearances(font);
    } catch (e) {
      upozorenja.push(
        `${opis || ime} nije popunjeno: ${(e as Error).message}`,
      );
    }
  };

  // Polja slobodnog teksta (imena, adrese, srodstvo) nemaju kućice, pa im se
  // veličina prepušta pdf-libu: dug naziv se smanji umjesto da bude odsječen.
  const setTekst = (ime: string, vrijednost: string, opis?: string) =>
    set(ime, vrijednost, 0, opis);

  // Broj koji na obrascu stoji lijevo od pred-štampanog zareza mora biti
  // poravnat UZ zarez, dakle desno: "100" u polju od četiri kućice inače
  // izgleda kao 1000. Dopuna razmacima do pune dužine polja.
  const setDesno = (
    ime: string,
    vrijednost: string,
    velicina = 9,
    opis?: string,
  ) => {
    if (!ime) return;
    if (!vrijednost) return set(ime, "", velicina, opis);
    let max = vrijednost.length;
    try {
      max = form.getTextField(ime).getMaxLength() ?? vrijednost.length;
    } catch {
      // polje se ionako prijavljuje u set()
    }
    set(ime, desnoPoravnaj(vrijednost, max), velicina, opis);
  };
  const kvacica = (ime: string, oznaci: boolean) => {
    try {
      const cb = form.getCheckBox(ime);
      if (oznaci) cb.check();
      else cb.uncheck();
    } catch {
      console.warn(`[PK-1001] Kvačica "${ime}" nije pronađena u šablonu`);
    }
  };

  // ── Zaglavlje ──
  kvacica("Prvo izdavanje", data.vrsta === "PRVO");
  kvacica("Izmjena", data.vrsta === "IZMJENA");
  kvacica("Poništavanje", data.vrsta === "PONISTAVANJE");

  // ── Dio 1: podaci o poreznom obvezniku ──
  setTekst("1 Prezime", data.prezime, "Prezime");
  setTekst("2 Ime", data.ime, "Ime");
  setTekst("3 Ime jednog roditelja", data.imeRoditelja, "Ime jednog roditelja");
  set("4 JMB", cifre(data.jmbg).slice(0, 13), 10, "JMB obveznika");
  setTekst("5 Adresa prebivališta", data.adresa, "Adresa prebivališta");
  setTekst("fill_1", data.opcina, "Općina prebivališta");

  // 7) datum rođenja se izvodi iz JMBG-a (dd / mm / gggg)
  const rodjen = datumRodjenjaIzJmbg(data.jmbg);
  set("comb_2", rodjen?.dan ?? "", 10);
  set("undefined", rodjen?.mjesec ?? "", 10);
  set("undefined_2", rodjen?.godina ?? "", 10);

  // 8) telefon je podijeljen na tri polja (3 + 2 + 6 znakova)
  const tel = cifre(data.telefon);
  set("8 Telefon", tel.slice(0, 3), 10);
  set("undefined_3", tel.slice(3, 5), 10);
  set("undefined_4", tel.slice(5, 11), 10);

  // ── Dio 2: podaci o poslodavcu ──
  set("undefined_5", cifre(data.jibPoslodavca).slice(0, 13), 10, "JIB poslodavca");
  setTekst("10 Naziv poslodavca", data.nazivPoslodavca, "Naziv poslodavca");
  kvacica("Zaposlen", data.zaposlen);
  kvacica("Nezaposlen", !data.zaposlen);

  // ── Dijelovi 3 do 7 ──
  const racun = izracunaj(data.podaci);

  const upisiRedove = (
    opisDijela: string,
    polja: RedPolja[],
    sviRedovi: { clan: PkClan; koeficijent: number; uObrascu: boolean }[],
    iznosIzAlimentacije = false,
  ) => {
    // Član koji prelazi prag od 300 KM se po uputstvu NE unosi u zahtjev, pa
    // se ne štampa. Ranije je izlazio na obrazac sa koeficijentom 0,00, što
    // je Poreznoj upravi izgledalo kao greška u popunjavanju.
    const redovi = sviRedovi.filter((r) => r.uObrascu);
    redovi.slice(0, polja.length).forEach((r, i) => {
      const p = polja[i];
      set(p.jmb, cifre(r.clan.jmb).slice(0, 13), 10, `${opisDijela}: JMB`);
      setTekst(p.ime, r.clan.imePrezime, `${opisDijela}: prezime i ime`);
      if (p.iznosCijeli) {
        const iznos = parsirajIznos(
          iznosIzAlimentacije ? r.clan.iznosAlimentacije : r.clan.vlastitiPrihod,
        );
        const { cijeli, decimale } = podijeliBroj(iznos, 2);
        // cijeli dio uz zarez (desno), decimale odmah iza zareza (lijevo)
        setDesno(p.iznosCijeli, cijeli, 10, `${opisDijela}: iznos`);
        set(p.iznosDec, decimale, 10);
      }
      if (p.srodstvo) setTekst(p.srodstvo, r.clan.srodstvo, `${opisDijela}: srodstvo`);
      const udio = parsirajIznos(r.clan.udioPosto);
      // isti opseg kao u računici (0-100), da odštampani procenat odgovara
      // koeficijentu koji je iz njega izveden
      const udioZaObrazac =
        udio == null ? 100 : Math.max(0, Math.min(100, Math.round(udio)));
      setDesno(p.udio, String(udioZaObrazac), 10, `${opisDijela}: udio`);
      const koef = podijeliBroj(r.koeficijent, 2);
      set(p.koefCijeli, koef.cijeli, 10);
      set(p.koefDec, koef.decimale, 10);
    });
  };

  upisiRedove("Dio 3 (bračni drug)", RED_BRACNI, racun.bracniDrug);
  upisiRedove("Dio 4 (djeca)", RED_DJECA, racun.djeca);
  upisiRedove("Dio 5 (ostali članovi)", RED_OSTALI, racun.ostali);
  upisiRedove("Dio 6 (alimentacija)", RED_ALIMENTACIJE, racun.alimentacije, true);
  upisiRedove("Dio 7 (invalidnost)", RED_INVALIDNOST, racun.invalidnosti);

  // ── Dio 8: ukupan koeficijent + datum od kojeg se primjenjuje ──
  set(POLJE_UKUPAN_KOEF, racun.ukupno.toFixed(2).replace(".", ","), 10);
  const [dp, mp, gp] = isoUDijelove(data.datumPrimjeneIso);
  set(POLJE_DATUM_PRIMJENE[0], dp, 10);
  set(POLJE_DATUM_PRIMJENE[1], mp, 10);
  set(POLJE_DATUM_PRIMJENE[2], gp, 10);

  // ── Dio 9: datum podnošenja ──
  const [dd, mm, gg] = isoUDijelove(data.datumPodnosenjaIso);
  set(POLJE_DATUM_PODNOSENJA[0], dd, 10);
  set(POLJE_DATUM_PODNOSENJA[1], mm, 10);
  set(POLJE_DATUM_PODNOSENJA[2], gg, 10);

  form.updateFieldAppearances(font);
  form.flatten();

  return { bytes: await doc.save(), upozorenja };
}
