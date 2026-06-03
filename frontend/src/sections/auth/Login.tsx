"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import styles from "./auth.module.css";
import { login, me, resendVerification, unwrap } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";

// Whitelist: dozvoli redirect samo na interne (relative) putanje, ne na vanjske
// URL-ove (sigurnosna mjera protiv open-redirect napada).
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = safeNext(searchParams.get("next"));
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Ako je već ulogovan, preusmjeri na ?next= ili početnu.
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(me()).catch(() => null),
    retry: false,
  });

  useEffect(() => {
    if (!meQuery.isLoading && meQuery.data) {
      router.replace(nextUrl);
    }
  }, [meQuery.isLoading, meQuery.data, nextUrl, router]);

  const mutation = useMutation({
    mutationFn: ({ email, password, rememberMe }: { email: string; password: string; rememberMe: boolean }) =>
      unwrap(login(email, password, rememberMe)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      router.push(nextUrl);
      router.refresh();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email: email.trim(), password, rememberMe });
  };

  const handleGoogle = () => {
    const backendUrl = getBackendUrl();
    // sačuvaj next u sessionStorage (Google OAuth callback gubi query param)
    if (typeof window !== "undefined" && nextUrl !== "/") {
      try {
        sessionStorage.setItem("postLoginNext", nextUrl);
      } catch {}
    }
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const isUnverified = mutation.error?.message === "EMAIL_NOT_VERIFIED";

  const resendMutation = useMutation({
    mutationFn: () => unwrap(resendVerification(email.trim())),
  });

  const errorMsg = mutation.error
    ? mutation.error.message === "INVALID_CREDENTIALS"
      ? "Pogrešan email ili lozinka."
      : mutation.error.message === "EMAIL_NOT_VERIFIED"
      ? null
      : mutation.error.message === "NETWORK_ERROR"
      ? "Server nije dostupan. Pokušajte ponovo."
      : "Došlo je do greške. Pokušajte ponovo."
    : null;

  // Skoči blank dok provjeravamo session, ili kad je već ulogovan pa ide redirect.
  if (meQuery.isLoading || meQuery.data) {
    return <div className={styles.page} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Prijava</div>
        <h1 className={styles.h1}>
          Dobro došli <em>nazad</em>
        </h1>
        <p className={styles.lead}>Prijavite se na svoj račun da nastavite.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="email">Email</label>
          <input
            id="email"
            className={styles.input}
            type="email"
            placeholder="vas@email.ba"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className={styles.field}>
          <div className={styles.passwordLabelRow}>
            <label className={styles.fieldLabel} htmlFor="password">Lozinka</label>
            <Link href="/zaboravljena-lozinka" className={styles.forgotLink}>
              Zaboravili ste lozinku?
            </Link>
          </div>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              className={styles.input}
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ width: "100%", paddingRight: "2.5rem" }}
            />
            <PasswordToggle
              shown={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />
          </div>
        </div>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span className={styles.checkboxLabel}>Zapamti me</span>
        </label>

        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

        {isUnverified && (
          <div className={styles.infoBox}>
            <p>Email adresa nije potvrđena. Provjerite inbox ili spam folder.</p>
            <button
              type="button"
              className={styles.submit}
              disabled={resendMutation.isPending || resendMutation.isSuccess}
              onClick={() => resendMutation.mutate()}
            >
              {resendMutation.isSuccess
                ? "Email je poslan"
                : resendMutation.isPending
                  ? "Slanje..."
                  : "Pošalji ponovo"}
            </button>
          </div>
        )}

        <button type="submit" className={styles.submit} disabled={mutation.isPending}>
          {mutation.isPending ? "Prijavljivanje..." : "Prijavi se"}
        </button>

        <div className={styles.divider}>ili</div>

        <button type="button" className={styles.googleBtn} onClick={handleGoogle}>
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Prijavi se sa Google
        </button>
      </form>

      <div className={styles.footer}>
        Nemate račun? <Link href="/registracija">Registrujte se</Link>
      </div>
    </div>
  );
}

function PasswordToggle({
  shown,
  onToggle,
}: {
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Sakrij lozinku" : "Prikaži lozinku"}
      tabIndex={-1}
      style={{
        position: "absolute",
        right: 8,
        top: "50%",
        transform: "translateY(-50%)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 6,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--mid)",
        lineHeight: 0,
      }}
    >
      {shown ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
