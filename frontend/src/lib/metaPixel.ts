// Meta (Facebook) Pixel helperi. Pixel se učitava u app/layout.tsx samo kad
// je NEXT_PUBLIC_META_PIXEL_ID postavljen; do "Prihvati sve" u ConsentBanner-u
// stoji na fbq('consent','revoke') pa se eventi ne šalju (čekaju grant).

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** Pošalji standardni Meta event (npr. "CompleteRegistration", "Lead"). */
export function fbqTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  if (params) window.fbq("track", event, params);
  else window.fbq("track", event);
}

/** PageView za SPA navigaciju (pixel sam od sebe broji samo prvi load). */
export function fbqPageView() {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", "PageView");
}

/** Consent update, poziva se iz ConsentBanner-a uz gtag update. */
export function fbqConsent(granted: boolean) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("consent", granted ? "grant" : "revoke");
}
