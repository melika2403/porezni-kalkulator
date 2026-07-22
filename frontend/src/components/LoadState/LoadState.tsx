// Dijeljena marketing komponenta za loading/empty/error stanja, zamjena za
// goli tekst "Učitavam…" / "Greška: ...". Dvije forme:
//  - panel (default): centrirana kartica sa spinnerom/ikonom i tekstom
//  - compact: inline red (mali spinner + tekst) za sidebare i uske prostore
import styles from "./LoadState.module.css";

type Kind = "loading" | "empty" | "error";

function EmptyIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 8v13H3V8" />
      <path d="M1 3h22v5H1z" />
      <path d="M10 12h4" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

export default function LoadState({
  kind = "loading",
  text,
  compact = false,
}: {
  kind?: Kind;
  text?: string;
  compact?: boolean;
}) {
  const defaultText =
    kind === "loading"
      ? "Učitavam..."
      : kind === "empty"
        ? "Nema podataka za prikaz."
        : "Došlo je do greške. Pokušajte ponovo.";
  const label = text ?? defaultText;

  if (compact) {
    return (
      <div
        className={`${styles.compact}${kind === "error" ? ` ${styles.errorText}` : ""}`}
        role={kind === "error" ? "alert" : undefined}
      >
        {kind === "loading" ? (
          <span className={styles.spinnerSm} aria-hidden />
        ) : kind === "error" ? (
          <ErrorIcon />
        ) : (
          <EmptyIcon />
        )}
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div
      className={styles.panel}
      role={kind === "error" ? "alert" : undefined}
    >
      {kind === "loading" ? (
        <span className={styles.spinner} aria-hidden />
      ) : (
        <span
          className={`${styles.iconTile}${kind === "error" ? ` ${styles.iconTileError}` : ""}`}
        >
          {kind === "error" ? <ErrorIcon /> : <EmptyIcon />}
        </span>
      )}
      <p className={styles.text}>{label}</p>
    </div>
  );
}
