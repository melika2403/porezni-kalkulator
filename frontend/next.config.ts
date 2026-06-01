import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LAN IP za testiranje s mobitela (HMR websocket i dev assets).
  // Bez ovoga Next.js blokira cross-origin requeste na dev endpoint-e.
  allowedDevOrigins: ["192.168.178.130"],
};

export default nextConfig;
