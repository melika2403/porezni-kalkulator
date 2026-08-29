// ──────────────────────────────────────────────────────────────────────────────
//  CSV IZVOZ I UVOZ RADNIKA — dijeljeno između PK Office (/app/zaposlenici) i
//  marketing dijela (/aktivni-radnici).
//
//  IZVOZ je izvještaj (R.br, spojeno ime, status...) i NIJE format za uvoz.
//  UVOZ ima svoj šablon sa čistim kolonama (Ime i Prezime odvojeno, datumi
//  DD.MM.GGGG, iznosi kao brojevi) koji korisnik preuzme, popuni i vrati.
//  Uvoz SAMO DODAJE nove radnike; postojeći se preskaču (odluka vlasnika).
//
//  Modul je bez importa da ga backend testovi učitaju type-strippingom
//  (backend/test/radniciCsv.test.js), kao pk1001Podaci i spisakBanke.
// ──────────────────────────────────────────────────────────────────────────────

// ── Izvoz (izvještajni CSV, iste kolone kao ranije na PK Office) ─────────────

export type RadnikZaIzvoz = {
  firstName: string;
  lastName: string;
  role: string;
  position: string | null;
  jmbg: string | null;
  city: string | null;
  prijavaDate: string | null;
  odjavaDate: string | null;
};

const escCsv = (c: string) =>
  /[";\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c;

// Ćelija izvještaja: pored escapea neutralizuje formule (ime radnika koje
// počinje sa =, +, - ili @ Excel bi izvršio kao formulu). Šablon za uvoz
// NAMJERNO ne ide kroz ovo, tamo je ="..." naš trik za tekst kolone.
const escIzvjestaj = (c: string) =>
  escCsv(/^[=+\-@]/.test(c) ? `'${c}` : c);

const datumHrIzIso = (iso: string | null): string => {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  // Standard projekta je DD.MM.GGGG. (sa tačkom na kraju).
  return m ? `${m[3]}.${m[2]}.${m[1]}.` : String(iso);
};

/**
 * Izvještajni CSV spiska radnika (BOM + ";" za Excel). plataText/statusText
 * dolaze sa stranice (PK Office prikazuje i osnovicu vlasnika po režimu).
 */
export function napraviIzvjestajCsv<T extends RadnikZaIzvoz>(
  radnici: T[],
  plataText: (w: T) => string,
  statusText: (w: T) => string,
): string {
  const linije: string[][] = [
    [
      "R.br",
      "Ime i prezime",
      "Radno mjesto",
      "JMBG",
      "Grad",
      "Prijava",
      "Odjava",
      "Status",
      "Plata",
    ],
    ...radnici.map((w, i) => [
      `${i + 1}.`,
      `${w.firstName} ${w.lastName}`,
      w.role === "VLASNIK" ? "vlasnik" : (w.position ?? ""),
      w.jmbg ?? "",
      w.city ?? "",
      datumHrIzIso(w.prijavaDate),
      datumHrIzIso(w.odjavaDate),
      statusText(w),
      plataText(w),
    ]),
  ];
  return "﻿" + linije.map((l) => l.map(escIzvjestaj).join(";")).join("\r\n");
}

// ── Šablon za uvoz ───────────────────────────────────────────────────────────

// Zvjezdica = obavezno polje. Datum prijave je obavezan jer ga backend traži
// za radnika (bez njega se radnik ne može kreirati).
export const SABLON_ZAGLAVLJA = [
  "Ime*",
  "Prezime*",
  "JMBG",
  "Grad",
  "Adresa",
  "Email",
  "Telefon",
  "Žiro račun",
  "Radno mjesto",
  "Datum prijave*",
  "Neto plata",
  "Bruto plata",
  "Porezni koeficijent",
  "Sati dnevno",
  "Staž prije firme (godine)",
];

export function sablonCsv(): string {
  // JMBG i žiro račun idu kao ="..." (Excel trik): bez toga ih Excel pretvori
  // u broj, prikaže kao 1,0199E+11 i pojede vodeću nulu JMBG-a.
  const primjer = [
    "Emir",
    "Emirović",
    '="0101990123456"',
    "Sarajevo",
    "Testna ulica 1",
    "emir@example.com",
    "061 123 456",
    '="3389001234567853"',
    "Prodavač",
    "01.09.2026",
    "1030,00",
    "",
    "1.0",
    "8",
    "5",
  ];
  return (
    "﻿" +
    [SABLON_ZAGLAVLJA, primjer]
      .map((l) => l.map(escCsv).join(";"))
      .join("\r\n")
  );
}

// ── Parser CSV teksta ────────────────────────────────────────────────────────

// Puni CSV parser: navodnici, "" escape, novi red unutar navodnika.
// Separator se prepoznaje iz prvog reda (";" ili ","); Excel na našim
// postavkama snima ";", ali se tolerira i zarez.
export function parsirajCsvTekst(tekst: string): string[][] {
  const cist = tekst.replace(/^﻿/, "");
  const prviRed = cist.split(/\r?\n/, 1)[0] ?? "";
  const sep =
    (prviRed.match(/;/g)?.length ?? 0) >= (prviRed.match(/,/g)?.length ?? 0)
      ? ";"
      : ",";

  const redovi: string[][] = [];
  let red: string[] = [];
  let polje = "";
  let uNavodnicima = false;
  for (let i = 0; i < cist.length; i++) {
    const c = cist[i];
    if (uNavodnicima) {
      if (c === '"') {
        if (cist[i + 1] === '"') {
          polje += '"';
          i++;
        } else {
          uNavodnicima = false;
        }
      } else {
        polje += c;
      }
    } else if (c === '"' && polje === "") {
      // Navodnik otvara citat SAMO na početku polja (RFC 4180). Ranije je
      // navodnik usred teksta ("cijev 5\" fi") gutao ostatak fajla.
      uNavodnicima = true;
    } else if (c === sep) {
      red.push(polje);
      polje = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && cist[i + 1] === "\n") i++;
      red.push(polje);
      polje = "";
      redovi.push(red);
      red = [];
    } else {
      polje += c;
    }
  }
  if (polje !== "" || red.length > 0) {
    red.push(polje);
    redovi.push(red);
  }
  // Prazni redovi se NE ispuštaju ovdje: pozivalac ih preskače sam da bi
  // korisniku mogao prijaviti stvarni broj reda u fajlu.
  return redovi;
}

// ── Uvoz radnika ─────────────────────────────────────────────────────────────

export type UvozRadnika = {
  ime: string;
  prezime: string;
  jmbg: string;
  grad: string;
  adresa: string;
  email: string;
  telefon: string;
  ziroRacun: string;
  radnoMjesto: string;
  /** ISO "YYYY-MM-DD" */
  datumPrijave: string;
  netoPlata: number | null;
  brutoPlata: number | null;
  koeficijent: number | null;
  satiDnevno: number | null;
  stazGodina: number | null;
};

export type UvozRed = {
  /** 1-bazirani broj reda u fajlu (zaglavlje je red 1). */
  brojReda: number;
  podaci: UvozRadnika;
  greske: string[];
  upozorenja: string[];
};

export type UvozRezultat = {
  redovi: UvozRed[];
  greskaFajla: string | null;
};

// Normalizacija zaglavlja za prepoznavanje kolona: mala slova, bez
// dijakritike, bez zvjezdice i zagrada.
function normalizujZaglavlje(s: string): string {
  return s
    .toLowerCase()
    // NFD razlaže "č" na "c" + kvačicu (tako snima macOS), pa se kvačice
    // uklanjaju kao znakovi; bez ovoga se kolona sa macOS-a ne bi mapirala.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[čć]/g, "c")
    .replace(/[š]/g, "s")
    .replace(/[ž]/g, "z")
    .replace(/[đ]/g, "d")
    .replace(/\*/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const KOLONE: Record<string, keyof UvozRadnika> = {
  ime: "ime",
  prezime: "prezime",
  jmbg: "jmbg",
  grad: "grad",
  "grad prebivalista": "grad",
  adresa: "adresa",
  email: "email",
  "e mail": "email",
  telefon: "telefon",
  "ziro racun": "ziroRacun",
  racun: "ziroRacun",
  "tekuci racun": "ziroRacun",
  "radno mjesto": "radnoMjesto",
  pozicija: "radnoMjesto",
  "datum prijave": "datumPrijave",
  prijava: "datumPrijave",
  "neto plata": "netoPlata",
  neto: "netoPlata",
  "bruto plata": "brutoPlata",
  bruto: "brutoPlata",
  "porezni koeficijent": "koeficijent",
  koeficijent: "koeficijent",
  "sati dnevno": "satiDnevno",
  sati: "satiDnevno",
  "staz prije firme": "stazGodina",
  staz: "stazGodina",
} as const;

// "01.09.2026", "1.9.2026", "01.09.2026." ili ISO → ISO; null = neispravan.
export function parsirajDatum(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const hr = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/.exec(t);
  let g: number, m: number, d: number;
  if (iso) {
    g = +iso[1]; m = +iso[2]; d = +iso[3];
  } else if (hr) {
    d = +hr[1]; m = +hr[2]; g = +hr[3];
  } else {
    return null;
  }
  const dat = new Date(g, m - 1, d);
  if (
    dat.getFullYear() !== g ||
    dat.getMonth() !== m - 1 ||
    dat.getDate() !== d
  ) {
    return null;
  }
  return `${g}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Iznos u domaćem ("1.030,48") i engleskom ("1,030.48") zapisu, plus prosti
// oblici ("1030,48", "1030.48", "1030"). NaN = neispravan unos (razlikuje se
// od praznog polja). Engleski zapis stiže copy-pasteom iz banke ili drugog
// programa i ranije se tiho čitao kao 1,03.
export function parsirajIznos(s: string): number | null {
  let t = s.trim().replace(/\s+/g, "").replace(/KM$/i, "");
  if (!t) return null;
  const zadnjiZarez = t.lastIndexOf(",");
  const zadnjaTacka = t.lastIndexOf(".");
  if (zadnjiZarez >= 0 && zadnjaTacka >= 0) {
    // Oba separatora: decimalni je onaj koji dolazi ZADNJI, drugi su hiljade.
    if (zadnjiZarez > zadnjaTacka) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(/,/g, "");
  } else if (zadnjiZarez >= 0) {
    // Samo zarez: "1,030" je engleski separator hiljada (tačno tri cifre iza),
    // sve ostalo je domaća decimala ("1030,48", "0,50").
    t = /^-?\d{1,3}(,\d{3})+$/.test(t)
      ? t.replace(/,/g, "")
      : t.replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
  return Math.round(parseFloat(t) * 100) / 100;
}

/**
 * Parsira CSV fajl uvoza u redove sa validacijama. Duplikate prema
 * postojećim radnicima označava POZIVALAC (modal ima listu radnika).
 */
export function parsirajRadnikeCsv(tekst: string): UvozRezultat {
  const redovi = parsirajCsvTekst(tekst);
  if (redovi.length === 0) {
    return { redovi: [], greskaFajla: "Fajl je prazan." };
  }
  const zaglavlje = redovi[0].map(normalizujZaglavlje);
  const mapa: (keyof UvozRadnika | null)[] = zaglavlje.map(
    (z) => KOLONE[z] ?? null,
  );
  if (!mapa.includes("ime") || !mapa.includes("prezime")) {
    return {
      redovi: [],
      greskaFajla:
        "Zaglavlje nije prepoznato: fajl mora imati kolone Ime i Prezime. Preuzmite šablon iz ovog prozora i popunite njega.",
    };
  }
  // Dvije kolone koje gađaju isto polje (npr. "Neto plata" i "Neto") tiho bi
  // se gazile, pa zadnja prazna kolona pobijedi i podatak nestane.
  const viđene = new Set<string>();
  for (let i = 0; i < mapa.length; i++) {
    const kljuc = mapa[i];
    if (!kljuc) continue;
    if (viđene.has(kljuc)) {
      return {
        redovi: [],
        greskaFajla: `Fajl ima dvije kolone za isti podatak ("${redovi[0][i]}"). Ostavite samo jednu i pokušajte ponovo.`,
      };
    }
    viđene.add(kljuc);
  }

  // Excel trik ="..." iz šablona (tekst kolone za JMBG i račun): skini omotač
  // kad se šablon uveze direktno, bez otvaranja u Excelu.
  const bezFormule = (v: string) => {
    const m = /^="(.*)"$/.exec(v);
    return m ? m[1] : v;
  };
  // Excel zna dugačke brojeve pretvoriti u naučni zapis ("1,0199E+11") i
  // pojesti vodeću nulu: to se ne da povratiti, pa je jasna greška jedino
  // ispravno (tihi uvoz bi upisao polomljen JMBG ili račun).
  const naucniZapis = (v: string) => /\d[,.]?\d*[eE]\+\d/.test(v);

  const out: UvozRed[] = [];
  for (let r = 1; r < redovi.length; r++) {
    const celije = redovi[r];
    // Prazan red se preskače, ali NE mijenja numeraciju: korisniku se prijavi
    // stvarni broj reda u fajlu da zna gdje da popravi.
    if (!celije.some((c) => c.trim() !== "")) continue;
    const sirovo: Record<string, string> = {};
    for (let c = 0; c < mapa.length; c++) {
      const kljuc = mapa[c];
      if (kljuc) sirovo[kljuc] = bezFormule((celije[c] ?? "").trim());
    }
    const greske: string[] = [];
    const upozorenja: string[] = [];

    const ime = sirovo.ime ?? "";
    const prezime = sirovo.prezime ?? "";
    if (!ime) greske.push("ime je obavezno");
    if (!prezime) greske.push("prezime je obavezno");

    const jmbg = (sirovo.jmbg ?? "").replace(/\D/g, "");
    if (sirovo.jmbg && naucniZapis(sirovo.jmbg)) {
      greske.push(
        "Excel je JMBG pretvorio u broj (npr. 1,01E+11): formatirajte kolonu kao Tekst pa ponovo upišite JMBG",
      );
    } else if (sirovo.jmbg && jmbg.length !== 13) {
      greske.push("JMBG mora imati tačno 13 cifara");
    }
    if (!jmbg) upozorenja.push("bez JMBG-a (potreban za prijave i obrasce)");

    if (sirovo.ziroRacun && naucniZapis(sirovo.ziroRacun)) {
      greske.push(
        "Excel je žiro račun pretvorio u broj (npr. 3,38E+15): formatirajte kolonu kao Tekst pa ponovo upišite račun",
      );
    } else if (sirovo.ziroRacun) {
      // Žiro račun u FBiH ima 16 cifara. Excel čuva samo 15 značajnih, pa
      // račun upisan kao broj izgubi zadnju cifru bez ikakvog traga; kraći
      // ili duži račun banka odbija, pa je upozorenje obavezno.
      const cifreRacuna = sirovo.ziroRacun.replace(/\D/g, "");
      if (cifreRacuna.length !== 16) {
        upozorenja.push(
          `žiro račun nema 16 cifara (${cifreRacuna.length}), provjerite ga prije isplate`,
        );
      }
    }

    const grad = sirovo.grad ?? "";
    if (!grad) upozorenja.push("bez grada (potreban za obračun plate)");

    const datumPrijave = parsirajDatum(sirovo.datumPrijave ?? "");
    if (!sirovo.datumPrijave) {
      greske.push("datum prijave je obavezan (DD.MM.GGGG)");
    } else if (!datumPrijave) {
      greske.push(`datum prijave nije ispravan: "${sirovo.datumPrijave}"`);
    } else {
      // Godina van razumnog raspona je skoro uvijek omaška u kucanju
      // ("01.09.2062" umjesto 2026), a radnik bi ostao bez prijave.
      const godina = Number(datumPrijave.slice(0, 4));
      const sada = new Date().getFullYear();
      if (godina < 1970 || godina > sada + 1) {
        greske.push(`datum prijave je van razumnog raspona: "${sirovo.datumPrijave}"`);
      }
    }

    const broj = (kljuc: string, naziv: string): number | null => {
      const v = parsirajIznos(sirovo[kljuc] ?? "");
      if (v === null) return null;
      if (Number.isNaN(v) || v < 0) {
        greske.push(`${naziv} nije ispravan broj: "${sirovo[kljuc]}"`);
        return null;
      }
      return v;
    };
    const netoPlata = broj("netoPlata", "neto plata");
    const brutoPlata = broj("brutoPlata", "bruto plata");
    if (netoPlata == null && brutoPlata == null) {
      upozorenja.push("bez plate (dopunite prije obračuna)");
    }
    // Sitna plata je skoro uvijek pogrešno protumačen separator ili omaška.
    const najmanjaPlata = Math.min(
      ...[netoPlata, brutoPlata].filter((v): v is number => v != null && v > 0),
    );
    if (Number.isFinite(najmanjaPlata) && najmanjaPlata < 50) {
      upozorenja.push(
        `plata je sumnjivo mala (${najmanjaPlata}), provjerite decimalni zarez`,
      );
    }
    if (netoPlata != null && brutoPlata != null) {
      upozorenja.push("unesena i neto i bruto plata, koristi se neto");
    }

    let koeficijent: number | null = null;
    if (sirovo.koeficijent) {
      const k = parsirajIznos(sirovo.koeficijent);
      if (k == null || Number.isNaN(k) || k < 0 || k > 5) {
        greske.push(`porezni koeficijent nije ispravan: "${sirovo.koeficijent}"`);
      } else {
        koeficijent = k;
      }
    }

    let satiDnevno: number | null = null;
    if (sirovo.satiDnevno) {
      const h = Number(sirovo.satiDnevno.replace(",", "."));
      if (!Number.isInteger(h) || h < 1 || h > 8) {
        greske.push(`sati dnevno moraju biti cijeli broj 1-8: "${sirovo.satiDnevno}"`);
      } else {
        satiDnevno = h;
      }
    }

    let stazGodina: number | null = null;
    if (sirovo.stazGodina) {
      const st = parsirajIznos(sirovo.stazGodina);
      if (st == null || Number.isNaN(st) || st < 0 || st > 60) {
        greske.push(`staž nije ispravan: "${sirovo.stazGodina}"`);
      } else {
        stazGodina = st;
      }
    }

    out.push({
      brojReda: r + 1,
      podaci: {
        ime,
        prezime,
        jmbg,
        grad,
        adresa: sirovo.adresa ?? "",
        email: sirovo.email ?? "",
        telefon: sirovo.telefon ?? "",
        ziroRacun: sirovo.ziroRacun ?? "",
        radnoMjesto: sirovo.radnoMjesto ?? "",
        datumPrijave: datumPrijave ?? "",
        netoPlata,
        brutoPlata,
        koeficijent,
        satiDnevno,
        stazGodina,
      },
      greske,
      upozorenja,
    });
  }
  return { redovi: out, greskaFajla: null };
}
