import type { MetadataRoute } from "next";

const SITE_URL = "https://www.poreznikalkulator.ba";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/app/", // PK Office (privatna aplikacija za obrte)
          "/profil",
          "/organizacija/",
          "/organizacije",
          "/aktivni-radnici",
          "/prijava",
          "/registracija",
          "/zaboravljena-lozinka",
          "/reset-lozinke",
          "/verifikacija",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
