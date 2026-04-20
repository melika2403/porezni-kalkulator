"use client";
import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import styles from "./auth.module.css";
import { forgotPassword } from "src/api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(email.trim());
  };

  if (mutation.isSuccess) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.label}>Reset lozinke</div>
          <h1 className={styles.h1}>
            Provjerite <em>email</em>
          </h1>
          <p className={styles.lead}>
            Ako nalog sa ovim emailom postoji, poslali smo link za reset lozinke.
            Link važi <strong>1 sat</strong>.
          </p>
        </div>
        <div className={styles.footer}>
          <Link href="/prijava">Nazad na prijavu</Link>
        </div>
      </div>
    );
  }

  const errorMsg = mutation.error
    ? mutation.error.message === "NETWORK_ERROR"
      ? "Server nije dostupan. Pokušajte ponovo."
      : "Došlo je do greške. Pokušajte ponovo."
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Reset lozinke</div>
        <h1 className={styles.h1}>
          Zaboravili ste <em>lozinku?</em>
        </h1>
        <p className={styles.lead}>
          Unesite vaš email i poslat ćemo vam link za reset lozinke.
        </p>
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

        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

        <button
          type="submit"
          className={styles.submit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Slanje..." : "Pošalji link"}
        </button>
      </form>

      <div className={styles.footer}>
        <Link href="/prijava">Nazad na prijavu</Link>
      </div>
    </div>
  );
}
