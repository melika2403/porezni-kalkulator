// Generisani og:image za /pk-office (Next ImageResponse, statički na buildu).
// File-based metadata ima prioritet pa stranica ne navodi images u openGraph.
// Paleta PK Office: tamnozelena pozadina, terakota badge, cream tekst.
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "PK Office, kompletno knjigovodstvo obrta na jednom mjestu";

const CHIPS = [
  "Bankovni izvodi",
  "KPR",
  "PDV",
  "Plate i MIP",
  "Fakture",
  "Roba i lager",
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #16211a 0%, #1e2b21 55%, #24352a 100%)",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "#c8622a",
            color: "#ffffff",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            borderRadius: 100,
            padding: "10px 34px",
            marginBottom: 34,
          }}
        >
          PK Office
        </div>
        <div
          style={{
            display: "flex",
            color: "#ffffff",
            fontSize: 68,
            textAlign: "center",
            maxWidth: 980,
            lineHeight: 1.15,
          }}
        >
          Kompletno knjigovodstvo obrta
        </div>
        <div
          style={{
            display: "flex",
            color: "#c9c4b4",
            fontSize: 32,
            marginTop: 18,
          }}
        >
          Sve knjige, obrasci i plate na jednom mjestu
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 44, flexWrap: "wrap", justifyContent: "center", maxWidth: 1000 }}>
          {CHIPS.map((c) => (
            <div
              key={c}
              style={{
                display: "flex",
                border: "2px solid #3a5c42",
                background: "rgba(58, 92, 66, 0.35)",
                color: "#e8e4d8",
                fontSize: 26,
                borderRadius: 100,
                padding: "10px 26px",
              }}
            >
              {c}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            color: "#7a8a7d",
            fontSize: 28,
            marginTop: 52,
          }}
        >
          poreznikalkulator.ba
        </div>
      </div>
    ),
    size,
  );
}
