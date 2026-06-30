import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "src/sections/blog/posts";
import { reviewedFor } from "src/data/contentMeta";

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
  { path: "/pretplate", priority: 0.6, changeFrequency: "monthly" },
  { path: "/fakture", priority: 0.8, changeFrequency: "monthly" },
  { path: "/fakture/nova", priority: 0.8, changeFrequency: "monthly" },
  { path: "/prijave-radnika", priority: 0.7, changeFrequency: "monthly" },
  { path: "/sifre-djelatnosti", priority: 0.9, changeFrequency: "yearly" },
  { path: "/javni-prihodi", priority: 0.9, changeFrequency: "yearly" },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
  { path: "/o-nama", priority: 0.5, changeFrequency: "yearly" },
  { path: "/kontakt", priority: 0.5, changeFrequency: "yearly" },
  { path: "/uvjeti", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privatnost", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  // lastModified = stvaran "reviewed" datum po ruti (CONTENT_META), ne build-time
  // "danas" — pošten freshness signal.
  const staticRoutes = ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(reviewedFor(path)),
    changeFrequency,
    priority,
  }));
  const blogRoutes = BLOG_POSTS.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
  return [...staticRoutes, ...blogRoutes];
}
