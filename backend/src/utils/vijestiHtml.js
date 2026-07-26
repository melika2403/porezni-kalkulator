// Obrada sadržaja iz editora: sanitizacija HTML-a, čist tekst, slug i
// provjera sličnosti sa već objavljenim tekstovima.
//
// Sanitizacija je OBAVEZNA i radi se na serveru. Sadržaj dolazi iz editora
// kao HTML, a HTML iz baze se na stranici renderuje kroz dangerouslySetInnerHTML,
// pa bi bilo koji <script>, event handler (onclick) ili javascript: link bio
// otvoren XSS. Radimo po principu allowliste: sve što nije izričito dozvoljeno
// se izbacuje, umjesto da nabrajamo šta je opasno.

const DOZVOLJENI_TAGOVI = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "blockquote",
  "h2", "h3", "h4", "ul", "ol", "li", "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "th", "td", "hr", "code", "pre", "sup", "sub",
]);

const DOZVOLJENI_ATRIBUTI = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  th: new Set(["colspan", "rowspan"]),
  td: new Set(["colspan", "rowspan"]),
};

// Tagovi koji se brišu zajedno sa sadržajem (ne samo tag, nego i šta je unutra).
const TAGOVI_SA_SADRZAJEM = new Set(["script", "style", "iframe", "object", "embed"]);

function sigurnaAdresa(url) {
  const v = String(url || "").trim();
  if (!v) return null;
  // relativne (/uploads/...) i sidrišta su uvijek u redu
  if (v.startsWith("/") || v.startsWith("#")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^mailto:/i.test(v)) return v;
  // sve ostalo (javascript:, data:, vbscript:) ide van
  return null;
}

function escapeText(s) {
  // Dvostruki navodnik je obavezan: vrijednosti atributa upisujemo unutar
  // dvostrukih navodnika, a ulazni atribut može biti jednostruko citiran i
  // slobodno nositi " (npr. title='x" onerror="alert(1)').
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sanitizira HTML iz editora po allowlisti. Vraća čist HTML.
 * Namjerno jednostavan parser: editor proizvodi uredan HTML, a sve što ne
 * prepoznamo ionako izbacujemo.
 */
function sanitizeHtml(input) {
  let html = String(input || "");

  // 1) tagovi sa sadržajem (script/style/iframe...) idu u cijelosti
  for (const tag of TAGOVI_SA_SADRZAJEM) {
    const re = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi");
    html = html.replace(re, "");
    // i samozatvarajući / nezatvoreni ostatak
    html = html.replace(new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi"), "");
  }
  // 2) HTML komentari (mogu nositi uslovne izraze)
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // 3) prolaz kroz sve tagove: nedozvoljeni se brišu, dozvoljeni se čiste
  return html.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (cijeli, kosa, tagRaw, atributi) => {
    const tag = tagRaw.toLowerCase();
    if (!DOZVOLJENI_TAGOVI.has(tag)) return "";
    if (kosa) return `</${tag}>`;

    const dozvoljeni = DOZVOLJENI_ATRIBUTI[tag];
    if (!dozvoljeni) return `<${tag}>`;

    const izlaz = [];
    const videni = new Set();
    const reAtr = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let m;
    while ((m = reAtr.exec(atributi)) !== null) {
      const ime = m[1].toLowerCase();
      const vrijednost = m[3] ?? m[4] ?? "";
      if (!dozvoljeni.has(ime)) continue;
      // isti atribut dvaput je neispravan HTML; vrijedi prvi, kao u pregledniku
      if (videni.has(ime)) continue;
      videni.add(ime);
      if (ime === "href" || ime === "src") {
        const safe = sigurnaAdresa(vrijednost);
        if (!safe) continue;
        izlaz.push(`${ime}="${escapeText(safe)}"`);
        continue;
      }
      izlaz.push(`${ime}="${escapeText(vrijednost)}"`);
    }
    // vanjski linkovi uvijek dobiju rel, da nam se ne prenosi autoritet i da
    // target="_blank" ne bude sigurnosna rupa (reverse tabnabbing). Postojeći
    // rel se dopunjava, ne dupla: dva rel atributa su neispravan HTML, a
    // sanitizacija se nad istim tekstom može pokrenuti i više puta.
    if (tag === "a") {
      const href = izlaz.find((a) => a.startsWith('href="')) || "";
      if (/href="https?:\/\//i.test(href)) {
        const iRel = izlaz.findIndex((a) => a.startsWith('rel="'));
        const postojeci = iRel >= 0 ? izlaz[iRel].slice(5, -1).split(/\s+/) : [];
        const spojeni = new Set(postojeci.filter(Boolean));
        spojeni.add("noopener");
        spojeni.add("nofollow");
        const atribut = `rel="${[...spojeni].join(" ")}"`;
        if (iRel >= 0) izlaz[iRel] = atribut;
        else izlaz.push(atribut);
      }
    }
    return `<${tag}${izlaz.length ? " " + izlaz.join(" ") : ""}>`;
  });
}

/** Čist tekst iz HTML-a (za izvod, brojanje riječi i provjeru sličnosti). */
function htmlUTekst(html) {
  return String(html || "")
    .replace(/<(br|\/p|\/h[1-6]|\/li|\/tr)>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function brojRijeci(tekst) {
  const t = String(tekst || "").trim();
  return t ? t.split(/\s+/).length : 0;
}

/** "Šta je AMS-1035 obrazac?" → "sta-je-ams-1035-obrazac" */
function napraviSlug(naslov) {
  return String(naslov || "")
    .toLowerCase()
    .replace(/č|ć/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

// ── Provjera sličnosti ──────────────────────────────────────────────────────
// Cilj je spriječiti dva teksta na istu temu, jer se međusobno guše u
// pretrazi (kanibalizacija). Poredimo naslov i fokus frazu kao skupove riječi
// (Jaccard), bez čestih riječi koje ne nose značenje.

const STOP_RIJECI = new Set([
  "i", "u", "na", "za", "od", "do", "je", "se", "sa", "po", "o", "a", "ili",
  "kako", "sta", "što", "koji", "koja", "koje", "li", "da", "the", "of",
]);

function tokeni(tekst) {
  return new Set(
    napraviSlug(tekst)
      .split("-")
      .filter((r) => r.length > 2 && !STOP_RIJECI.has(r)),
  );
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let presjek = 0;
  for (const t of a) if (b.has(t)) presjek += 1;
  return presjek / (a.size + b.size - presjek);
}

/**
 * Vraća listu sličnih tekstova, najsličniji prvi.
 * Razlozi: "ista fokus fraza" (najteži slučaj) i "sličan naslov".
 */
function nadjiSlicne({ naslov, fokusFraza }, postojeci, { prag = 0.5 } = {}) {
  const tNaslov = tokeni(naslov);
  const tFraza = tokeni(fokusFraza);
  const fokusNorm = napraviSlug(fokusFraza);

  const nalazi = [];
  for (const c of postojeci) {
    const razlozi = [];
    let skor = 0;

    if (fokusNorm && napraviSlug(c.fokusFraza) === fokusNorm) {
      razlozi.push("ista fokus fraza");
      skor = 1;
    }
    const sNaslov = jaccard(tNaslov, tokeni(c.naslov));
    if (sNaslov >= prag) {
      razlozi.push("sličan naslov");
      skor = Math.max(skor, sNaslov);
    }
    if (tFraza.size > 0) {
      const sFraza = jaccard(tFraza, tokeni(c.naslov));
      if (sFraza >= prag) {
        razlozi.push("fokus fraza se poklapa sa naslovom postojećeg teksta");
        skor = Math.max(skor, sFraza);
      }
    }
    if (razlozi.length > 0) {
      nalazi.push({
        id: c.id,
        naslov: c.naslov,
        slug: c.slug,
        tip: c.tip,
        status: c.status,
        skor: Math.round(skor * 100),
        razlozi,
      });
    }
  }
  return nalazi.sort((a, b) => b.skor - a.skor).slice(0, 5);
}

module.exports = {
  sanitizeHtml,
  htmlUTekst,
  brojRijeci,
  napraviSlug,
  nadjiSlicne,
};
