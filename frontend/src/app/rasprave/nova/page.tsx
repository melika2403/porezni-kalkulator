import type { Metadata } from "next";
import VijestiHeader from "src/sections/vijesti/VijestiHeader";
import NovaTemaForma from "./NovaTemaForma";
import styles from "src/sections/vijesti/vijesti.module.css";

export const metadata: Metadata = {
  title: "Nova tema",
  description: "Otvorite pitanje ili raspravu za knjigovođe i obrtnike u FBiH.",
  robots: { index: false, follow: true },
};

export default function NovaTemaPage() {
  return (
    <div className={styles.page}>
      <VijestiHeader sekcija="Rasprave" />
      <div className={styles.vodiciUvod} style={{ marginBottom: "1.5rem" }}>
        <h1 className={styles.vodiciNaslov}>Nova tema</h1>
        <p className={styles.vodiciTekst}>
          Postavite pitanje ili otvorite raspravu. Konkretan naslov i opis
          situacije donose najbrže i najkorisnije odgovore.
        </p>
      </div>
      <NovaTemaForma />
    </div>
  );
}
