import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LAN IP za testiranje s mobitela (HMR websocket i dev assets).
  // Bez ovoga Next.js blokira cross-origin requeste na dev endpoint-e.
  allowedDevOrigins: ["192.168.178.130"],

  // Jedan kanonski oblik URL-a — bez trailing slash (/ams, ne /ams/).
  // Next po defaultu 308-redirecta /ams/ → /ams; postavljamo eksplicitno.
  trailingSlash: false,

  // www → non-www (308). Sprječava cijepanje SEO signala između
  // www.poreznikalkulator.ba i poreznikalkulator.ba (GSC pokazuje obje verzije).
  // NAPOMENA: http → https preusmjeravanje je na nivou hostinga (Vercel/server),
  // ne Next-a — provjeri da je na hostingu forsiran HTTPS.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.poreznikalkulator.ba" }],
        destination: "https://poreznikalkulator.ba/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
