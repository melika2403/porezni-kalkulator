"use client";

// Admin harness za štampu naloga na matričnom: kalibracija i probe na
// proizvoljnoj firmi. Korisnici istu funkciju imaju na obračunu plata
// (komponente su dijeljene: src/components/StampaNaloga/).
// Spec: docs/faza1-escp-stampa-naloga.md, docs/faza2-stampa-naloga-na-obracunu.md

import { useState } from "react";
import RoleGuard from "@/src/components/RoleGuard/RoleGuard";
import PodesavanjePisaca, {
  AkoZapne,
  UputstvoStanica,
  ZastoCmd,
} from "src/components/StampaNaloga/PodesavanjePisaca";
import {
  loadPostavke,
  savePostavke,
  type EscpPostavke,
} from "src/lib/nalozi/postavke";
import NaloziStampa from "./NaloziStampa";

export default function AdminTestNalog() {
  // Stranica je iza RoleGuard-a (renderuje se tek klijentski poslije provjere
  // uloge), pa je localStorage siguran direktno u inicijalizatoru.
  const [postavke, setPostavke] = useState<EscpPostavke>(() => loadPostavke());
  const [uputstvo, setUputstvo] = useState(false);

  const mijenjaj = (p: EscpPostavke) => {
    setPostavke(p);
    savePostavke(p);
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--white, #fff)",
    border: "1px solid var(--border, #d4cfc4)",
    borderRadius: 12,
    padding: "1.1rem 1.25rem",
    maxWidth: 980,
  };
  const naslovSekcije: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--mid, #7a8a7d)",
    marginBottom: "0.8rem",
  };

  return (
    <RoleGuard roles={["ADMIN"]} label="Nemate pristup" mode="hide">
      <div style={{ padding: "1.5rem 1.75rem" }}>
        <h1
          style={{
            fontFamily: "DM Serif Display, serif",
            fontSize: "1.7rem",
            margin: "0 0 0.3rem",
            color: "var(--ink, #0f1a12)",
          }}
        >
          Štampa naloga (matrični)
        </h1>
        <p
          style={{
            color: "var(--mid, #7a8a7d)",
            margin: "0 0 1.25rem",
            fontSize: "0.95rem",
            maxWidth: 980,
          }}
        >
          Kalibracija i probe. Korisnici istu štampu imaju na obračunu plata
          (dugme &quot;Štampa naloga&quot; u redu Banka), sa istim podešavanjem
          i uputstvom. Postavke se pamte po računaru, pa ono što se ovdje
          namjesti vrijedi i za korisnički modal na ovoj mašini.
        </p>

        <div style={cardStyle}>
          <div style={naslovSekcije}>Podešavanje pisača i test štampa</div>
          <PodesavanjePisaca postavke={postavke} onChange={mijenjaj} />
        </div>

        <div style={{ ...cardStyle, marginTop: "1.25rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ ...naslovSekcije, marginBottom: 0 }}>
              Podešavanje radne stanice (isti tekst koji vide korisnici)
            </div>
            <button
              type="button"
              onClick={() => setUputstvo((v) => !v)}
              style={{
                padding: "0.4rem 0.9rem",
                background: "var(--white, #fff)",
                color: "var(--sage, #3a5c42)",
                border: "1px solid var(--sage, #3a5c42)",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {uputstvo ? "Sakrij uputstvo" : "Prikaži uputstvo"}
            </button>
          </div>
          {uputstvo && (
            <div style={{ marginTop: "0.9rem" }}>
              <UputstvoStanica />
              <div style={{ marginTop: "1.2rem" }}>
                <div style={naslovSekcije}>
                  Zašto se ovo radi kroz Command Prompt
                </div>
                <ZastoCmd />
              </div>
              <div style={{ marginTop: "1.2rem" }}>
                <div style={naslovSekcije}>Ako zapne</div>
                <AkoZapne />
              </div>
            </div>
          )}
        </div>

        <div style={{ ...cardStyle, marginTop: "1.25rem" }}>
          <NaloziStampa postavke={postavke} />
        </div>
      </div>
    </RoleGuard>
  );
}
