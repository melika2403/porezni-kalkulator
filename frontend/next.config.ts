import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LAN IP za testiranje s mobitela (HMR websocket i dev assets).
  // Bez ovoga Next.js blokira cross-origin requeste na dev endpoint-e.
  allowedDevOrigins: ["192.168.178.130"],

  // Jedan kanonski oblik URL-a — bez trailing slash (/ams, ne /ams/).
  // Next po defaultu 308-redirecta /ams/ → /ams; postavljamo eksplicitno.
  trailingSlash: false,

  // NAPOMENA: www ↔ non-www kanonikalizaciju radi HOSTING (cPanel/.htaccess
  // ili Cloudflare). Ranije je ovdje stajao Next www→non-www redirect koji je
  // bio u suprotnom smjeru od hostinga → beskonačna petlja (ERR_TOO_MANY_REDIRECTS).
  // Drži kanonikalizaciju na JEDNOM sloju (hostingu), ne i u Next-u.

  // Blog je postao sekcija Vijesti, a stari tekstovi su vodiči. Trajna (301)
  // preusmjerenja čuvaju pozicije u pretrazi i tuđe linkove. Pojedinačni
  // tekstovi idu na /vodici/:slug jer su svi postojeći tekstovi vodiči; nove
  // vijesti nikad nisu ni bile na /blog.
  async redirects() {
    return [
      { source: "/blog", destination: "/vijesti", permanent: true },
      { source: "/blog/:slug", destination: "/vodici/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
