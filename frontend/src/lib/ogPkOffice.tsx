// Zajednička og:image kartica PK Office proizvoda (/pk-office, /solo): ista
// paleta (tamnozelena pozadina, terakota badge, cream tekst, sage čipovi),
// razlikuje se samo tekst. Route fajlovi (app/*/opengraph-image.tsx) zovu
// pkOfficeOgImage sa svojih pet stringova i izvoze size/contentType/alt.
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

export function pkOfficeOgImage({
  badge,
  naslov,
  podnaslov,
  chips,
  potpis,
}: {
  badge: string;
  naslov: string;
  podnaslov: string;
  chips: string[];
  potpis: string;
}) {
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
          {badge}
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
          {naslov}
        </div>
        <div
          style={{
            display: "flex",
            color: "#c9c4b4",
            fontSize: 32,
            marginTop: 18,
          }}
        >
          {podnaslov}
        </div>
        <div
          style={{
            display: "flex",
            gap: 14,
            marginTop: 44,
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: 1000,
          }}
        >
          {chips.map((c) => (
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
          {potpis}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
