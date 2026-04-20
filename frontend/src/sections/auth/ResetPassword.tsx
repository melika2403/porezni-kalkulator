"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import styles from "./auth.module.css";
import { resetPassword, unwrap } from "src/api/auth";

export default function ResetPassword() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      unwrap(resetPassword(token, newPassword)),
    onSuccess: () => {
      setTimeout(() => router.push("/prijava"), 2500);
    },
  });

  if (!token) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.label}>Reset lozinke</div>
          <h1 className={styles.h1}>
            Nevažeći <em>link</em>
          </h1>
          <p className={styles.lead}>
            Link za reset lozinke je nevažeći ili je istekao.
          </p>
        </div>
        <div className={styles.footer}>
          <Link href="/zaboravljena-lozinka">Zatraži novi link</Link>
        </div>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.label}>Reset lozinke</div>
          <h1 className={styles.h1}>
            Lozinka <em>promijenjena</em>
          </h1>
          <p className={styles.lead}>
            Vaša lozinka je uspješno promijenjena. Preusmjeravamo vas na prijavu...
          </p>
        </div>
        <div className={styles.footer}>
          <Link href="/prijava">Prijavi se</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (newPassword.length < 6) {
      setValidationError("Lozinka mora imati najmanje 6 znakova.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationError("Lozinke se ne podudaraju.");
      return;
    }

    mutation.mutate({ token, newPassword });
  };

  const errorMsg = validationError
    ?? (mutation.error
      ? mutation.error.message === "INVALID_OR_EXPIRED_TOKEN"
        ? "Link za reset je nevažeći ili je istekao. Zatražite novi."
        : mutation.error.message === "NETWORK_ERROR"
        ? "Server nije dostupan. Pokušajte ponovo."
        : "Došlo je do greške. Pokušajte ponovo."
      : null);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.label}>Reset lozinke</div>
        <h1 className={styles.h1}>
          Nova <em>lozinka</em>
        </h1>
        <p className={styles.lead}>Unesite novu lozinku za vaš nalog.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="newPassword">Nova lozinka</label>
          <input
            id="newPassword"
            className={styles.input}
            type="password"
            placeholder="••••••••"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="confirmPassword">Potvrdi lozinku</label>
          <input
            id="confirmPassword"
            className={styles.input}
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

        <button
          type="submit"
          className={styles.submit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Spremanje..." : "Promijeni lozinku"}
        </button>
      </form>

      <div className={styles.footer}>
        <Link href="/prijava">Nazad na prijavu</Link>
      </div>
    </div>
  );
}
