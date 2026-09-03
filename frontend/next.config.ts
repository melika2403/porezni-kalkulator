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

      // /app/* na marketing domeni vodi na app subdomenu. Ovo je prije radio
      // proxy.ts, ali on se sada izvrsava samo na app subdomeni pa bi ta
      // grana bila mrtav kod i /app/* bi se servirao i sa marketing domene.
      // Ovdje je i jeftinije: CDN pravilo, bez CPU-a.
      //
      // ":path*" trazi granicu segmenta i time popravlja bug iz proxy.ts,
      // gdje je startsWith("/app") hvatao i /apple-app-site-association, pa
      // ga replace(/^\/app/, "") sjekao u "le-app-site-association".
      //
      // `has` host ne poklapa localhost, pa dev ostaje nedirnut. Time se
      // prirodno replicira stari NODE_ENV === "production" uslov.
      // 307 (permanent: false), kao i stari NextResponse.redirect: raspored
      // subdomena nije trajna odluka, a 308 bi se kesirao u browserima.
      {
        source: "/app",
        has: [{ type: "host", value: "(www\\.)?poreznikalkulator\\.ba" }],
        destination: "https://app.poreznikalkulator.ba/",
        permanent: false,
      },
      {
        source: "/app/:path*",
        has: [{ type: "host", value: "(www\\.)?poreznikalkulator\\.ba" }],
        destination: "https://app.poreznikalkulator.ba/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
