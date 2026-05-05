import type { Metadata } from "next";
import Js3100Form from "src/sections/prijave-radnika/Js3100";

export const metadata: Metadata = {
  title: "JS3100 — Prijava / Odjava radnika online | Porezni Kalkulator BiH",
  description:
    "Popunite obrazac JS3100 online — prijava, odjava ili promjena podataka radnika u Jedinstveni sistem registracije, kontrole i naplate doprinosa (FBiH). Besplatno.",
  alternates: { canonical: "https://poreznikalkulator.ba/js3100" },
};

export default function Js3100Page() {
  return <Js3100Form />;
}
