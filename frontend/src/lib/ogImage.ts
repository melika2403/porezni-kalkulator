// Zajednička og:image definicija za sve stranice koje definišu vlastiti
// openGraph objekat. Next NE radi deep-merge sa root layoutom: čim stranica
// ima openGraph, root images se gube, pa svaka mora eksplicitno navesti sliku
// (relativni URL se rješava kroz metadataBase iz root layouta).
export const OG_IMAGE = [
  {
    url: "/og-image.png",
    width: 1200,
    height: 630,
    alt: "Porezni Kalkulator BiH",
  },
];
