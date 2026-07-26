/* Uvoz vodiča sa starog bloga u tabelu vijesti_clanci.

   MORA se pokrenuti na produkciji PRIJE nego preusmjerenja /blog -> /vodici
   odu uživo, inače 12 rangiranih tekstova ostaje bez ijedne žive adrese
   (odredište preusmjerenja čita iz baze).

   Izvor je backend/scripts/vodici-seed.json koji pravi scripts/izvoz-vodica.js.
   Naslovne slike putuju kroz repo (backend/uploads/vijesti/*.webp).

   Pokretanje (iz foldera backend/):
     node scripts/uvoz-vodica.js                     provjera, ništa se ne upisuje
     node scripts/uvoz-vodica.js --upisi             upisuje tekstove kojih nema
     node scripts/uvoz-vodica.js --upisi --prepisi   osvježava i tekst postojećih

   Idempotentna je: tekst se prepoznaje po slugu, pa ponovno pokretanje ne
   pravi duplikate. --prepisi osvježava samo sadržaj i SEO polja, a status,
   poziciju na naslovnoj i brojače (pregledi, komentari) ne dira. */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { VijestClanak, User, sequelize } = require("../src/models/index");
const { sanitizeHtml, htmlUTekst, brojRijeci } = require("../src/utils/vijestiHtml");

const PUT_SEED = path.join(__dirname, "vodici-seed.json");
const upisi = process.argv.includes("--upisi");
const prepisi = process.argv.includes("--prepisi");

(async () => {
  try {
    if (!fs.existsSync(PUT_SEED)) {
      console.error(`Nema seed datoteke: ${PUT_SEED}`);
      process.exitCode = 1;
      return;
    }
    const seed = JSON.parse(fs.readFileSync(PUT_SEED, "utf8"));

    // Tekstovi su redakcijski, pa idu na prvog administratora: bez autora bi
    // na stranici izostala oznaka službene objave.
    const admin = await User.findOne({
      where: { role: "ADMIN" },
      order: [["id", "ASC"]],
      attributes: ["id", "email"],
    });
    if (admin) {
      console.log(`Autor tekstova: ${admin.email} (id ${admin.id})`);
    } else {
      console.warn("Upozorenje: nema ADMIN korisnika, tekstovi ostaju bez autora.");
    }

    let novih = 0;
    let osvjezenih = 0;
    let preskocenih = 0;

    for (const z of seed) {
      // Sanitizacija i ovdje, iako sadržaj dolazi iz naše baze: seed je
      // datoteka koja se može ručno prepraviti, a u bazu ide samo čist HTML.
      const sadrzaj = sanitizeHtml(z.sadrzaj);
      const sadrzajTekst = htmlUTekst(sadrzaj);

      const tekstISeo = {
        naslov: z.naslov,
        nadnaslov: z.nadnaslov,
        sazetak: z.sazetak,
        sadrzaj,
        sadrzajTekst,
        rubrika: z.rubrika,
        tagovi: (z.tagovi || []).join(",") || null,
        naslovnaSlika: z.naslovnaSlika,
        naslovnaAlt: z.naslovnaAlt,
        autorPotpis: z.autorPotpis,
        izvorPropisa: z.izvorPropisa,
        seoNaslov: z.seoNaslov,
        seoOpis: z.seoOpis,
        fokusFraza: z.fokusFraza,
      };

      const postojeci = await VijestClanak.findOne({ where: { slug: z.slug } });
      const rijeci = brojRijeci(sadrzajTekst);

      if (postojeci && !prepisi) {
        preskocenih += 1;
        console.log(`  = ${z.slug} (već postoji, id ${postojeci.id})`);
        continue;
      }
      if (!upisi) {
        console.log(
          `  ${postojeci ? "~" : "+"} ${z.slug} (${rijeci} riječi${z.naslovnaSlika ? ", sa slikom" : ", BEZ slike"})`,
        );
        continue;
      }

      if (postojeci) {
        await postojeci.update(tekstISeo);
        osvjezenih += 1;
        console.log(`  ~ ${z.slug} osvježen (id ${postojeci.id})`);
      } else {
        const c = await VijestClanak.create({
          ...tekstISeo,
          slug: z.slug,
          tip: z.tip || "VODIC",
          autorId: admin ? admin.id : null,
          status: "OBJAVLJEN",
          datumObjave: z.datumObjave ? new Date(z.datumObjave) : new Date(),
          datumAzuriranja: z.datumAzuriranja ? new Date(z.datumAzuriranja) : null,
          uRijeci: z.uRijeci !== false,
          pozicija: "OBICNO",
        });
        novih += 1;
        console.log(`  + ${z.slug} upisan (id ${c.id}, ${rijeci} riječi)`);
      }
    }

    console.log("");
    if (upisi) {
      console.log(
        `Gotovo: ${novih} novih, ${osvjezenih} osvježenih, ${preskocenih} preskočenih.`,
      );
      if (novih > 0) {
        console.log(
          "Provjerite da su i slike na serveru: backend/uploads/vijesti/*.webp",
        );
      }
    } else {
      console.log(
        `Provjera (ništa nije upisano): ${seed.length} u seedu, ${preskocenih} već u bazi.`,
      );
      console.log("Za stvarni upis: node scripts/uvoz-vodica.js --upisi");
    }
  } catch (e) {
    console.error("Greška:", e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
