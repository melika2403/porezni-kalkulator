"use client";

/* Editor jednog teksta (vijest ili vodič).
   Semafor se ovdje računa uživo dok se piše, ali mjerodavan je backend: on
   ponovo provjeri sve prije objave i odbije je ako nešto nedostaje. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StyledSelect from "src/components/StyledSelect/StyledSelect";
import DateInput from "src/components/DateInput/DateInput";
import Modal from "src/components/Modal/Modal";
import RichEditor from "./RichEditor";
import {
  adminGetClanak,
  adminKreirajClanak,
  adminIzmijeniClanak,
  adminPromijeniStatus,
  adminObrisiClanak,
  adminSlicniClanci,
  adminUploadSliku,
  type ClanakPayload,
  type SlicanClanak,
} from "src/api/vijesti";
import {
  RUBRIKE,
  MIN_RIJECI,
  SEO_LIMITI,
  SAZETAK_LIMITI,
  STATUS_LABELE,
  putanjaClanka,
  POZICIJE,
  type VijestPozicija,
  type VijestStatus,
  type VijestTip,
} from "src/data/vijesti";
import { VIJESTI_UPUTSTVO, POMOC_POLJA } from "src/content/upustva/vijesti-objava";
import { formatDate } from "src/lib/format";
import { getBackendUrl } from "src/utils/backendUrl";
import styles from "./adminVijesti.module.css";

type Stanje = {
  tip: VijestTip;
  naslov: string;
  nadnaslov: string;
  sazetak: string;
  sadrzaj: string;
  rubrika: string;
  tagovi: string;
  naslovnaSlika: string;
  naslovnaAlt: string;
  autorPotpis: string;
  izvorPropisa: string;
  seoNaslov: string;
  seoOpis: string;
  fokusFraza: string;
  datumProvjere: string;
  slug: string;
  uRijeci: boolean;
  istaknut: boolean;
  pozicija: VijestPozicija;
};

const PRAZNO: Stanje = {
  tip: "VIJEST",
  naslov: "",
  nadnaslov: "",
  sazetak: "",
  sadrzaj: "",
  rubrika: "propisi",
  tagovi: "",
  naslovnaSlika: "",
  naslovnaAlt: "",
  autorPotpis: "",
  izvorPropisa: "",
  seoNaslov: "",
  seoOpis: "",
  fokusFraza: "",
  datumProvjere: "",
  slug: "",
  uRijeci: true,
  istaknut: false,
  pozicija: "OBICNO",
};

/* ── Uvoz iz fajla (format "pk-vijest" v1) ──
   JSON pravi vanjski agent (Claude browser), a ovdje se samo popunjava forma:
   status ostaje Nacrt, sve postojeće validacije i semafor rade kao da je
   sadržaj ručno ukucan. Backend pri snimanju ponovo sanitizuje HTML. */

type UvozJson = {
  format?: unknown;
  verzija?: unknown;
  vrsta?: unknown;
  naslov?: unknown;
  nadnaslov?: unknown;
  slug?: unknown;
  sazetak?: unknown;
  tekst_html?: unknown;
  rubrika?: unknown;
  tagovi?: unknown;
  prikazi_u_rijeci_vijesti?: unknown;
  pozicija_na_naslovnoj?: unknown;
  fokus_fraza?: unknown;
  seo_naslov?: unknown;
  seo_opis?: unknown;
  naslovna_slika?: { fajl?: string; alt?: string; base64?: string } | null;
  potpis_autora?: unknown;
  izvor_propisa?: unknown;
  izvorna_objava?: unknown;
  prioritet?: unknown;
  zakazi_objavu?: unknown;
  /** samo vodič: datum sljedeće provjere stopa i iznosa (GGGG-MM-DD) */
  sljedeca_provjera?: unknown;
};

const UVOZ_TAGOVI = new Set([
  "P",
  "H2",
  "H3",
  "UL",
  "OL",
  "LI",
  "STRONG",
  "EM",
  "A",
  "BLOCKQUOTE",
  "BR",
]);

/* Klijentska sanitizacija prije ubacivanja u editor: dozvoljeni samo tagovi iz
   šeme, bez atributa osim bezbjednog href (http/https ili interna adresa).
   Nedozvoljen tag se rasklapa (tekst ostaje), skripte se brišu sa sadržajem.
   Apsolutni linkovi na naš sajt postaju relativni, jer semafor internu vezu
   prepoznaje samo kao href="/...". */
function normalizujHref(href: string): string {
  const m = href
    .trim()
    .match(/^https?:\/\/(?:www\.)?poreznikalkulator\.ba(\/[^\s]*|$)/i);
  return m ? m[1] || "/" : href.trim();
}

function sanitizujHtmlUvoza(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const ocisti = (el: Element) => {
    for (const dijete of [...el.children]) {
      const tag = dijete.tagName;
      if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED"].includes(tag)) {
        dijete.remove();
        continue;
      }
      ocisti(dijete);
      if (!UVOZ_TAGOVI.has(tag)) {
        dijete.replaceWith(...dijete.childNodes);
        continue;
      }
      for (const at of [...dijete.attributes]) {
        if (tag === "A" && at.name === "href") {
          const href = normalizujHref(at.value);
          // "//" je protocol-relative vanjska adresa, ne interna veza
          const interna = href.startsWith("/") && !href.startsWith("//");
          if (/^https?:\/\//i.test(href) || interna) {
            dijete.setAttribute("href", href);
            continue;
          }
        }
        dijete.removeAttribute(at.name);
      }
    }
  };
  ocisti(doc.body);
  return doc.body.innerHTML;
}

/** Rubrika iz fajla po id-u ("plate") ili nazivu ("Plate i radnici"). */
function mapirajRubriku(v: unknown): string | null {
  const t = String(v ?? "").trim().toLowerCase();
  if (!t) return null;
  const r = RUBRIKE.find((x) => x.id === t || x.naziv.toLowerCase() === t);
  return r ? r.id : null;
}

/** Pozicija po id-u ("OBICNO"), nazivu ("Obično") ili punom tekstu opcije. */
function mapirajPoziciju(v: unknown): VijestPozicija | null {
  const t = String(v ?? "").trim().toLowerCase();
  if (!t) return null;
  const p = POZICIJE.find(
    (x) =>
      x.id.toLowerCase() === t ||
      x.naziv.toLowerCase() === t ||
      `${x.naziv}, ${x.opis}`.toLowerCase() === t ||
      t.startsWith(x.naziv.toLowerCase()),
  );
  return p ? p.id : null;
}

/** Vrsta iz fajla: "vijest" ili "vodic" (i "vodič"); null = nepoznata vrijednost. */
const VRSTE: Record<string, VijestTip> = { vijest: "VIJEST", vodic: "VODIC", "vodič": "VODIC" };
function mapirajTip(v: unknown): VijestTip | null {
  return VRSTE[String(v ?? "").trim().toLowerCase()] ?? null;
}

/** Datum GGGG-MM-DD koji zaista postoji (2026-13-45 prolazi regex, ali ne i ovo). */
function valjanIsoDatum(s: string): boolean {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const [g, mj, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(g, mj - 1, d);
  return dt.getFullYear() === g && dt.getMonth() === mj - 1 && dt.getDate() === d;
}

function tekstIzHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function brojRijeci(html: string): number {
  const t = tekstIzHtml(html);
  return t ? t.split(/\s+/).length : 0;
}

type Provjera = { kljuc: string; opis: string; status: "ok" | "greska" | "upozorenje" };

// Ogledalo backend semafora (backend/src/controllers/vijestiController.js).
// Ako se pravila mijenjaju, mijenjaju se na oba mjesta.
function izracunajSemafor(s: Stanje): Provjera[] {
  const rijeci = brojRijeci(s.sadrzaj);
  const minRijeci = MIN_RIJECI[s.tip];
  const fraza = s.fokusFraza.trim().toLowerCase();
  const uvod = tekstIzHtml(s.sadrzaj).slice(0, 400).toLowerCase();
  const p: Provjera[] = [];
  const dodaj = (
    kljuc: string,
    opis: string,
    uslov: boolean,
    nivo: "greska" | "upozorenje" = "greska",
  ) => p.push({ kljuc, opis, status: uslov ? "ok" : nivo });

  dodaj(
    "seoNaslov",
    `SEO naslov ${SEO_LIMITI.naslovMin} do ${SEO_LIMITI.naslovMax} znakova`,
    s.seoNaslov.length >= SEO_LIMITI.naslovMin &&
      s.seoNaslov.length <= SEO_LIMITI.naslovMax,
  );
  dodaj(
    "seoOpis",
    `SEO opis ${SEO_LIMITI.opisMin} do ${SEO_LIMITI.opisMax} znakova`,
    s.seoOpis.length >= SEO_LIMITI.opisMin && s.seoOpis.length <= SEO_LIMITI.opisMax,
  );
  dodaj("fokusFraza", "Fokus fraza je upisana", !!fraza);
  dodaj(
    "frazaUNaslovu",
    "Fokus fraza se pojavljuje u naslovu",
    !fraza || s.naslov.toLowerCase().includes(fraza),
    "upozorenje",
  );
  dodaj(
    "frazaUUvodu",
    "Fokus fraza se pojavljuje u prvom pasusu",
    !fraza || uvod.includes(fraza),
    "upozorenje",
  );
  dodaj("slika", "Naslovna slika je postavljena", !!s.naslovnaSlika);
  dodaj("alt", "Naslovna slika ima alt opis", !!s.naslovnaAlt);
  dodaj(
    "internaVeza",
    "Bar jedna veza na naš alat ili raniji tekst",
    /<a[^>]+href="\//i.test(s.sadrzaj),
  );
  dodaj(
    "duzina",
    `Dužina teksta najmanje ${minRijeci} riječi (trenutno ${rijeci})`,
    rijeci >= minRijeci,
    s.tip === "VODIC" ? "greska" : "upozorenje",
  );
  dodaj(
    "sazetak",
    `Sažetak ${SAZETAK_LIMITI.min} do ${SAZETAK_LIMITI.max} znakova`,
    s.sazetak.trim().length >= SAZETAK_LIMITI.min &&
      s.sazetak.trim().length <= SAZETAK_LIMITI.max,
  );
  return p;
}

function Brojac({ duz, min, max }: { duz: number; min: number; max: number }) {
  const ok = duz >= min && duz <= max;
  return (
    <span
      className={`${styles.counter} ${duz === 0 ? "" : ok ? styles.counterOk : styles.counterLose}`}
    >
      {duz}/{max}
    </span>
  );
}

export default function VijestEditor({ id }: { id: string }) {
  const router = useRouter();
  const noviTekst = id === "novi";
  const [clanakId, setClanakId] = useState<number | null>(
    noviTekst ? null : Number(id),
  );
  const [s, setS] = useState<Stanje>(PRAZNO);
  const [status, setStatus] = useState<VijestStatus>("NACRT");
  const [ucitavam, setUcitavam] = useState(!noviTekst);
  const [snimam, setSnimam] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);
  const [poruka, setPoruka] = useState<string | null>(null);
  const [slicni, setSlicni] = useState<SlicanClanak[]>([]);
  const [uputstvoOtvoreno, setUputstvoOtvoreno] = useState(true);
  const [brisanje, setBrisanje] = useState(false);
  const [zakazDatum, setZakazDatum] = useState("");
  const [zakazVrijeme, setZakazVrijeme] = useState("08:00");
  const [datumObjave, setDatumObjave] = useState<string | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const uvozRef = useRef<HTMLInputElement>(null);
  // uvoz čeka potvrdu kad bi pregazio već unesen sadržaj
  const [uvozZaPotvrdu, setUvozZaPotvrdu] = useState<UvozJson | null>(null);
  // TipTap čita sadržaj samo pri mount-u, pa uvoz remount-a editor kroz key
  const [editorKey, setEditorKey] = useState(0);

  const postavi = useCallback(
    <K extends keyof Stanje>(kljuc: K, vrijednost: Stanje[K]) => {
      setS((prev) => ({ ...prev, [kljuc]: vrijednost }));
    },
    [],
  );

  // uputstvo se pamti zatvoreno, da ne smeta poslije prvih par tekstova
  useEffect(() => {
    if (typeof window === "undefined") return;
    setUputstvoOtvoreno(localStorage.getItem("vijesti-uputstvo-zatvoreno") !== "1");
  }, []);

  useEffect(() => {
    if (noviTekst) return;
    let ziv = true;
    void (async () => {
      const res = await adminGetClanak(Number(id));
      if (!ziv) return;
      if (!res.ok || !res.data) {
        setGreska("Tekst nije pronađen.");
        setUcitavam(false);
        return;
      }
      const c = res.data;
      setS({
        tip: c.tip,
        naslov: c.naslov ?? "",
        nadnaslov: c.nadnaslov ?? "",
        sazetak: c.sazetak ?? "",
        sadrzaj: c.sadrzaj ?? "",
        rubrika: c.rubrika,
        tagovi: (c.tagovi ?? []).join(", "),
        naslovnaSlika: c.naslovnaSlika ?? "",
        naslovnaAlt: c.naslovnaAlt ?? "",
        autorPotpis: c.autorPotpis ?? "",
        izvorPropisa: c.izvorPropisa ?? "",
        seoNaslov: c.seoNaslov ?? "",
        seoOpis: c.seoOpis ?? "",
        fokusFraza: c.fokusFraza ?? "",
        datumProvjere: c.datumProvjere ?? "",
        slug: c.slug,
        uRijeci: c.uRijeci,
        istaknut: c.istaknut,
        pozicija: c.pozicija ?? "OBICNO",
      });
      setStatus(c.status);
      setDatumObjave(c.datumObjave);
      if (c.datumObjave) {
        const d = new Date(c.datumObjave);
        setZakazDatum(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        );
        setZakazVrijeme(
          `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
        );
      }
      setUcitavam(false);
    })();
    return () => {
      ziv = false;
    };
  }, [id, noviTekst]);

  // provjera duplikata: dva teksta na istu frazu se guše u pretrazi
  useEffect(() => {
    const naslov = s.naslov.trim();
    const fraza = s.fokusFraza.trim();
    if (!naslov && !fraza) {
      setSlicni([]);
      return;
    }
    const t = setTimeout(() => {
      void adminSlicniClanci({
        naslov,
        fokusFraza: fraza,
        ...(clanakId ? { id: clanakId } : {}),
      }).then((res) => setSlicni(res.ok && res.data ? res.data : []));
    }, 700);
    return () => clearTimeout(t);
  }, [s.naslov, s.fokusFraza, clanakId]);

  const semafor = useMemo(() => izracunajSemafor(s), [s]);
  const greskeSemafora = semafor.filter((p) => p.status === "greska");

  function payload(): ClanakPayload {
    return {
      tip: s.tip,
      naslov: s.naslov,
      nadnaslov: s.nadnaslov || null,
      sazetak: s.sazetak || null,
      sadrzaj: s.sadrzaj,
      rubrika: s.rubrika,
      tagovi: s.tagovi
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      naslovnaSlika: s.naslovnaSlika || null,
      naslovnaAlt: s.naslovnaAlt || null,
      autorPotpis: s.autorPotpis || null,
      izvorPropisa: s.izvorPropisa || null,
      seoNaslov: s.seoNaslov || null,
      seoOpis: s.seoOpis || null,
      fokusFraza: s.fokusFraza || null,
      datumProvjere: s.datumProvjere || null,
      slug: s.slug || undefined,
      uRijeci: s.uRijeci,
      istaknut: s.istaknut,
      pozicija: s.pozicija,
    };
  }

  async function snimi(): Promise<number | null> {
    if (!s.naslov.trim()) {
      setGreska("Naslov je obavezan.");
      return null;
    }
    setSnimam(true);
    setGreska(null);
    setPoruka(null);
    try {
      if (clanakId == null) {
        const res = await adminKreirajClanak(payload());
        if (!res.ok) {
          setGreska(res.error || "Snimanje nije uspjelo.");
          return null;
        }
        if (!res.data) {
          setGreska("Snimanje nije uspjelo.");
          return null;
        }
        const kreiran = res.data;
        setClanakId(kreiran.id);
        setS((prev) => ({ ...prev, slug: kreiran.slug }));
        // adresa se mijenja iz /novi u /:id bez ponovnog učitavanja
        window.history.replaceState(null, "", `/admin/vijesti/${res.data.id}`);
        setPoruka("Nacrt je snimljen.");
        return res.data.id;
      }
      const res = await adminIzmijeniClanak(clanakId, payload());
      if (!res.ok) {
        setGreska(res.error || "Snimanje nije uspjelo.");
        return null;
      }
      setPoruka("Izmjene su snimljene.");
      return clanakId;
    } finally {
      setSnimam(false);
    }
  }

  async function promijeniStatus(novi: VijestStatus, kada?: string) {
    const cid = await snimi();
    if (cid == null) return;
    const res = await adminPromijeniStatus(cid, novi, kada);
    if (!res.ok) {
      const problemi = (res as { data?: { problemi?: string[] } }).data?.problemi;
      setGreska(
        problemi?.length
          ? `Objava je zaustavljena: ${problemi.join("; ")}`
          : res.error || "Promjena statusa nije uspjela.",
      );
      return;
    }
    setStatus(novi);
    // backend vraća datum koji je zaista upisan (kod objave "sada"), da red
    // "Status: Objavljen" odmah dobije datum, bez ponovnog učitavanja stranice
    if (res.data?.datumObjave) setDatumObjave(res.data.datumObjave);
    setPoruka(
      novi === "OBJAVLJEN"
        ? "Tekst je objavljen."
        : novi === "ZAKAZAN"
          ? "Objava je zakazana."
          : novi === "ARHIVIRAN"
            ? "Tekst je arhiviran."
            : "Tekst je vraćen u nacrt.",
    );
  }

  // Zakazivanje: datum i vrijeme se spajaju u jedan trenutak. Kad taj trenutak
  // prođe, tekst je javno vidljiv sam od sebe, bez posla u pozadini.
  function zakazi() {
    if (!zakazDatum) {
      setGreska("Odaberi datum objave.");
      return;
    }
    const trenutak = new Date(`${zakazDatum}T${zakazVrijeme || "08:00"}:00`);
    if (Number.isNaN(trenutak.getTime())) {
      setGreska("Datum ili vrijeme nisu ispravni.");
      return;
    }
    if (trenutak.getTime() <= Date.now()) {
      setGreska("Termin je u prošlosti, izaberi budući datum ili objavi odmah.");
      return;
    }
    void promijeniStatus("ZAKAZAN", trenutak.toISOString());
  }

  async function ubaciNaslovnu(file: File) {
    setGreska(null);
    const res = await adminUploadSliku(file);
    if (!res.ok || !res.data) {
      setGreska("Slanje slike nije uspjelo.");
      return;
    }
    postavi("naslovnaSlika", res.data.url);
  }

  async function primijeniUvoz(j: UvozJson) {
    const upozorenja: string[] = [];

    // vrsta "vijest" (default) ili "vodic": vodič je stalna stranica na /vodici,
    // traži najmanje 1200 riječi i ide u rubriku Vodiči ako fajl ne kaže drugo.
    // Objavljenom tekstu se vrsta ne mijenja (kao ni slug): promjena bi ga
    // preselila između /vijesti i /vodici i slomila indeksiranu adresu.
    const tipIzFajla = j.vrsta == null ? "VIJEST" : mapirajTip(j.vrsta);
    if (j.vrsta != null && !tipIzFajla) {
      upozorenja.push(`vrsta "${String(j.vrsta)}" nije podržana, postavljena je Vijest`);
    }
    const tip: VijestTip = status === "OBJAVLJEN" ? s.tip : (tipIzFajla ?? "VIJEST");
    if (status === "OBJAVLJEN" && tipIzFajla && tipIzFajla !== s.tip) {
      upozorenja.push("vrsta se objavljenom tekstu ne mijenja, ostala je kakva je bila");
    }
    const rubrika = mapirajRubriku(j.rubrika);
    if (j.rubrika != null && !rubrika) {
      upozorenja.push(`rubrika "${String(j.rubrika)}" nije prepoznata, ostavljen je default`);
    }
    const pozicija = mapirajPoziciju(j.pozicija_na_naslovnoj);
    if (j.pozicija_na_naslovnoj != null && !pozicija) {
      upozorenja.push("pozicija na naslovnoj nije prepoznata, ostavljen je default");
    }

    const sadrzaj = sanitizujHtmlUvoza(String(j.tekst_html ?? ""));

    // samo vodič nosi datum sljedeće provjere (GGGG-MM-DD); neispravan datum ili
    // datum uz vijest daje upozorenje kao i ostala polja, ne gubi se tiho
    let sljedecaProvjera: string | null = null;
    const provjeraIzFajla = String(j.sljedeca_provjera ?? "").trim();
    if (provjeraIzFajla) {
      if (tip !== "VODIC") {
        upozorenja.push("sljedeca_provjera vrijedi samo za vodič, zanemarena je");
      } else if (!valjanIsoDatum(provjeraIzFajla)) {
        upozorenja.push(
          `sljedeca_provjera "${provjeraIzFajla}" nije datum u obliku GGGG-MM-DD, upiši ga ručno`,
        );
      } else {
        sljedecaProvjera = provjeraIzFajla;
      }
    }

    setS((prev) => ({
      ...prev,
      tip,
      naslov: String(j.naslov ?? ""),
      nadnaslov: String(j.nadnaslov ?? ""),
      sazetak: String(j.sazetak ?? ""),
      sadrzaj,
      rubrika: rubrika ?? (tip === "VODIC" ? "vodici" : prev.rubrika),
      datumProvjere: sljedecaProvjera ?? prev.datumProvjere,
      tagovi: String(j.tagovi ?? ""),
      autorPotpis: String(j.potpis_autora ?? ""),
      izvorPropisa: String(j.izvor_propisa ?? ""),
      seoNaslov: String(j.seo_naslov ?? ""),
      seoOpis: String(j.seo_opis ?? ""),
      fokusFraza: String(j.fokus_fraza ?? ""),
      // slug iz fajla samo dok se još smije mijenjati (prije objave)
      slug: status === "OBJAVLJEN" ? prev.slug : String(j.slug ?? "") || prev.slug,
      uRijeci:
        typeof j.prikazi_u_rijeci_vijesti === "boolean"
          ? j.prikazi_u_rijeci_vijesti
          : prev.uRijeci,
      pozicija: pozicija ?? prev.pozicija,
      naslovnaSlika: "",
      naslovnaAlt: String(j.naslovna_slika?.alt ?? ""),
    }));
    setEditorKey((k) => k + 1);

    // slika iz base64 ide kroz ISTI upload kao ručni izbor fajla
    const b64 = j.naslovna_slika?.base64;
    if (b64) {
      try {
        // tolerantno na "data:...;base64," prefiks i prelome reda u base64
        const cist = String(b64).replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
        const bin = atob(cist);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const ime = j.naslovna_slika?.fajl || "naslovna.jpg";
        const tip = /\.png$/i.test(ime)
          ? "image/png"
          : /\.webp$/i.test(ime)
            ? "image/webp"
            : "image/jpeg";
        const file = new File([bytes], ime, { type: tip });
        const res = await adminUploadSliku(file);
        if (res.ok && res.data) {
          postavi("naslovnaSlika", res.data.url);
        } else {
          upozorenja.push("slika iz fajla nije prošla upload, dodaj je ručno");
        }
      } catch {
        upozorenja.push("slika iz fajla nije valjan base64, dodaj je ručno");
      }
    } else {
      upozorenja.push("fajl nema naslovnu sliku");
    }

    // pravilo sajta: em dash (U+2014) ne ide u sadržaj, uvoz upozorava
    const tekstualno = [
      j.naslov,
      j.nadnaslov,
      j.sazetak,
      j.tekst_html,
      j.seo_naslov,
      j.seo_opis,
      j.tagovi,
      j.naslovna_slika?.alt,
    ]
      .map((x) => String(x ?? ""))
      .join(" ");
    if (tekstualno.includes("\u2014")) {
      upozorenja.push("sadržaj ima em dash, pravilo sajta je bez njega");
    }

    setPoruka(
      [
        "Uvezeno iz fajla, pregledaj pa snimi kao nacrt.",
        j.prioritet ? `Prioritet iz fajla: ${String(j.prioritet)}.` : "",
        upozorenja.length ? `Upozorenja: ${upozorenja.join("; ")}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  async function obradiUvozFajla(file: File) {
    setGreska(null);
    setPoruka(null);
    let parsirano: unknown;
    try {
      parsirano = JSON.parse(await file.text());
    } catch {
      setGreska("Uvoz nije uspio: fajl nije ispravan JSON.");
      return;
    }
    const j = parsirano as UvozJson;
    if (!j || typeof j !== "object" || j.format !== "pk-vijest" || j.verzija !== 1) {
      setGreska('Uvoz nije uspio: fajl nije u formatu "pk-vijest" verzije 1.');
      return;
    }
    // već unesen sadržaj se ne gazi bez pitanja
    const imaSadrzaja = !!(s.naslov.trim() || s.sazetak.trim() || tekstIzHtml(s.sadrzaj));
    if (imaSadrzaja) {
      setUvozZaPotvrdu(j);
      return;
    }
    await primijeniUvoz(j);
  }

  if (ucitavam) {
    return (
      <div className={styles.wrap}>
        <p className={styles.subtitle}>Učitavanje...</p>
      </div>
    );
  }

  const backendUrl = getBackendUrl();

  return (
    <div className={styles.wrap}>
      <Link href="/admin/vijesti" className={styles.backLink}>
        &larr; Svi tekstovi
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {noviTekst && clanakId == null ? "Novi tekst" : s.naslov || "Bez naslova"}
          </h1>
          <p className={styles.subtitle}>
            Status: <strong>{STATUS_LABELE[status]}</strong>
            {s.slug ? ` · adresa: ${putanjaClanka(s.tip, s.slug)}` : ""}
          </p>
        </div>
        <div className={styles.actions}>
          {noviTekst && (
            <>
              <input
                ref={uvozRef}
                type="file"
                accept="application/json,.json"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void obradiUvozFajla(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => uvozRef.current?.click()}
                title='JSON u formatu "pk-vijest" v1, popunjava formu kao nacrt'
              >
                Uvezi iz fajla
              </button>
            </>
          )}
          <button
            type="button"
            className={styles.btnGhost}
            onClick={() => void snimi()}
            disabled={snimam}
          >
            {snimam ? "Snimam..." : "Sačuvaj"}
          </button>
          {status !== "OBJAVLJEN" ? (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => void promijeniStatus("OBJAVLJEN")}
              disabled={snimam || greskeSemafora.length > 0}
              title={
                greskeSemafora.length > 0
                  ? "Prvo riješi crvene stavke u provjeri"
                  : undefined
              }
            >
              Objavi
            </button>
          ) : (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => void promijeniStatus("ARHIVIRAN")}
              disabled={snimam}
            >
              Arhiviraj
            </button>
          )}
          {clanakId != null && (
            <button
              type="button"
              className={styles.btnDanger}
              onClick={() => setBrisanje(true)}
            >
              Obriši
            </button>
          )}
        </div>
      </div>

      {greska && <p className={styles.error}>{greska}</p>}
      {poruka && !greska && <p className={styles.saveNote}>{poruka}</p>}

      {/* Uputstvo */}
      <div className={styles.uputstvo}>
        <div className={styles.uputstvoHead}>
          <h3 className={styles.uputstvoNaslov}>Kako objaviti tekst</h3>
          <button
            type="button"
            className={styles.uputstvoToggle}
            onClick={() => {
              const novo = !uputstvoOtvoreno;
              setUputstvoOtvoreno(novo);
              if (typeof window !== "undefined") {
                localStorage.setItem(
                  "vijesti-uputstvo-zatvoreno",
                  novo ? "0" : "1",
                );
              }
            }}
          >
            {uputstvoOtvoreno ? "Sakrij" : "Prikaži uputstvo"}
          </button>
        </div>
        {uputstvoOtvoreno && (
          <div className={styles.uputstvoBody}>
            {VIJESTI_UPUTSTVO.map((sek) => (
              <div key={sek.naslov} className={styles.uputstvoSekcija}>
                <h4>{sek.naslov}</h4>
                <ul>
                  {sek.stavke.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {slicni.length > 0 && (
        <div className={styles.slicni}>
          <p className={styles.slicniNaslov}>
            Pažnja: već imamo sličan tekst. Razmisli da li da ažuriraš postojeći
            umjesto da praviš novi.
          </p>
          {slicni.map((c) => (
            <div key={c.id} className={styles.slicniItem}>
              <Link href={`/admin/vijesti/${c.id}`}>{c.naslov}</Link>{" "}
              <span className={styles.slicniRazlog}>
                ({c.skor}% poklapanja: {c.razlozi.join(", ")})
              </span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.grid}>
        {/* ── Glavna kolona ── */}
        <div>
          <div className={styles.card}>
            <div className={styles.field}>
              <label className={styles.label}>Naslov</label>
              <input
                className={`${styles.input} ${styles.inputVelik}`}
                value={s.naslov}
                onChange={(e) => postavi("naslov", e.target.value)}
                placeholder="Naslov teksta"
              />
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>Nadnaslov</label>
                <input
                  className={styles.input}
                  value={s.nadnaslov}
                  onChange={(e) => postavi("nadnaslov", e.target.value)}
                  placeholder="npr. Porezna uprava FBiH"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Adresa (slug)</label>
                <input
                  className={styles.input}
                  value={s.slug}
                  onChange={(e) => postavi("slug", e.target.value)}
                  disabled={status === "OBJAVLJEN"}
                  placeholder="popuni se sam iz naslova"
                />
                <span className={styles.hint}>
                  {status === "OBJAVLJEN"
                    ? "Objavljen tekst zadržava adresu, jer je već u Googleu i tuđim linkovima."
                    : "Kratka, bez datuma. Poslije objave se više ne mijenja."}
                </span>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                Sažetak
                <Brojac
                  duz={s.sazetak.length}
                  min={SAZETAK_LIMITI.min}
                  max={SAZETAK_LIMITI.max}
                />
              </label>
              <textarea
                className={styles.textarea}
                value={s.sazetak}
                onChange={(e) => postavi("sazetak", e.target.value)}
              />
              <span className={styles.hint}>{POMOC_POLJA.sazetak}</span>
            </div>
          </div>

          <RichEditor
            key={editorKey}
            value={s.sadrzaj}
            onChange={(html) => postavi("sadrzaj", html)}
          />
        </div>

        {/* ── Bočna kolona ── */}
        <div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Provjera prije objave</h3>
            <ul className={styles.semaforList}>
              {semafor.map((p) => (
                <li key={p.kljuc} className={styles.semaforItem}>
                  <span
                    className={`${styles.semaforIkona} ${
                      p.status === "ok"
                        ? styles.semaforOk
                        : p.status === "greska"
                          ? styles.semaforGreska
                          : styles.semaforUpozorenje
                    }`}
                  >
                    {p.status === "ok" ? "✓" : p.status === "greska" ? "!" : "?"}
                  </span>
                  <span className={p.status === "ok" ? styles.semaforTekstOk : ""}>
                    {p.opis}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Objava</h3>
            <p className={styles.zakazanoNote} style={{ marginTop: 0 }}>
              Status: <strong>{STATUS_LABELE[status]}</strong>
              {status === "ZAKAZAN" && datumObjave
                ? ` za ${formatDate(datumObjave)} u ${zakazVrijeme}`
                : ""}
              {status === "OBJAVLJEN" && datumObjave
                ? ` ${formatDate(datumObjave)}`
                : ""}
            </p>
            {status !== "OBJAVLJEN" && (
              <>
                <div className={styles.field} style={{ marginTop: "0.75rem" }}>
                  <label className={styles.label}>Zakaži objavu</label>
                  <div className={styles.zakazivanje}>
                    <DateInput
                      className={styles.input}
                      value={zakazDatum}
                      onValueChange={setZakazDatum}
                    />
                    <input
                      className={styles.zakazivanjeVrijeme}
                      type="time"
                      value={zakazVrijeme}
                      onChange={(e) => setZakazVrijeme(e.target.value)}
                      aria-label="Vrijeme objave"
                    />
                  </div>
                  <span className={styles.hint}>
                    Tekst se sam pojavi na sajtu kad dođe taj trenutak, ne treba
                    ništa dodatno klikati.
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={zakazi}
                  disabled={snimam || greskeSemafora.length > 0}
                  title={
                    greskeSemafora.length > 0
                      ? "Prvo riješi crvene stavke u provjeri"
                      : undefined
                  }
                >
                  {status === "ZAKAZAN" ? "Promijeni termin" : "Zakaži objavu"}
                </button>
              </>
            )}
            {status === "ZAKAZAN" && (
              <button
                type="button"
                className={styles.btnDanger}
                style={{ marginTop: "0.5rem" }}
                onClick={() => void promijeniStatus("NACRT")}
                disabled={snimam}
              >
                Otkaži zakazivanje
              </button>
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Vrsta i rubrika</h3>
            <div className={styles.field}>
              <label className={styles.label}>Vrsta</label>
              <StyledSelect
                ariaLabel="Vrsta teksta"
                wrapStyle={{ width: "100%" }}
                value={s.tip}
                onChange={(v) => postavi("tip", (v as VijestTip) || "VIJEST")}
                groups={[
                  {
                    options: [
                      { value: "VIJEST", label: "Vijest (rijeka, po datumu)" },
                      { value: "VODIC", label: "Vodič (stalna stranica, po temi)" },
                    ],
                  },
                ]}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Rubrika</label>
              <StyledSelect
                ariaLabel="Rubrika"
                wrapStyle={{ width: "100%" }}
                value={s.rubrika}
                onChange={(v) => postavi("rubrika", String(v ?? ""))}
                groups={[
                  {
                    options: RUBRIKE.map((r) => ({ value: r.id, label: r.naziv })),
                  },
                ]}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Tagovi</label>
              <input
                className={styles.input}
                value={s.tagovi}
                onChange={(e) => postavi("tagovi", e.target.value)}
                placeholder="odvojeni zarezom"
              />
            </div>
            <label className={styles.hint}>
              <input
                type="checkbox"
                checked={s.uRijeci}
                onChange={(e) => postavi("uRijeci", e.target.checked)}
              />{" "}
              Prikaži u rijeci vijesti
              {s.tip === "VODIC"
                ? " (uključi kad vodič bitno ažuriraš, da dobije novi val čitalaca)"
                : ""}
            </label>
            <br />
            <div className={styles.field} style={{ marginTop: "0.75rem" }}>
              <label className={styles.label}>Pozicija na naslovnoj</label>
              <StyledSelect
                ariaLabel="Pozicija na naslovnoj"
                wrapStyle={{ width: "100%" }}
                value={s.pozicija}
                onChange={(v) =>
                  postavi("pozicija", (v as VijestPozicija) || "OBICNO")
                }
                groups={[
                  {
                    options: POZICIJE.map((p) => ({
                      value: p.id,
                      label: `${p.naziv}, ${p.opis}`,
                    })),
                  },
                ]}
              />
              <span className={styles.hint}>
                Kad ovaj tekst postane vodeći, dosadašnji vodeći se sam spušta
                na izdvojeno, a najstariji izdvojeni u rijeku. Ako ništa ne
                dirate, vrh zauzima najnoviji tekst.
              </span>
            </div>
            {s.tip === "VODIC" && (
              <div className={styles.field} style={{ marginTop: "0.75rem" }}>
                <label className={styles.label}>Sljedeća provjera</label>
                <DateInput
                  className={styles.input}
                  value={s.datumProvjere}
                  onValueChange={(iso) => postavi("datumProvjere", iso)}
                />
                <span className={styles.hint}>{POMOC_POLJA.datumProvjere}</span>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Naslovna slika</h3>
            <p className={styles.hint} style={{ margin: "0 0 0.75rem" }}>
              {POMOC_POLJA.naslovnaSlika}
            </p>
            <div className={styles.coverBox}>
              {s.naslovnaSlika ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  className={styles.coverPreview}
                  src={`${backendUrl}${s.naslovnaSlika}`}
                  alt={s.naslovnaAlt || "Naslovna slika"}
                />
              ) : (
                <div className={styles.coverPrazna}>Nema slike</div>
              )}
              <div style={{ flex: 1 }}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => coverRef.current?.click()}
                >
                  {s.naslovnaSlika ? "Zamijeni" : "Dodaj sliku"}
                </button>
                {s.naslovnaSlika && (
                  <button
                    type="button"
                    className={styles.btnDanger}
                    style={{ marginTop: "0.4rem" }}
                    onClick={() => postavi("naslovnaSlika", "")}
                  >
                    Ukloni
                  </button>
                )}
              </div>
            </div>
            <input
              ref={coverRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void ubaciNaslovnu(f);
                e.target.value = "";
              }}
            />
            <div className={styles.field} style={{ marginTop: "0.75rem" }}>
              <label className={styles.label}>Alt opis</label>
              <input
                className={styles.input}
                value={s.naslovnaAlt}
                onChange={(e) => postavi("naslovnaAlt", e.target.value)}
              />
              <span className={styles.hint}>{POMOC_POLJA.naslovnaAlt}</span>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>SEO</h3>
            <div className={styles.field}>
              <label className={styles.label}>
                Fokus fraza
              </label>
              <input
                className={styles.input}
                value={s.fokusFraza}
                onChange={(e) => postavi("fokusFraza", e.target.value)}
                placeholder="npr. minimalna plata u fbih 2027"
              />
              <span className={styles.hint}>{POMOC_POLJA.fokusFraza}</span>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                SEO naslov
                <Brojac
                  duz={s.seoNaslov.length}
                  min={SEO_LIMITI.naslovMin}
                  max={SEO_LIMITI.naslovMax}
                />
              </label>
              <input
                className={styles.input}
                value={s.seoNaslov}
                onChange={(e) => postavi("seoNaslov", e.target.value)}
              />
              <span className={styles.hint}>{POMOC_POLJA.seoNaslov}</span>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>
                SEO opis
                <Brojac
                  duz={s.seoOpis.length}
                  min={SEO_LIMITI.opisMin}
                  max={SEO_LIMITI.opisMax}
                />
              </label>
              <textarea
                className={styles.textarea}
                value={s.seoOpis}
                onChange={(e) => postavi("seoOpis", e.target.value)}
              />
              <span className={styles.hint}>{POMOC_POLJA.seoOpis}</span>
            </div>
            <div className={styles.googleBox}>
              <div className={styles.googleUrl}>
                www.poreznikalkulator.ba{putanjaClanka(s.tip, s.slug || "adresa-teksta")}
              </div>
              <div className={styles.googleTitle}>
                {s.seoNaslov || s.naslov || "Naslov teksta"}
              </div>
              <div className={styles.googleDesc}>
                {s.seoOpis || s.sazetak || "Opis koji se vidi ispod naslova u Googleu."}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Potpis i izvor</h3>
            <div className={styles.field}>
              <label className={styles.label}>Potpis autora</label>
              <input
                className={styles.input}
                value={s.autorPotpis}
                onChange={(e) => postavi("autorPotpis", e.target.value)}
                placeholder="npr. Amar Pjanić, Porezni Kalkulator"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Izvor propisa</label>
              <input
                className={styles.input}
                value={s.izvorPropisa}
                onChange={(e) => postavi("izvorPropisa", e.target.value)}
                placeholder="Službene novine FBiH, broj i datum"
              />
              <span className={styles.hint}>{POMOC_POLJA.izvorPropisa}</span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        kind="confirm"
        open={uvozZaPotvrdu != null}
        variant="danger"
        title="Uvoz iz fajla"
        message="Forma već ima unesen sadržaj. Uvoz će pregaziti sve što je uneseno. Nastaviti?"
        confirmLabel="Pregazi i uvezi"
        cancelLabel="Odustani"
        onConfirm={() => {
          const j = uvozZaPotvrdu;
          setUvozZaPotvrdu(null);
          if (j) void primijeniUvoz(j);
        }}
        onClose={() => setUvozZaPotvrdu(null)}
      />

      <Modal
        kind="confirm"
        open={brisanje}
        variant="danger"
        title="Brisanje teksta"
        message={`Obrisati "${s.naslov || "tekst"}"? Ova radnja se ne može poništiti.`}
        confirmLabel="Obriši"
        cancelLabel="Odustani"
        onConfirm={() => {
          if (clanakId == null) return;
          void adminObrisiClanak(clanakId).then((res) => {
            setBrisanje(false);
            if (res.ok) router.push("/admin/vijesti");
            else setGreska("Brisanje nije uspjelo.");
          });
        }}
        onClose={() => setBrisanje(false)}
      />
    </div>
  );
}
