# Pristup korisnicima — pretplate i autorizacija

Dokumentacija za feature *Pristup korisnicima* i način kako se pretplatnički paketi
(USER / PRO / BUSINESS) presijecaju s članstvom u organizaciji.

Branch: `73-pristup-korisnicima`

---

## 1. Šta je problem koji rješavamo

Postojalo je nesklad između dva nezavisna sistema:

1. **Pretplata** — vezana za korisnika (`User.role` = USER / PRO / BUSINESS / ADMIN).
2. **Pristup organizaciji** — `OrganizationMember` tabela sa rolama OWNER / ADMIN / MEMBER.

Prije ovih izmjena svi feature-i su gating-ovani po **`User.role` pozivaoca**.
To znači da je *USER* član u organizaciji nekog *BUSINESS* vlasnika dobijao 403 na
osnovne akcije (npr. dodavanje radnika), iako logički treba imati pristup —
vlasnik je platio pretplatu, on dijeli "seats".

## 2. Konceptualni model

### Pravilo

> **In-org feature-i prate pretplatu vlasnika organizacije, ne pozivaoca.**

Konkretno:

```
Korisnik X ima BUSINESS pretplatu
 ├─ Org A (X je OWNER)         → effectiveTier = BUSINESS
 │   └─ Korisnik Y (FREE) je MEMBER → unutar Org A koristi BUSINESS feature-e
 ├─ Org B (X je OWNER)         → effectiveTier = BUSINESS
 └─ Org C (X je MEMBER, Y owner FREE) → effectiveTier = USER
                                        (Y nije platio, X tu nema BUSINESS)
```

Korisnik "donosi" svoj tier samo u organizacijama gdje je on OWNER.
Kad mu istekne BUSINESS pretplata, sve njegove organizacije automatski padaju
na nižu razinu — članovi i dalje postoje u DB, ali gube pristup feature-ima.

### Šta čini "Pristup korisnicima"

Sam tab *Pristup korisnicima* je **BUSINESS-only feature**. Samo OWNER organizacije
koja je BUSINESS-tier (tj. samo BUSINESS vlasnik) može:

- Dodati novog člana po e-mailu
- Mijenjati rolu člana (ADMIN ↔ MEMBER)
- Ukloniti člana

Site-wide ADMIN (super-admin aplikacije) zaobilazi sve provjere.

### Roles

Postoje **dvije razine rola** koje treba pažljivo razlikovati:

| Razina        | Polje            | Vrijednosti                           | Šta predstavlja              |
|---------------|------------------|---------------------------------------|------------------------------|
| Aplikacijska  | `User.role`      | `USER` / `PRO` / `BUSINESS` / `ADMIN` | Pretplatnički paket + super-admin |
| Org-scoped    | `OrganizationMember.role` | `OWNER` / `ADMIN` / `MEMBER` | Uloga unutar jedne organizacije   |

`ADMIN` na *aplikacijskoj* razini = super-admin (npr. ti) i zaobilazi sve gate-ove.
`ADMIN` na *org-scoped* razini = neko kome je vlasnik dao pravo da operativno vodi
tu organizaciju (uređuje detalje, dodaje radnike), ali NE može pozivati nove članove.

## 3. Šta je promijenjeno — pregled fajlova

### Backend

| Fajl | Šta je promijenjeno |
|------|---------------------|
| `backend/src/services/tierService.js` | **Nov fajl.** `getOrgOwnerRole(orgId)` vraća `User.role` vlasnika date organizacije. Helper `tierAtLeast()` za poređenje hijerarhije. |
| `backend/src/middlewares/authMiddleware.js` | Dodana dva nova middleware-a: `requireOrgRole(...orgRoles)` i `requireOwnerTier(...tiers)`. Stari `requireRole` zadržan radi nazad-kompatibilnosti. |
| `backend/src/routes/organizationsRoutes.js` | `/members`, `/workers`, `/logo` rute prebačene na novi sistem. `/clients` i `/workers/mine` su oslobođene `requireRole` jer se filtriranje radi na nivou repozitorija. |
| `backend/src/routes/documentsRoutes.js` | `guardRestrictedType` (gate za JS3100) sada provjerava tier vlasnika kad je `organizationId` u body-ju; fallback na user-role kad nema orgId. |
| `backend/src/controllers/organizationsController.js` | Uklonjen ručni role-gate u `listClients` (logika sad u repozitoriju). |
| `backend/src/controllers/workersController.js` | Limit broja radnika (`USER_WORKERS_LIMIT`, `PRO_WORKERS_LIMIT`) sada se računa po **owner tier-u**, ne po pozivaocu. |
| `backend/src/repositories/organizationRepository.js` | `toPublicOrg()` proširen sa `effectiveTier`. Dodan helper `fetchOwnerTiers(orgIds)` koji bulk-učitava role vlasnika. Sve `getXxx` funkcije ažurirane da popunjavaju ovo polje. |

### Frontend

| Fajl | Šta je promijenjeno |
|------|---------------------|
| `frontend/src/api/profile.ts` | `Organization` tip dobio polje `effectiveTier`. |
| `frontend/src/sections/organizacija/Organizacija.tsx` | "Pristup korisnicima" kartica se prikazuje samo ako je `org.effectiveTier === "BUSINESS"` (ili super-admin). Limiti broja radnika koriste `org.effectiveTier` umjesto `useRole().role`. |

## 4. Detaljan opis ponašanja

### 4.1 `tierService.getOrgOwnerRole(organizationId)`

```js
// backend/src/services/tierService.js
async function getOrgOwnerRole(organizationId) {
  const ownerMembership = await OrganizationMember.findOne({
    where: { organizationId, role: "OWNER" },
    include: [{ model: User, as: "user", attributes: ["role"] }],
  });
  return ownerMembership?.user?.role ?? null;
}
```

- Single source of truth za "effective tier" jedne organizacije.
- Vraća `null` ako organizacija ne postoji ili nema OWNER-a (data integrity bug, treba alarmirati).
- Pošto se računa iz `User.role` u real-time, **istek pretplate je instantan** —
  nema cron-a koji nešto sinhronizuje. Kad subscription controller smanji `User.role`
  s BUSINESS na USER, sljedeći request kroz `requireOwnerTier` automatski daje 403.

### 4.2 Middleware `requireOrgRole(...orgRoles)`

```js
requireOrgRole("OWNER")             // samo vlasnik
requireOrgRole("OWNER", "ADMIN")    // vlasnik ili org-admin
requireOrgRole("OWNER", "ADMIN", "MEMBER")  // bilo koji član
```

- Čita `orgId` iz `req.params.id`, `req.params.orgId` ili `req.params.organizationId`
  (prvi koji je validan integer > 0).
- Super-admin (`req.user.role === "ADMIN"`) prolazi bez DB upita.
- Postavlja `req.orgMembership` za downstream upotrebu (za sad nije iskorišteno,
  ali je tu radi budućih kontrolera koji žele znati tačno koja je org-rola).

### 4.3 Middleware `requireOwnerTier(...tiers)`

```js
requireOwnerTier("BUSINESS")               // samo BUSINESS owner orgs
requireOwnerTier("PRO", "BUSINESS")        // PRO ili viši
```

- Čita `orgId` na isti način kao `requireOrgRole`.
- Super-admin bypass kao iznad.
- Poziva `tierService.getOrgOwnerRole(orgId)` i provjerava da li je u allowlist-i.
- Postavlja `req.orgOwnerTier` za downstream upotrebu (kontroleri koriste ovo
  npr. za worker limite — vidi `workersController.create`).

### 4.4 Slojeviti gating na rutama

Najčešći pattern je dvoslojni:

```js
router.post("/:id/members",
  requireAuth,                     // 1. Mora biti ulogovan
  requireOrgRole("OWNER"),         // 2. Mora biti OWNER ove organizacije
  requireOwnerTier("BUSINESS"),    // 3. Mora imati BUSINESS pretplatu
  membersController.add,
);
```

Svaki sloj radi nezavisnu provjeru i vraća jasne error kodove:

| Status | Error code | Značenje |
|--------|------------|----------|
| 401 | `UNAUTHENTICATED` | Nema/loš JWT |
| 400 | `INVALID_ORG_ID` | URL ne sadrži validan orgId |
| 403 | `FORBIDDEN` | Pozivaoc nije član / nema potrebnu org-rolu |
| 403 | `FORBIDDEN_OWNER_TIER` | Pretplata vlasnika nije dovoljna |
| 404 | `ORG_NOT_FOUND` | Org ne postoji ili nema OWNER zapis |

### 4.5 Nove rute u praksi

#### Members (Pristup korisnicima)

```
GET    /organizations/:id/members            → OWNER + BUSINESS
POST   /organizations/:id/members            → OWNER + BUSINESS
PUT    /organizations/:id/members/:userId    → OWNER + BUSINESS
DELETE /organizations/:id/members/:userId    → OWNER + BUSINESS
```

Stari gate je bio `requireRole("BUSINESS","ADMIN")` — provjeravao je samo da li
je *pozivaoc* BUSINESS. Novi provjerava da li je pozivaoc OWNER ove org **i**
da je njegova trenutna pretplata BUSINESS.

#### Workers

```
GET    /organizations/:orgId/workers              → OWNER/ADMIN/MEMBER
POST   /organizations/:orgId/workers              → OWNER/ADMIN
PUT    /organizations/:orgId/workers/:workerId    → OWNER/ADMIN
DELETE /organizations/:orgId/workers/:workerId    → OWNER/ADMIN
```

Limiti broja radnika su lift-ovani u kontroler i koriste **owner tier**:

```js
const ownerTier = req.orgOwnerTier ?? (await getOrgOwnerRole(orgId));
if (ownerTier === "USER")  ...max 1 radnik (sihterica preview)
if (ownerTier === "PRO")   ...max 5 radnika
if (ownerTier === "BUSINESS" || ownerTier === "ADMIN") ...neograničeno
```

Posljedica: USER član u BUSINESS organizaciji može dodavati radnike bez limita.

#### Logo upload

```
POST   /organizations/:id/logo   → OWNER/ADMIN + (PRO ili BUSINESS owner)
DELETE /organizations/:id/logo   → OWNER/ADMIN + (PRO ili BUSINESS owner)
```

#### JS3100 (prijava/odjava radnika)

`POST /documents` sa `body.type === "JS3100"`:

- Ako body ima `organizationId`: gate-ovano po **vlasnikovoj pretplati** te org
  (mora biti PRO/BUSINESS/ADMIN).
- Bez `organizationId`: fallback na user role (tj. pozivaoc mora biti
  PRO/BUSINESS/ADMIN). Ovo je legacy slučaj koji se rijetko dešava.

### 4.6 Šta se dešava kad pretplata istekne

**Nikakav cleanup nije potreban.** `OrganizationMember` zapisi ostaju netaknuti.
Pošto je `tierService.getOrgOwnerRole` real-time upit nad `User.role`, sljedeći
zahtjev koji prođe kroz `requireOwnerTier` automatski daje 403 za BUSINESS feature-e.

Kada vlasnik obnovi BUSINESS pretplatu:
1. `subscriptionsController` postavi `User.role = "BUSINESS"`
2. Sljedeći zahtjev → `requireOwnerTier("BUSINESS")` prolazi → svi članovi
   ponovo imaju BUSINESS feature-e.

Frontend će takođe vidjeti promjenu jer `effectiveTier` polje refleksuje aktuelno
stanje pri svakom `GET /organizations/:id`.

## 5. Frontend ugradnja

### Tip

```ts
export type Organization = {
  // ...postojeća polja...
  memberRole: "OWNER" | "ADMIN" | "MEMBER";
  effectiveTier: "USER" | "PRO" | "BUSINESS" | "ADMIN" | null;
};
```

### Pravilo prikazivanja "Pristup korisnicima" kartice

```tsx
{org.memberRole === "OWNER" &&
  (org.effectiveTier === "BUSINESS" || userRole === "ADMIN") && (
    <MembersCard orgId={orgId} />
  )}
```

Ne prikazuje se:
- Ako pozivaoc nije OWNER te organizacije (pravi member ne treba upravljati pristupom)
- Ako pretplata vlasnika nije BUSINESS

Super-admin (`userRole === "ADMIN"`) vidi karticu uvijek.

### Worker limiti

Prije:
```tsx
const isProLimitReached = userRole === "PRO" && workers.length >= 5;
```

Sada:
```tsx
const tier = org?.effectiveTier ?? null;
const isProLimitReached = tier === "PRO" && workers.length >= 5;
```

## 6. Migracija — šta nije pokrivena (kasnije)

- **Premještanje vlasništva** (`transferOwnership`): još nema rute za promjenu OWNER-a.
  Ako se vlasnik briše, organizacija nema "tier source". Trebati će dodati prije
  nego što se omogući brisanje računa.
- **Notifikacija članu** kad mu vlasnik downgrade-uje plan: za sad ćuti.
- **UI za FREE/PRO vlasnika** kad klikne na (ne)postojeći "Pristup korisnicima":
  trenutno kartica se ne renderuje. Razmotriti zaključanu varijantu sa upsell porukom
  (*"BUSINESS feature — upgrade →"*).
- **Audit log** dodavanja/uklanjanja članova: nije implementirano.

## 7. Testne scenarije za QA

1. **Owner BUSINESS, član FREE — happy path**
   - Owner X (BUSINESS) → kreira Org A → poziva korisnika Y (USER) kao MEMBER.
   - Y se prijavljuje, otvara Org A → može vidjeti radnike, popuniti GPD/SPR/JS3100, ali ne dodavati nove članove. ✅
   - Y otvara svoju ličnu org → ostaje na FREE limitu (1 radnik). ✅

2. **Owner BUSINESS, član ADMIN**
   - Y dobije rolu ADMIN unutar Org A → može uređivati org, dodavati/brisati radnike.
   - Y NE može dodati novog člana ("Pristup korisnicima" tab nije vidljiv niti dostupan na backendu). ✅

3. **Vlasnikova pretplata istekne**
   - Owner X otkaže BUSINESS → `User.role = "USER"` → effectiveTier sve njegove org pada.
   - Y otvori Org A → "Pristup korisnicima" više nema; prijava radnika 403.
   - X obnovi BUSINESS → sve se vraća.

4. **Super-admin bypass**
   - Bilo koja org, bilo koji feature → super-admin vidi/može sve.

5. **Negativni testovi**
   - PRO owner pokuša pozvati člana → 403 `FORBIDDEN_OWNER_TIER`.
   - Stranac (nema membership) pokuša bilo koju `/organizations/:id/...` rutu → 403 `FORBIDDEN`.
   - Bez orgId u URL-u → 400 `INVALID_ORG_ID`.

## 8. Ključni invariant-i

- **Jedan OWNER po organizaciji.** Trenutno se enforce-uje kreiranjem (createOrganization
  uvijek pravi tačno jedan OWNER zapis) i činjenicom da remove member ne smije ukloniti
  OWNER-a. Ako se ikad dozvoli više OWNER-a, `getOrgOwnerRole` mora odlučiti koji je
  "primarni" (npr. `MAX(role)` ili FIFO).
- **`User.role` je istinit izvor pretplate.** Subscription tabela je sekundarna —
  ona daje `startDate/endDate`, ali tier se čita iz `User.role`. Sve dok ovaj invariant
  važi, sistem radi. Ako se ikad razdvoji (više pretplata po useru, npr. po orgu),
  `tierService` će morati bolji upit.
