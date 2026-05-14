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

---

## 6. Faza 2 — JS3100, Sihterica, OrgTierGuard

Druga runda izmjena, u istom branch-u. Adresira problem koji je ostao iza Faze 1:
mnogi feature-i preko frontenda još uvijek imaju `RoleGuard` koji blokira USER-a
koji je legitimni član BUSINESS organizacije.

### 6.1 Princip — koji guard za koji feature

Tri vrste guard-ova, biraj po tome **u čijem kontekstu se feature dešava**:

| Vrsta feature-a | Guard | Primjer |
|-----------------|-------|---------|
| Lično (korisnikov račun) | `RoleGuard roles={[...]}` po `user.role` | Profil, pretplata, admin panel |
| Vezano za konkretnu org | `OrgTierGuard organizationId tiers={[...]}` po `org.effectiveTier` | Worker forme, members card, JS3100 vezan za jednu org |
| "Bilo gdje" — page koji ne fiksira jednu org | `useMaxAccessibleTier().hasAccessToTier("PRO")` | JS3100 (pre nego što korisnik izabere employer) |

### 6.2 Novi frontend artefakti

**`frontend/src/hooks/useAccessibleTier.ts`** — hook `useMaxAccessibleTier()`:

```ts
const { tier, hasAccessToTier, isLoading } = useMaxAccessibleTier();
// tier = najviša pretplata koja je korisniku dostupna:
//   max(user.role, max(org.effectiveTier za sve org gdje je član))
// hasAccessToTier("PRO") = true ako tier >= PRO
```

Učitava `getOrganizations()` (već cache-ovano kroz React Query) i kombinira sa
`useRole()`. Tier rank: USER=0, PRO=1, BUSINESS=2, ADMIN=3.

**`frontend/src/components/OrgTierGuard/OrgTierGuard.tsx`** — komponenta:

```tsx
<OrgTierGuard organizationId={orgId} tiers={["BUSINESS"]} fallback={<Upsell/>}>
  <MembersCard />
</OrgTierGuard>
```

Sa istim modovima kao `RoleGuard` (`hide` / `disable`) + opcioni `fallback`.
Super-admin (`user.role === "ADMIN"`) prolazi uvijek.

### 6.3 JS3100 (Prijava / odjava radnika)

**Frontend** — `frontend/src/sections/prijave-radnika/Js3100.tsx`:

Prije:
```tsx
<RoleGuard roles={["PRO","BUSINESS","ADMIN"]} mode="hide" fallback={<UpgradeGate/>}>
  <Js3100App />
</RoleGuard>
```

Sada:
```tsx
const { hasAccessToTier, isLoading } = useMaxAccessibleTier();
if (isLoading) return null;
if (!hasAccessToTier("PRO")) return <UpgradeGate />;
return <Js3100App />;
```

Posljedica: FREE korisnik koji je član PRO/BUSINESS owner-ove organizacije vidi
formu. Sam PDF download radi lokalno (bez backend-a). Save-to-profile poziv već
ide kroz `POST /documents` koji u Fazi 1 dobio gate po owner-tier-u za JS3100 tip.

**Backend** — već urađeno u Fazi 1 ([documentsRoutes.js](backend/src/routes/documentsRoutes.js)).

### 6.4 Sihterica

**Frontend** — `frontend/src/sections/sihterica/Sihterica.tsx`:

Promijenjeno:
- Uklonjen `canExport = hasRole("PRO","BUSINESS","ADMIN")` na vrhu komponente
- Dodan `isSuperAdmin = hasRole("ADMIN")`
- `canExport` se sad računa pored `selectedOrg`:
  ```ts
  const canExport = isSuperAdmin
    || selectedOrg?.effectiveTier === "PRO"
    || selectedOrg?.effectiveTier === "BUSINESS";
  ```

Posljedica: gating prati izabranu organizaciju. Ako BUSINESS owner pozove
FREE korisnika kao member-a, member može da exportuje sihtericu za **tu** org.
Ako member izabere svoju ličnu (FREE) org, export se gasi.

**Outer guard** (`RoleGuard roles={["USER","PRO","BUSINESS","ADMIN"]}`) ostavljen
kao prag prijavljenog korisnika — to praktično znači "any logged-in user".

**Backend** — `backend/src/controllers/sihtericaController.js`:

Veliki cleanup:

| Bilo | Sada |
|------|------|
| `ALLOWED_ROLES = ["USER","PRO","BUSINESS","ADMIN"]` i `checkRole()` na svakom endpointu | Uklonjeno — nije ništa stvarno gate-ovalo |
| `ensureWorkerOwned(workerId, userId)` koji provjerava `org.createdById === userId` | `ensureWorkerAccess(workerId, userId)` koji provjerava `OrganizationMember` |
| `getWorkerMonths` filtrirano po `org.createdById === userId` | Filtrirano po `OrganizationMember` (`hasOrgAccess`) |
| Sve `Form.findOne` upite su gledali `createdById: req.user.id` | Skinut taj filter — bilo koji član org-e može čitati sihtericu (ali samo članovi prolaze membership check) |

Posljedica: sihterica je sad sharing-aware u okviru jedne organizacije. Ako
sihtericu kreira jedan member, drugi članovi te org-e je vide. To je željeno
ponašanje: tim radi zajednički.

### 6.5 Šta još nije dirano (i zašto)

| Page | Status | Zašto |
|------|--------|-------|
| `InvoiceForm.tsx`, `Fakture.tsx` | Nije migrirano | Biznis logika fakturisanja kompleksna (snapshot prodavca po izboru orga); treba odluka prije implementacije |
| `Amortizacija.tsx` | Nije migrirano | Slično — client list i amortizacija; treba odluka |
| `UgovorODjelu.tsx` | Nije migrirano | Slično — provjeriti da li je org-scoped |
| `Profil.tsx` | OSTAJE `RoleGuard` | Sekcije profila su lične — to je tačno |
| Admin pages | OSTAJE `RoleGuard ADMIN` | Super-admin only |
| `formsRoutes.js`, `invoicesRoutes.js`, `clientsRoutes.js`, `amortizacijaRoutes.js` | Nije migrirano | Idu uz odgovarajuće frontend stranice u sljedećoj fazi |
| `documentsController.save/get/remove` Form upite | Skopir `createdById: req.user.id` filter | Forme su trenutno per-user; razmotriti kasnije da li trebaju biti org-scoped kao SIH |

---

## 6.6 Faza 3A — Fakture, Klijenti, Amortizacija, UOD, Forme team-shared

Treća runda izmjena fokusirana na backend. Frontend dolazi u Fazi 3B.

### Pravilo (poslednje proširenje)

- **Fakture, klijenti, amortizacija**: per-organization data; gating po `effectiveTier` te org-e; team-shared između svih članova org-e
- **Forme (GPD, SPR, ZO3, AMS, SIH, JS3100, UOD, PLDI)** sa `organizationId`: team-shared
- **Forme bez `organizationId`** (legacy lične): vidi samo `createdById`

### Novi tip dokumenta — UOD (Ugovor o djelu)

`UGOVOR` enum vrijednost je već zauzeta za "Ugovor o pozajmici" (legacy). Za "Ugovor o djelu" uveden je **novi tip `UOD`**.

| Lokacija | Izmjena |
|----------|---------|
| `backend/src/models/index.js` | `Form.type` enum proširen sa `"UOD"` |
| `backend/src/controllers/documentsController.js` | `VALID_TYPES` proširen sa `"UOD"` |
| `backend/src/routes/documentsRoutes.js` | `RESTRICTED_TYPES.UOD = ["BUSINESS","ADMIN"]` — BUSINESS-only gate |
| `backend/src/controllers/formsController.js` | `VALID_TYPES` proširen sa `"UOD"` (i `"SIH"`, `"JS3100"` koje su nedostajale) |

### InvoiceCounter — per-organization

| Bilo | Sada |
|------|------|
| `userId + year + type` unique | `userId` allowNull. **Novo polje** `organizationId` allowNull. **Dva** unique indexa: `(userId, year, type)` za legacy + `(organizationId, year, type)` za nove |
| `nextSequence(userId, year, type)` | `nextSequence({ organizationId, userId }, year, type)` — bira granu po `organizationId` (default) ili fallback na `userId` (legacy) |

**Migracija postojećih podataka:** nema scripta. Kad prva nova faktura izađe iz neke org-e, `nextSequence` automatski **seed-uje counter** sa `MAX(invoices.sequence)` za tu org/year/type — tako nove numeracije nastavljaju gdje su postojeće stale.

### invoicesController — najveća izmjena

Sve `userId: req.user.id` filtere zamijenjeni sa membership/owner-tier provjerom (`userCanAccessInvoice`):

```js
async function userCanAccessInvoice(invoice, userId, userRole) {
  if (userRole === "ADMIN") return true;
  if (invoice.organizationId) {
    // mora biti član + owner PRO+
    ...
  }
  // legacy: tvorac + njegov role PRO+
  return invoice.userId === userId && ["PRO","BUSINESS","ADMIN"].includes(userRole);
}
```

Listing (`list`) sad vraća uniju:
- legacy lične fakture (`organizationId IS NULL AND userId = me`)
- sve fakture iz svih org-a u kojima sam član **i** owner je PRO+

Funkcije pogođene: `list`, `getById`, `create`, `patch`, `remove`, `pdf`, `emailToBuyer`, `convertProforma`. Stari `ALLOWED_ROLES` + `requireRole(req,res)` u kontroleru uklonjen.

**Posljedica za PRO klijent limit (20):** kad faktura ima org → broji se po `organizationId`; inače po `createdById` (legacy).

### clientsController — per-org sa legacy fallback

Repozitorij (`clientRepository`):

- `getPersonClients`, `getAmortizacijaClients` sad pune iz unije:
  - klijenti svih moje org-e (`organizationId IN [...]`)
  - moji legacy klijenti (`organizationId IS NULL AND createdById = me`)
- Novi helper `canUserAccessClient(client, userId)` — provjeri pristup po istoj logici

Kontroler:

- `create`/`createAmortizacija` čitaju `organizationId` iz body-ja. Ako je prisutan, mora biti pozivaoc član te org-e i owner PRO+. Bez `organizationId` (legacy), pozivaoc lično mora imati PRO+.
- PRO klijent-limit od 20 prati owner-tier kad ima org, inače user-role
- `update`/`remove` koriste `canUserAccessClient` (svaki član PRO+ org-e može)

### amortizacijaController — team-shared kroz klijenta

PLDI forma nije vezana direktno za `organizationId` — vezana je za `clientId`. Pristup prati klijenta:
- Ako klijent ima `organizationId` → bilo koji član te org-e ima pristup (`canUserAccessClient`)
- Inače legacy (`createdById` filter)

`getClientYears` sad vraća sve PLDI forme klijenata u svim mojim org-a, plus moje legacy lične.

### documentsController — team-shared get/remove

Novi helper `userCanAccessForm(form, userId)`:
- Ako form ima `organizationId` → bilo koji član te org-e
- Inače → samo `createdById`

`get` i `remove` koriste ovo umjesto starog `createdById: req.user.id` filtera.

`save` (upsert) — kad postoji `organizationId`, search where bez `createdById`, tako da team-shared forme jedan član kreira a drugi update-uje (npr. SIH dva člana kolaborativno popunjavaju).

### formsController.list — team-shared listing

`formRepository.getUserForms(userId, type)` sad vraća uniju:
- lične forme (`organizationId IS NULL AND createdById = me`)
- sve forme iz org-a u kojima sam član

`VALID_TYPES` u kontroleru proširen sa `"UOD"`, `"SIH"`, `"JS3100"` (prije nedostajali — to su tipovi koji nisu mogli kroz filter).

### workersController — count samo RADNIK

`Worker.count` sad filtrira sa `role: "RADNIK"` — VLASNIK (auto-kreiran pri stvaranju org-e) **ne ulazi** u limit. Tako PRO ima čistih 5 RADNIK + 1 auto VLASNIK = 6 total.

Implicitno potvrđuje da `5 radnika` = 5 employed, ne 5 total.

### Šta nije dirano u 3A (ide u 3B)

| Komponenta | Razlog |
|------------|--------|
| Frontend stranice (Fakture, Amortizacija, UgovorODjelu, ClanskeKartice) | Posebna faza, predviđa novu komponentu `OrgTierGuard` u Pretplate-mode |
| `UgovorODjelu` Save-to-profile sa novim UOD tipom | Treba dodati `<SaveToProfileButton type="UOD" ...>` u UI |
| Fill helperi (PersonFillSelect, OrgFillSelect, ClientFillSelect, UgovorFillSelect) | Trebaju `useMaxAccessibleTier` umjesto `hasRole` |
| Profil document history team view | Backend već vraća team docs; frontend treba prikazati "Autor" kolonu |
| ClanskeKartice migracija (per-org + bulk = BUSINESS) | Posebna faza, treba i model provjeriti |
| **Sequelize sync** za nova polja | Treba pokrenuti `sequelize.sync({ alter: true })` ili migracioni script u dev DB-u |

---

## 6.7 Faza 3B — Frontend migracija (Fakture, Amortizacija, UgovorODjelu, ClanskeKartice, fill helpers, profil historija)

Druga polovina Faze 3 — frontend dosljedno koristi `useMaxAccessibleTier` umjesto `useRole` na svim org-scoped stranicama.

### Princip — koji helper za koji slučaj

| Slučaj | Helper | Primjer |
|--------|--------|---------|
| Page-level entry kad user nije izabrao konkretnu org | `useMaxAccessibleTier().hasAccessToTier("PRO")` | Fakture, Amortizacija, Fakture form, UgovorODjelu |
| Per-organization feature na detalj stranici | `org.effectiveTier === "BUSINESS"` (čita iz backend response) | MembersCard u Organizacija |
| Lično / admin-only | `useRole().hasRole(...)` | Profil sekcije, admin panel |

### Migrirani frontend fajlovi

| Fajl | Šta je promijenjeno |
|------|---------------------|
| `frontend/src/api/documents.ts` | `DocumentType` proširen sa `"UOD"` |
| `frontend/src/api/profile.ts` | `FormType` proširen sa `"UOD"` i `"SIH"`. `FormRecord.createdById` dodato (za "Tim" indikator) |
| `frontend/src/sections/fakture/Fakture.tsx` | `hasRole(...)` → `hasAccessToTier("PRO")` |
| `frontend/src/sections/fakture/InvoiceForm.tsx` | `hasRole(...)` → `hasAccessToTier("PRO")`. `useRole().role` zadržan za inline logiku |
| `frontend/src/sections/amortizacija/Amortizacija.tsx` | `hasRole(...)` → `hasAccessToTier("PRO")`. `isPro` čita iz `maxTier` umjesto `role` |
| `frontend/src/sections/ugovor-o-djelu/UgovorODjelu.tsx` | `role !== BUSINESS` → `hasAccessToTier("BUSINESS")`. **Novo: `SaveToProfileButton type="UOD"`** dodato u actions sekciju |
| `frontend/src/sections/clanske-kartice/ClanskeKartice.tsx` | Page gate i `isBusiness` koriste `hasAccessToTier` |
| `frontend/src/components/PersonFillSelect/PersonFillSelect.tsx` | `hasRole(...)` → `hasAccessToTier("PRO")` |
| `frontend/src/components/PersonFillSelect/OrgFillSelect.tsx` | Isto |
| `frontend/src/components/BuyerFillSelect/ClientFillSelect.tsx` | Isto |
| `frontend/src/components/PersonFillSelect/UgovorFillSelect.tsx` | Isto |
| `frontend/src/sections/profil/Profil.tsx` | `FORM_TYPE_LABELS` + `FILTER_OPTIONS` + `typeBadgeClass` prošireni za `UOD` i `SIH`. **Novo: "Tim" badge** se prikazuje pored naslova kad team-member otvori istoriju i vidi formu koju je kreirao drugi član iste org-e |

### UOD (Ugovor o djelu) — kompletan flow

1. Korisnik otvara `/ugovor-o-djelu`
2. `useMaxAccessibleTier().hasAccessToTier("BUSINESS")` — prolaz ako vlastiti BUSINESS, ili član bilo koje BUSINESS owner org-e
3. Popunjava formu (lokalno, bez backend-a)
4. Klikne "Sačuvaj na profil" → `<SaveToProfileButton type="UOD" />` → `POST /documents`
5. Backend `documentsRoutes.guardRestrictedType` provjeri `RESTRICTED_TYPES.UOD = ["BUSINESS","ADMIN"]`:
   - Ako body ima `organizationId` → provjeri owner-tier te org-e
   - Inače → provjeri vlastiti role
6. Form zapisan u `forms` tabelu sa `type: "UOD"`, snapshot u `form_versions.data` kao JSON
7. Korisnik vidi u Profil → Historija → "Ugovor o djelu" badge

### Profil historija — "Tim" indikator

Backend već (Faza 3A) vraća unionu team docs + lične u `formRepository.getUserForms`. Frontend dodaje:
- Novi `useQuery("me")` u `HistorijaTab` (već postoji u parent-u, ali ovdje treba mu vlastiti)
- Ako `f.organization && f.createdById !== null && f.createdById !== myUserId` → mali "Tim" badge pored naslova
- Tooltip: *"Dokument kreiran od strane drugog člana organizacije"*

### Filter opcije proširene

Filter u Profil/Historija sad ima:
- AMS, GPD, SPR, ZO3 (free)
- Ugovor o pozajmici (`UGOVOR` legacy)
- **Ugovor o djelu (`UOD`) — novo**
- **Šihterica (`SIH`) — prije nedostajao u filteru**
- **JS3100 — prije nedostajao u filteru**
- Stalna sredstva (PLDI)

### CSS — opcioni stilovi za nove badge-ove

`typeBadgeClass` koristi `s.badgeUod` i `s.badgeSih` ako postoje, inače fallback na `s.badgeUgovor`. Ako želiš posebne boje za nove tipove, dodaj u `profil.module.css`:

```css
.badgeUod { background: #c084fc; color: white; }
.badgeSih { background: #6ee7b7; color: black; }
```

Bez tih klasa, badge će izgledati kao Ugovor o pozajmici badge.

### Šta nije dirano (sljedeća Faza 4, ako bude potrebno)

| Komponenta | Razlog |
|------------|--------|
| Klijenti stranica unutar profila — UI za izbor org-e pri kreiranju klijenta | Backend prima `organizationId` ali frontend forma još ne traži izbor org-e. Hot-fix radi tako što novi klijent ide kao "lični" |
| Bulk member upload UI za ClanskeKartice | Postoji ali nije provjereno da gating prati org owner-tier (samo "any BUSINESS access") |
| `OrgTierGuard` komponenta | Postoji od Faze 2 ali se rijetko koristi — većina migracija je inline (effectiveTier provjera u render) |
| InvoiceCounter migracioni script za prebacivanje legacy zapisa na org | Nije potrebno — postojeći `nextSequence` automatski seed-uje iz `MAX(invoices.sequence)` pri prvom pozivu |

---

## 7. Migracija — šta nije pokriveno (kasnije)

- **Premještanje vlasništva** (`transferOwnership`): još nema rute za promjenu OWNER-a.
  Ako se vlasnik briše, organizacija nema "tier source". Trebati će dodati prije
  nego što se omogući brisanje računa.
- **Notifikacija članu** kad mu vlasnik downgrade-uje plan: za sad ćuti.
- **UI za FREE/PRO vlasnika** kad klikne na (ne)postojeći "Pristup korisnicima":
  trenutno kartica se ne renderuje. Razmotriti zaključanu varijantu sa upsell porukom
  (*"BUSINESS feature — upgrade →"*).
- **Audit log** dodavanja/uklanjanja članova: nije implementirano.
- **Faza 3:** Fakture, Klijenti, Amortizacija, UgovorODjelu — paralelno frontend
  (`OrgTierGuard` / `useMaxAccessibleTier`) i backend rute (`requireOrgRole` /
  `requireOwnerTier`).

## 8. Testne scenarije za QA

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

6. **JS3100 — page-level gating (Faza 2)**
   - USER bez ijedne PRO+ organizacije → `<UpgradeGate>`.
   - USER član BUSINESS owner-ove org → vidi formu, može snimiti za tu org.
   - PRO korisnik (vlastiti račun) → vidi formu, može snimiti za svoju org.

7. **Sihterica — selectedOrg gating (Faza 2)**
   - Korisnik izabere FREE owner-ovu org → `canExport === false`, gumbi `disabled`.
   - Korisnik izabere BUSINESS owner-ovu org → `canExport === true`.
   - Dva člana iste org → kreiraju sihtericu, oba je vide.

## 9. Ključni invariant-i

- **Jedan OWNER po organizaciji.** Trenutno se enforce-uje kreiranjem (createOrganization
  uvijek pravi tačno jedan OWNER zapis) i činjenicom da remove member ne smije ukloniti
  OWNER-a. Ako se ikad dozvoli više OWNER-a, `getOrgOwnerRole` mora odlučiti koji je
  "primarni" (npr. `MAX(role)` ili FIFO).
- **`User.role` je istinit izvor pretplate.** Subscription tabela je sekundarna —
  ona daje `startDate/endDate`, ali tier se čita iz `User.role`. Sve dok ovaj invariant
  važi, sistem radi. Ako se ikad razdvoji (više pretplata po useru, npr. po orgu),
  `tierService` će morati bolji upit.
