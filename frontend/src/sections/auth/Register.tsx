"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import styles from "./auth.module.css";
import { register, resendVerification, unwrap } from "src/api/auth";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
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

    mutation.mutate({
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      address: address.trim() || undefined,
    });
  };

  const handleGoogle = () => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
    window.location.href = `${backendUrl}/api/auth/google`;
  };

  const serverError = mutation.error
    ? mutation.error.message === "DUPLICATE_VALUE"
      ? "Email ili telefon su već registrovani."
      : mutation.error.message === "NETWORK_ERROR"
        ? "Server nije dostupan. Pokušajte ponovo."
        : mutation.error.message || "Došlo je do greške."
    : null;

  const errorMsg = validationError ?? serverError;

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

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="phone">
            Telefon
          </label>
          <input
            id="phone"
            className={styles.input}
            type="tel"
            placeholder="+387 ..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            maxLength={11}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="address">
            Adresa (opcionalno)
          </label>
          <input
            id="address"
            className={styles.input}
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="street-address"
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="password">
              Lozinka
            </label>
            <input
              id="password"
              className={styles.input}
              type="password"
              placeholder="Min. 6 znakova"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="confirm">
              Potvrda lozinke
            </label>
            <input
              id="confirm"
              className={styles.input}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
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
