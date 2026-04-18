import type { Metadata } from "next";
import GpdUpute from "../../../sections/gpd/GpdUpute";

export const metadata: Metadata = {
  title: "Kako popuniti GPD-1051 obrazac — Upute | Porezni Kalkulator BiH",
  description:
    "Detaljan vodič za pravilno popunjavanje godišnje prijave poreza na dohodak — obrazac GPD-1051 u FBiH.",
};

export default function GpdUputePage() {
  return <GpdUpute />;
}
