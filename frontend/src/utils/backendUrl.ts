// Resolves the backend URL for client-side fetches.
//
// - Production / explicit override: uses NEXT_PUBLIC_BACKEND_URL.
// - Dev on localhost:3000           → http://localhost:4000.
// - Dev on LAN IP (mobile testing)  → http://<same-hostname>:4000.
//
// Resolving from window.location keeps cookies and CORS aligned with the
// origin the browser is actually on, so we don't have to flip .env values
// when switching between desktop and mobile testing.
export function getBackendUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (envUrl) return envUrl;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }
  return "http://localhost:4000";
}
