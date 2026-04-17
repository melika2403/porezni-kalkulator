"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./auth.module.css";
import { login } from "src/api/auth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);

    if (!res.ok) {
      if (res.error === "INVALID_CREDENTIALS") {
        setError("Pogrešan email ili lozinka.");
      } else if (res.error === "NETWORK_ERROR") {
        setError("Server nije dostupan. Pokušajte ponovo.");
      } else {
        setError("Došlo je do greške. Pokušajte ponovo.");
      }
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleGoogle = () => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Prijava</div>
        <h1 className={styles.h1}>
          Dobro došli <em>nazad</em>
        </h1>
        <p className={styles.lead}>
          Prijavite se na svoj račun da nastavite.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="email">
            Email
          </label>
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
          <label className={styles.fieldLabel} htmlFor="password">
            Lozinka
          </label>
          <input
            id="password"
            className={styles.input}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? "Prijavljivanje..." : "Prijavi se"}
        </button>

        <div className={styles.divider}>ili</div>

        <button
          type="button"
          className={styles.googleBtn}
          onClick={handleGoogle}
        >
          <svg viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
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
