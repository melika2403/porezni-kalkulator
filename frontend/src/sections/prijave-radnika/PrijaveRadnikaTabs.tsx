"use client";

import { useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Js3100Form from "./Js3100";
import ObracunPlata from "./ObracunPlata";
import styles from "./prijaveRadnikaTabs.module.css";

type Tab = "js3100" | "obracun";

export default function PrijaveRadnikaTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return t === "obracun" ? "obracun" : "js3100";
  });

  const switchTab = (next: Tab) => {
    setTab(next);
    const sp = new URLSearchParams(searchParams.toString());
    if (next === "js3100") {
      sp.delete("tab");
    } else {
      sp.set("tab", next);
    }
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <>
      {/* Wrapper se lijepi na vrh ispod fiksiranog navbara (64px) — pun width
          sa pozadinom da prikriva sadržaj iza dok korisnik skrola. */}
      <div
        style={{
          position: "sticky",
          top: 64,
          marginTop: 64,
          zIndex: 30,
          background: "var(--paper, #faf8f3)",
          borderBottom: "1px solid #d4cfc4",
        }}
      >
        <nav
          role="tablist"
          aria-label="Prijave radnika"
          style={{
            maxWidth: 860,
            margin: "0 auto",
            padding: "0 2rem",
            display: "flex",
            gap: "0.5rem",
          }}
        >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "js3100"}
          onClick={() => switchTab("js3100")}
          style={{
            background: "transparent",
            border: 0,
            padding: "0.7rem 1.1rem",
            fontSize: "0.92rem",
            fontWeight: tab === "js3100" ? 600 : 500,
            color: tab === "js3100" ? "#111" : "#666",
            cursor: "pointer",
            borderBottom: `2px solid ${tab === "js3100" ? "#3a5c42" : "transparent"}`,
            marginBottom: -1,
            fontFamily: "inherit",
          }}
        >
          JS3100 prijava / odjava
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "obracun"}
          onClick={() => switchTab("obracun")}
          style={{
            background: "transparent",
            border: 0,
            padding: "0.7rem 1.1rem",
            fontSize: "0.92rem",
            fontWeight: tab === "obracun" ? 600 : 500,
            color: tab === "obracun" ? "#111" : "#666",
            cursor: "pointer",
            borderBottom: `2px solid ${tab === "obracun" ? "#3a5c42" : "transparent"}`,
            marginBottom: -1,
            fontFamily: "inherit",
          }}
        >
          Obračun plata
        </button>
        </nav>
      </div>

      {tab === "js3100" ? <Js3100Form /> : <ObracunPlata />}
    </>
  );
}
