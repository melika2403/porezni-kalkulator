import type { Metadata } from "next";
import Pretplate from "src/sections/pretplate/Pretplate";

export const metadata: Metadata = {
  title: "Pretplata — Pro i Business | Porezni Kalkulator BiH",
  description:
    "Izaberite Pro ili Business pretplatu na poreznikalkulator.ba — dobit ćete predračun na e-mail i odmah u PDF-u.",
  alternates: { canonical: "https://poreznikalkulator.ba/pretplate" },
};

export default function PretplatePage() {
  return <Pretplate />;
}
