import type { MetadataRoute } from "next";

const SITE_URL = "https://poreznikalkulator.ba";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/profil",
          "/organizacija/",
          "/aktivni-radnici",
          "/pretplate",
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
