// Cookie postavke za prijavu, na jednom mjestu.
//
// Izdvojeno iz authController-a kad je došao 2FA: challenge cookie i cookie
// povjerenog uređaja moraju imati ISTE secure/sameSite/domain atribute kao
// access_token, inače ih browser na produkciji (cross-subdomain, SameSite=None)
// ne šalje ili ne briše. Dvije kopije tih pravila bi prije ili kasnije razišle.

const REMEMBER_ME_DURATION_MS = 1000 * 60 * 60 * 24 * 365 * 10; // 10 godina
// Default sesija (bez "zapamti me") je 24h, isto trajanje kao JWT.
const DEFAULT_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24;

function getCookieDomain() {
  const domain = process.env.COOKIE_DOMAIN;
  return domain && domain.trim() ? domain.trim() : undefined;
}

/** Zajednički atributi svih auth cookieja (bez maxAge i imena). */
function cookieBaseOptions() {
  const isProd = process.env.NODE_ENV === "production";
  const domain = getCookieDomain();
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    ...(domain ? { domain } : {}),
  };
}

function setAuthCookie(res, token, rememberMe = false) {
  const base = cookieBaseOptions();
  // Kad koristimo domain cookie (.poreznikalkulator.ba), prvo obrišemo eventualni
  // stari host-only access_token (postavljen bez domaina, prije konfiguracije).
  // Bez ovoga browser zadrži oba i šalje ih oba na api subdomenu, pa server
  // pročita stari (nevažeći) token. Clear bez domaina cilja host-only varijantu.
  if (base.domain) {
    const { domain: _domain, ...hostOnly } = base;
    res.clearCookie("access_token", hostOnly);
  }
  res.cookie("access_token", token, {
    ...base,
    maxAge: rememberMe ? REMEMBER_ME_DURATION_MS : DEFAULT_COOKIE_MAX_AGE,
  });
}

function clearAuthCookie(res) {
  // Atributi se MORAJU poklapati sa setAuthCookie (secure + sameSite + domain),
  // inače browser ne obriše cross-subdomain Secure; SameSite=None cookie.
  res.clearCookie("access_token", cookieBaseOptions());
}

module.exports = {
  REMEMBER_ME_DURATION_MS,
  DEFAULT_COOKIE_MAX_AGE,
  getCookieDomain,
  cookieBaseOptions,
  setAuthCookie,
  clearAuthCookie,
};
