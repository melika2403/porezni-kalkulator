"use client";

import { useSearchParams } from "next/navigation";
import Js3100Form from "./Js3100";
import ObracunPlata from "./ObracunPlata";
import RadniciTabBar from "src/components/RadniciTabBar/RadniciTabBar";

export default function PrijaveRadnikaTabs() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "obracun" ? "obracun" : "js3100";

  return (
    <>
      <RadniciTabBar />
      {tab === "js3100" ? <Js3100Form /> : <ObracunPlata />}
    </>
  );
}
