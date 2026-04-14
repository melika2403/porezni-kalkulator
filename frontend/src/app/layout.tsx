import type { Metadata } from "next";
import Navbar from "src/components/Navbar/Navbar";
import Footer from "src/components/Footer/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Porezni Kalkulator — BiH",
  description:
    "SPR-1053, GPD-1051, obračun plata, PDV, stalna sredstva i ugovori za poduzetnike u BiH.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bs">
      <body>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
