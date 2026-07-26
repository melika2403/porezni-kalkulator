/* Izvoz vodiča sa starog bloga iz baze u backend/scripts/vodici-seed.json.

   Zašto postoji: 12 tekstova sa starog /blog su prepisani u tabelu
   vijesti_clanci ručno kroz admin editor, ali samo u razvojnoj bazi. Na
   produkciji ih nema, a /blog/:slug od ove grane trajno preusmjerava na
   /vodici/:slug koji čita iz baze. Bez uvoza bi 12 rangiranih tekstova
   ostalo bez ijedne žive adrese.

   Ova skripta pravi seed iz baze u kojoj su tekstovi gotovi, a
   scripts/uvoz-vodica.js ga upisuje u bilo koju drugu bazu.

   Pokretanje (iz foldera backend/): node scripts/izvoz-vodica.js */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const { VijestClanak, sequelize } = require("../src/models/index");

// Slugovi sa starog bloga. Namjerno nabrojani, a ne "svi vodiči": seed nosi
// tačno one tekstove koji imaju istoriju u pretrazi i moraju preživjeti
// prelazak, a kasnije napisani vodiči nastaju direktno u produkcijskoj bazi.
const SLUGOVI = [
  "kako-voditi-obrt-fbih",
  "koliko-kosta-radnik-poslodavca-fbih",
  "topli-obrok-regres-fbih-2026",
  "otkaz-radnika-fbih",
  "gpd-1051-korak-po-korak",
  "priznati-rashodi-obrta-2026",
  "ugovor-o-djelu-vs-ugovor-o-radu",
  "pdv-obveznik-prag-100000-km",
  "minimalna-plata-fbih-2026",
  "kako-se-racuna-neto-plata-fbih",
  "obrt-vs-doo-2026",
  "otvaranje-obrta-fbih-korak-po-korak",
];

const IZLAZ = path.join(__dirname, "vodici-seed.json");

/** Veze unutar teksta su ostale na starim /blog adresama; one od sada idu
 *  pravo na vodič, da čitalac ne ide kroz preusmjerenje. */
function popraviVeze(html) {
  return String(html || "")
    .replace(/href="\/blog\/([^"]+)"/g, 'href="/vodici/$1"')
    .replace(/href="\/blog"/g, 'href="/vodici"');
}

(async () => {
  try {
    const rows = await VijestClanak.findAll({
      where: { slug: { [Op.in]: SLUGOVI } },
      order: [["datumObjave", "DESC"]],
    });

    const nadjeni = new Set(rows.map((r) => r.slug));
    const nedostaju = SLUGOVI.filter((s) => !nadjeni.has(s));
    if (nedostaju.length > 0) {
      console.error("U ovoj bazi nema ovih tekstova, izvoz bi bio nepotpun:");
      for (const s of nedostaju) console.error(`  - ${s}`);
      console.error("Pokrenite izvoz nad bazom u kojoj su tekstovi uneseni.");
      process.exitCode = 1;
      return;
    }

    let popravljenihVeza = 0;
    const zapisi = rows.map((r) => {
      const sadrzaj = popraviVeze(r.sadrzaj);
      popravljenihVeza += (r.sadrzaj.match(/href="\/blog/g) || []).length;
      return {
        slug: r.slug,
        tip: r.tip,
        naslov: r.naslov,
        nadnaslov: r.nadnaslov,
        sazetak: r.sazetak,
        sadrzaj,
        rubrika: r.rubrika,
        tagovi: r.tagovi ? r.tagovi.split(",").filter(Boolean) : [],
        naslovnaSlika: r.naslovnaSlika,
        naslovnaAlt: r.naslovnaAlt,
        autorPotpis: r.autorPotpis,
        izvorPropisa: r.izvorPropisa,
        seoNaslov: r.seoNaslov,
        seoOpis: r.seoOpis,
        fokusFraza: r.fokusFraza,
        uRijeci: r.uRijeci,
        datumObjave: r.datumObjave ? new Date(r.datumObjave).toISOString() : null,
        datumAzuriranja: r.datumAzuriranja
          ? new Date(r.datumAzuriranja).toISOString()
          : null,
      };
    });

    fs.writeFileSync(IZLAZ, JSON.stringify(zapisi, null, 2) + "\n", "utf8");
    console.log(`Zapisano ${zapisi.length} tekstova u ${IZLAZ}`);
    console.log(`Veza sa /blog prepisano na /vodici: ${popravljenihVeza}`);

    // Slike se ne nose kroz seed, nego kroz repo (backend/uploads je u gitu).
    const bezSlike = zapisi.filter((z) => !z.naslovnaSlika);
    if (bezSlike.length > 0) {
      console.warn(`Bez naslovne slike: ${bezSlike.map((z) => z.slug).join(", ")}`);
    }
    for (const z of zapisi) {
      if (!z.naslovnaSlika) continue;
      const rel = z.naslovnaSlika.replace(/^\/uploads\//, "");
      const put = path.join(__dirname, "..", "uploads", rel);
      if (!fs.existsSync(put)) {
        console.warn(`Slika nedostaje na disku: ${z.naslovnaSlika} (${z.slug})`);
      }
    }
  } catch (e) {
    console.error("Greška:", e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
