// TOTP verifikator (RFC 6238). Pokretanje:
//   cd backend && npm test
// Vektori su iz Appendix B specifikacije, skraćeni na 6 cifara (RFC ih navodi
// kao osmocifrene, a aplikacije koriste šest).
const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  base32Encode,
  base32Decode,
  generateSecret,
  currentStep,
  codeForStep,
  verifyCode,
  buildOtpauthUrl,
  formatSecretForDisplay,
  KORAK_SEKUNDI,
} = require("../src/utils/totp");

const RFC_TAJNA = base32Encode(Buffer.from("12345678901234567890", "ascii"));

test("base32 tuda i nazad", () => {
  assert.equal(RFC_TAJNA, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  assert.equal(
    base32Decode(RFC_TAJNA).toString("ascii"),
    "12345678901234567890",
  );
  // razmaci i mala slova iz ručnog unosa ne smiju smetati
  assert.equal(
    base32Decode("gezd gnbv gy3t qojq gezd gnbv gy3t qojq").toString("ascii"),
    "12345678901234567890",
  );
});

test("RFC 6238 vektori", () => {
  const vektori = [
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
    [20000000000, "353130"],
  ];
  for (const [sekunde, ocekivan] of vektori) {
    const korak = Math.floor(sekunde / KORAK_SEKUNDI);
    assert.equal(codeForStep(RFC_TAJNA, korak), ocekivan, `T=${sekunde}`);
  }
});

test("prozor prihvata prethodni i naredni korak, ne i dalje od toga", () => {
  const vrijeme = 1_700_000_000_000;
  const sada = currentStep(vrijeme);

  for (const pomak of [-1, 0, 1]) {
    const kod = codeForStep(RFC_TAJNA, sada + pomak);
    assert.equal(
      verifyCode(RFC_TAJNA, kod, { vrijemeMs: vrijeme }),
      sada + pomak,
      `pomak ${pomak} mora proći`,
    );
  }

  for (const pomak of [-2, 2, 10]) {
    const kod = codeForStep(RFC_TAJNA, sada + pomak);
    assert.equal(
      verifyCode(RFC_TAJNA, kod, { vrijemeMs: vrijeme }),
      null,
      `pomak ${pomak} ne smije proći`,
    );
  }
});

test("isti kod ne prolazi dvaput", () => {
  const vrijeme = 1_700_000_000_000;
  const sada = currentStep(vrijeme);
  const kod = codeForStep(RFC_TAJNA, sada);

  const prvi = verifyCode(RFC_TAJNA, kod, { vrijemeMs: vrijeme });
  assert.equal(prvi, sada);

  // pozivalac upisuje vraćeni korak, drugi pokušaj sa istim kodom pada
  assert.equal(
    verifyCode(RFC_TAJNA, kod, { vrijemeMs: vrijeme, poslijeKoraka: prvi }),
    null,
  );

  // ali kod iz NAREDNOG koraka i dalje prolazi
  const sljedeci = codeForStep(RFC_TAJNA, sada + 1);
  assert.equal(
    verifyCode(RFC_TAJNA, sljedeci, { vrijemeMs: vrijeme, poslijeKoraka: prvi }),
    sada + 1,
  );
});

test("pogrešan i loše oblikovan kod padaju", () => {
  const vrijeme = 1_700_000_000_000;
  assert.equal(verifyCode(RFC_TAJNA, "000000", { vrijemeMs: vrijeme }), null);
  assert.equal(verifyCode(RFC_TAJNA, "12345", { vrijemeMs: vrijeme }), null);
  assert.equal(verifyCode(RFC_TAJNA, "", { vrijemeMs: vrijeme }), null);
  assert.equal(verifyCode(RFC_TAJNA, "abcdef", { vrijemeMs: vrijeme }), null);
});

test("kod se čita i sa razmakom (kako aplikacije prikazuju: 123 456)", () => {
  const vrijeme = 1_700_000_000_000;
  const sada = currentStep(vrijeme);
  const kod = codeForStep(RFC_TAJNA, sada);
  const saRazmakom = `${kod.slice(0, 3)} ${kod.slice(3)}`;
  assert.equal(verifyCode(RFC_TAJNA, saRazmakom, { vrijemeMs: vrijeme }), sada);
});

test("tajna je 32 base32 znaka i svaki put drugačija", () => {
  const a = generateSecret();
  const b = generateSecret();
  assert.match(a, /^[A-Z2-7]{32}$/);
  assert.notEqual(a, b);
  // tajna mora raditi sa vlastitim kodom
  const sada = currentStep();
  assert.equal(verifyCode(a, codeForStep(a, sada)), sada);
});

test("otpauth URI nosi sve što aplikacija treba", () => {
  const url = buildOtpauthUrl("ABCDEFGHIJKLMNOP", "korisnik@primjer.ba");
  assert.ok(url.startsWith("otpauth://totp/"));
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("secret"), "ABCDEFGHIJKLMNOP");
  assert.equal(parsed.searchParams.get("issuer"), "Porezni Kalkulator");
  assert.equal(parsed.searchParams.get("digits"), "6");
  assert.equal(parsed.searchParams.get("period"), "30");
  assert.equal(parsed.searchParams.get("algorithm"), "SHA1");
  // labela je "izdavač:nalog" da se u listi aplikacije vidi o kojem je nalogu riječ
  assert.ok(decodeURIComponent(parsed.pathname).includes("korisnik@primjer.ba"));
});

test("tajna za ručni unos je razlomljena na četvorke", () => {
  assert.equal(
    formatSecretForDisplay("ABCDEFGHIJKLMNOP"),
    "ABCD EFGH IJKL MNOP",
  );
  assert.equal(formatSecretForDisplay(""), "");
});
