"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import styles from "./auth.module.css";
import { me, register, resendVerification, unwrap } from "src/api/auth";
import { getBackendUrl } from "src/utils/backendUrl";
import { getUtmForRegister, clearUtm } from "src/utils/utm";

function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = safeNext(searchParams.get("next"));
  // Registracija pokrenuta sa trial CTA (next vodi na /pretplate?trial=auto) ->
  // backend će trial auto-aktivirati pri verifikaciji maila.
  const wantsTrial = nextUrl.includes("trial=auto");

  // Ako je korisnik već ulogovan (npr. nakon verifikacije maila pa povratak
  // na /registracija), preusmjeri ga na ?next= ili početnu.
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const resendMutation = useMutation({
    mutationFn: (e: string) => unwrap(resendVerification(e)),
  });

  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof register>[0]) =>
      unwrap(register(payload)),
    onSuccess: (data) => {
      setSentTo(data.email);
      clearUtm();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (password.length < 6) {
      setValidationError("Lozinka mora imati najmanje 6 znakova.");
      return;
    }
    if (password !== confirm) {
      setValidationError("Lozinke se ne podudaraju.");
      return;
    }

    // Sačuvaj next u localStorage da ga VerifyEmail iskoristi kao redirect
    // nakon klika na link iz email-a (mail link otvara novi tab koji ne nosi
    // ?next= parametar).
    if (nextUrl && nextUrl !== "/" && typeof window !== "undefined") {
      try {
        window.localStorage.setItem("postRegisterNext", nextUrl);
      } catch {}
    }

    mutation.mutate({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      wantsTrial,
      ...getUtmForRegister(),
    });
  };

  const handleGoogle = () => {
    const backendUrl = getBackendUrl();
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const serverError = mutation.error
    ? mutation.error.message === "DUPLICATE_VALUE"
      ? "Email je već registrovan."
      : mutation.error.message === "NETWORK_ERROR"
        ? "Server nije dostupan. Pokušajte ponovo."
        : mutation.error.message || "Došlo je do greške."
    : null;

  const errorMsg = validationError ?? serverError;

  // Skoči blank dok provjeravamo session, ili kad je već ulogovan pa ide redirect.
  if (meQuery.isLoading || meQuery.data) {
    return <div className={styles.page} />;
  }

  if (sentTo) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.label}>Registracija</div>
          <h1 className={styles.h1}>Provjerite <em>email</em></h1>
          <p className={styles.lead}>
            Poslali smo link za potvrdu na <strong>{sentTo}</strong>.
            Kliknite na link u emailu da aktivirate račun.
          </p>
        </div>
        <div className={styles.infoBox}>
          <p>Nije stigao email? Provjerite spam folder ili:</p>
          <button
            className={styles.submit}
            disabled={resendMutation.isPending || resendMutation.isSuccess}
            onClick={() => resendMutation.mutate(sentTo)}
          >
            {resendMutation.isSuccess
              ? "Email je ponovo poslan"
              : resendMutation.isPending
                ? "Slanje..."
                : "Pošalji ponovo"}
          </button>
        </div>
        <div className={styles.footer}>
          <Link href="/prijava">Nazad na prijavu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Registracija</div>
        <h1 className={styles.h1}>
          Kreirajte <em>račun</em>
        </h1>
        <p className={styles.lead}>Besplatno je i traje manje od minute.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="firstName">
              Ime
            </label>
            <input
              id="firstName"
              className={styles.input}
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="lastName">
              Prezime
            </label>
            <input
              id="lastName"
              className={styles.input}
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
        </div>

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

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="password">
              Lozinka
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                className={styles.input}
                type={showPasswords ? "text" : "password"}
                placeholder="Min. 6 znakova"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                style={{ width: "100%", paddingRight: "2.5rem" }}
              />
              <PasswordToggle
                shown={showPasswords}
                onToggle={() => setShowPasswords((v) => !v)}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="confirm">
              Potvrda lozinke
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="confirm"
                className={styles.input}
                type={showPasswords ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                style={{ width: "100%", paddingRight: "2.5rem" }}
              />
              <PasswordToggle
                shown={showPasswords}
                onToggle={() => setShowPasswords((v) => !v)}
              />
            </div>
          </div>
        </div>

        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

        <button
          type="submit"
          className={styles.submit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Registrovanje..." : "Registruj se"}
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
          Nastavi sa Google
        </button>
      </form>

      <div className={styles.footer}>
        Već imate račun? <Link href="/prijava">Prijavite se</Link>
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
