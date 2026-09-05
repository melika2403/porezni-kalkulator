import type { MetadataRoute } from "next";
import { reviewedFor } from "src/data/contentMeta";
import { RUBRIKE, putanjaClanka } from "src/data/vijesti";
import { getClanciServer, getTemeServer } from "src/lib/vijestiServer";

const SITE_URL = "https://www.poreznikalkulator.ba";

// Public, indexable pages. Auth-only pages (profil, fakture, organizacija…)
// and legal/account flows are excluded — they're noindex or per-user.
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/sihterica", priority: 0.9, changeFrequency: "weekly" },
  { path: "/spr", priority: 0.9, changeFrequency: "monthly" },
  { path: "/gpd", priority: 0.9, changeFrequency: "monthly" },
  { path: "/gpd/upute", priority: 0.6, changeFrequency: "yearly" },
  { path: "/zo3", priority: 0.9, changeFrequency: "monthly" },
  { path: "/ams", priority: 0.9, changeFrequency: "monthly" },
  { path: "/freelancer", priority: 0.8, changeFrequency: "monthly" },
  { path: "/amortizacija", priority: 0.8, changeFrequency: "monthly" },
  { path: "/preracun-neto-bruto", priority: 0.9, changeFrequency: "monthly" },
  { path: "/pdv-kalkulator", priority: 0.9, changeFrequency: "monthly" },
  { path: "/ugovor-o-pozajmici", priority: 0.8, changeFrequency: "monthly" },
  { path: "/ugovor-o-djelu", priority: 0.8, changeFrequency: "monthly" },
  { path: "/ugovor-o-radu", priority: 0.8, changeFrequency: "monthly" },
  { path: "/rjesenja-i-odluke", priority: 0.8, changeFrequency: "monthly" },
  { path: "/cesije-i-kompenzacije", priority: 0.8, changeFrequency: "monthly" },
  { path: "/clanske-kartice", priority: 0.7, changeFrequency: "monthly" },
  { path: "/pk-office", priority: 0.7, changeFrequency: "monthly" },
  { path: "/solo", priority: 0.8, changeFrequency: "monthly" },
  { path: "/pretplate", priority: 0.6, changeFrequency: "monthly" },
  { path: "/fakture", priority: 0.8, changeFrequency: "monthly" },
  { path: "/fakture/nova", priority: 0.8, changeFrequency: "monthly" },
  { path: "/prijave-radnika", priority: 0.7, changeFrequency: "monthly" },
  { path: "/porezna-kartica", priority: 0.8, changeFrequency: "monthly" },
  { path: "/sifre-djelatnosti", priority: 0.9, changeFrequency: "yearly" },
  { path: "/sifre-zanimanja", priority: 0.9, changeFrequency: "yearly" },
  { path: "/javni-prihodi", priority: 0.9, changeFrequency: "yearly" },
  { path: "/vijesti", priority: 0.8, changeFrequency: "daily" },
  { path: "/vodici", priority: 0.8, changeFrequency: "weekly" },
  { path: "/rasprave", priority: 0.7, changeFrequency: "daily" },
  { path: "/o-nama", priority: 0.5, changeFrequency: "yearly" },
  { path: "/kontakt", priority: 0.5, changeFrequency: "yearly" },
  { path: "/uvjeti", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privatnost", priority: 0.3, changeFrequency: "yearly" },
];

// Backend siječe limit na 50 po zahtjevu, pa sitemap ide stranicu po stranicu.
// Bez ovoga bi preko 50 tekstova stariji tiho ispadali iz sitemapa.
const API_LIMIT = 50;
const MAX_STRANICA = 40; // 2000 zapisa, dovoljno daleko a ne može u petlju

async function sveStranice<T>(
  dohvati: (page: number) => Promise<{ items: T[]; total: number } | null>,
): Promise<T[]> {
  const svi: T[] = [];
  for (let page = 1; page <= MAX_STRANICA; page += 1) {
    const podaci = await dohvati(page);
    const items = podaci?.items ?? [];
    svi.push(...items);
    if (items.length < API_LIMIT || svi.length >= (podaci?.total ?? 0)) break;
  }
  return svi;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // lastModified = stvaran "reviewed" datum po ruti (CONTENT_META), ne build-time
  // "danas" — pošten freshness signal.
  const staticRoutes = ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(reviewedFor(path)),
    changeFrequency,
    priority,
  }));

  // stranice rubrika
  const rubrikaRoutes = RUBRIKE.filter((r) => r.id !== "vodici").map((r) => ({
    url: `${SITE_URL}/vijesti/rubrika/${r.id}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  // Tekstovi iz baze. Ako backend nije dostupan pri buildu, sitemap se svede
  // na statične rute umjesto da build padne.
  const clanci = (await sveStranice((page) => getClanciServer({ limit: API_LIMIT, page }))).map(
    (c) => ({
      url: `${SITE_URL}${putanjaClanka(c.tip, c.slug)}`,
      lastModified: new Date(c.datumAzuriranja || c.datumObjave || Date.now()),
      changeFrequency: (c.tip === "VODIC" ? "monthly" : "weekly") as
        | "monthly"
        | "weekly",
      priority: 0.7,
    }),
  );

  // teme rasprava se indeksiraju kao i ostatak sekcije
  const teme = (await sveStranice((page) => getTemeServer({ limit: API_LIMIT, page }))).map(
    (t) => ({
      url: `${SITE_URL}/rasprave/${t.slug}`,
      lastModified: new Date(t.zadnjaAktivnost),
      changeFrequency: "daily" as const,
      priority: 0.5,
    }),
  );

  return [...staticRoutes, ...rubrikaRoutes, ...clanci, ...teme];
}
