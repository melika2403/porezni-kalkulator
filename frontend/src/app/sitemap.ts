import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "src/sections/blog/posts";

const SITE_URL = "https://poreznikalkulator.ba";

// Public, indexable pages. Auth-only pages (profil, fakture, organizacija…)
// and legal/account flows are excluded — they're noindex or per-user.
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/sihterica", priority: 0.9, changeFrequency: "weekly" },
  { path: "/spr", priority: 0.9, changeFrequency: "monthly" },
  { path: "/gpd", priority: 0.9, changeFrequency: "monthly" },
  { path: "/zo3", priority: 0.9, changeFrequency: "monthly" },
  { path: "/ams", priority: 0.9, changeFrequency: "monthly" },
  { path: "/amortizacija", priority: 0.8, changeFrequency: "monthly" },
  { path: "/preracun-neto-bruto", priority: 0.9, changeFrequency: "monthly" },
  { path: "/pdv-kalkulator", priority: 0.9, changeFrequency: "monthly" },
  { path: "/ugovor-o-pozajmici", priority: 0.8, changeFrequency: "monthly" },
  { path: "/ugovor-o-djelu", priority: 0.8, changeFrequency: "monthly" },
  { path: "/ugovor-o-radu", priority: 0.8, changeFrequency: "monthly" },
  { path: "/clanske-kartice", priority: 0.7, changeFrequency: "monthly" },
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
  const lastModified = new Date();
  const staticRoutes = ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
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
