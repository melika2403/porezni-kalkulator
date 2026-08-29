import { getBackendUrl } from "src/utils/backendUrl";
import type { ApiResponse } from "src/api/auth";

const BACKEND_URL = getBackendUrl();

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
    if (!json) return { ok: false, error: `HTTP ${res.status}` };
    return json;
  } catch {
    return { ok: false, error: "NETWORK_ERROR" };
  }
}

export type TwoFactorMethod = "EMAIL" | "TOTP";

export type TwoFactorStatus = {
  enabled: boolean;
  method: TwoFactorMethod | null;
  enabledAt: string | null;
  preostaloRezervnihKodova: number;
  povjerenihUredjaja: number;
};

export function twoFactorStatus() {
  return request<TwoFactorStatus>("/api/2fa/status");
}

/**
 * Korak 1 i 2 wizarda. Lozinka je obavezna za korisnike koji je imaju.
 * Za EMAIL šalje kod, za TOTP vraća QR i tajnu za ručni unos.
 */
export type SetupStartData = {
  method: TwoFactorMethod;
  /** PNG kao data URL; samo za TOTP. */
  qrDataUrl?: string;
  otpauthUrl?: string;
  /** Tajna u grupama od četiri znaka, za prepisivanje rukom. */
  secret?: string;
};

export function setupStart(method: TwoFactorMethod, password?: string) {
  return request<SetupStartData>("/api/2fa/setup/start", {
    method: "POST",
    body: JSON.stringify({ method, password }),
  });
}

/** Korak 3 i 4. Rezervni kodovi stižu SAMO ovdje i samo jednom. */
export function setupConfirm(code: string) {
  return request<{ method: TwoFactorMethod; backupCodes: string[] }>(
    "/api/2fa/setup/confirm",
    { method: "POST", body: JSON.stringify({ code }) },
  );
}

export function resendSetupCode() {
  return request<null>("/api/2fa/setup/resend", { method: "POST" });
}

/** Kod za aktivnu metodu (potreban npr. pri isključivanju 2FA). */
export function sendCurrentMethodCode() {
  return request<null>("/api/2fa/send-code", { method: "POST" });
}

export function regenerateBackupCodes(password?: string) {
  return request<{ backupCodes: string[] }>("/api/2fa/backup-codes", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function clearTrustedDevices() {
  return request<null>("/api/2fa/trusted-devices/clear", { method: "POST" });
}

export function disableTwoFactor(code: string, password?: string) {
  return request<null>("/api/2fa/disable", {
    method: "POST",
    body: JSON.stringify({ password, code }),
  });
}

/** Poruke grešaka sa backenda, na jednom mjestu. */
export function twoFactorErrorText(error: string): string {
  switch (error) {
    case "POGRESNA_LOZINKA":
      return "Lozinka nije ispravna.";
    case "LOZINKA_OBAVEZNA":
      return "Unesite trenutnu lozinku.";
    case "NEISPRAVAN_KOD":
      return "Kod nije ispravan.";
    case "ISTEKAO_KOD":
      return "Kod je istekao. Zatražite novi.";
    case "PREVISE_POKUSAJA":
      return "Previše pokušaja. Zatražite novi kod.";
    case "NEMA_KODA":
      return "Nema aktivnog koda. Zatražite novi.";
    case "PRECESTO_SLANJE":
      return "Kod je maloprije poslan. Sačekajte minutu pa pokušajte ponovo.";
    case "PREVISE_ZAHTJEVA":
      return "Previše zahtjeva. Sačekajte minutu.";
    case "NEMA_EMAILA":
      return "Nalog nema email adresu.";
    case "CHALLENGE_ISTEKAO":
      return "Prijava je istekla. Prijavite se ponovo.";
    case "PODESAVANJE_NIJE_POCETO":
      return "Podešavanje je isteklo. Krenite ispočetka.";
    case "2FA_NIJE_UKLJUCEN":
      return "Dvofaktorska prijava nije uključena.";
    case "NEDOSTUPNA_METODA":
      return "Ova metoda još nije dostupna.";
    case "NEDOSTUPNO":
      return "Za aplikaciju se kod ne šalje, očitajte ga iz aplikacije.";
    case "NETWORK_ERROR":
      return "Server nije dostupan. Pokušajte ponovo.";
    default:
      return "Došlo je do greške. Pokušajte ponovo.";
  }
}
