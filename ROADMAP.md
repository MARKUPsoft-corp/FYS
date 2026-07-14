# FYS — Roadmap

## Status legend
- ✅ Done
- 🚧 In progress
- 🔲 Planned

---

## Phase 0 — Foundation
> Project setup, data model, UI system

| Task | Status |
|---|---|
| Rasengan.js project init | ✅ |
| Tailwind CSS v4 + theme (light/dark, custom colors) | ✅ |
| UI component library (Radix + shadcn-style) | ✅ |
| Data model — entities & Firestore constants | ✅ |
| Firebase project setup (Auth + Firestore + Storage) | ✅ |
| React Query (`@tanstack/react-query`) setup | ✅ |
| Pricing constants (`BASE_COCKTAIL_PRICE`, `DELIVERY_FEE`) | ✅ |

---

## Phase 1 — Auth
> Firebase Authentication, route protection, session management

| Task | Status |
|---|---|
| Email/password registration + login | ✅ |
| Google sign-in | ✅ |
| Auth store (`onAuthStateChanged` listener) | ✅ |
| Protected routes (auth guard at layout level) | ✅ |
| Auth pages (login, register) | ✅ |
| Redirect logic (unauthenticated → login, authenticated → home) | ✅ |

---

## Phase 2 — Dashboard layout
> Shell, navigation, role-based views

| Task | Status |
|---|---|
| Collapsible sidebar (icon-only mode) | ✅ |
| Glassmorphism topbar | ✅ |
| Avatar dropdown (profile, settings, sign out) | ✅ |
| Mobile bottom tab bar | ✅ |
| Role-based navigation (`customer` vs `admin`) | ✅ |
| Home dashboard — Admin view (stat cards, quick actions) | ✅ |
| Home dashboard — Customer view (proposals, CTA banner) | ✅ |

---

## Phase 3 — Fruits & Categories (admin)
> Foundational catalog — required before cocktails or AI analysis

| Task | Status |
|---|---|
| Expanded Fruit entity (nutrients, glycemic index, bioactives, health profile) | ✅ |
| Flat fruit `price` field (XAF, replaces pricePerGram) | ✅ |
| Firestore services — `fruit.ts`, `category.ts`, `storage.ts` | ✅ |
| `stripUndefined` in create & update — no Firestore undefined errors | ✅ |
| Firebase Storage image upload / delete for fruits | ✅ |
| Seed script (`pnpm seed`) — imports `fruits_db.json` into Firestore | ✅ |
| Category list, create / edit / delete (`CategoryFormDialog`) | ✅ |
| Fruit data table with thumbnail, categories, role, price, status | ✅ |
| Fruit create / edit drawer — all sections (nutrients, bioactives, health profile) | ✅ |
| Fruit image upload with drag-and-drop + preview | ✅ |
| Delete fruit (with Storage cleanup) | ✅ |
| `useQuery` + `invalidateQueries` on both pages | ✅ |

---

## Phase 4 — Catalogue cocktails (admin + customer)
> Admin-created cocktails visible to all customers

| Task | Status |
|---|---|
| `tag` field on `Cocktail` entity | ✅ |
| `basePrice` + `priceSnapshot` per ingredient pricing model | ✅ |
| `deliveryFee` on `Order` entity | ✅ |
| Mock cocktails aligned with entity schema | ✅ |
| `CocktailCard` — floating image, ingredient summary, price, tag badge | ✅ |
| `CocktailDetailDrawer` — price breakdown (base + fruits + delivery note) | ✅ |
| `CocktailTable` — admin table with type, visibility, toggle active | ✅ |
| `CustomerCatalogue` — hero banner, search, responsive card grid | ✅ |
| `AdminCatalogue` — header + table + add button | ✅ |
| Role-based switch on `catalogue.page.tsx` | ✅ |
| Firestore service `cocktail.ts` (getCocktails, create, update, delete) | 🔲 |
| `CocktailFormDrawer` — fruit picker, quantity, live price computation | 🔲 |
| Replace mock data with real Firestore reads via React Query | 🔲 |
| Activate / deactivate cocktail persisted to Firestore | 🔲 |

---

## Phase 5 — Health profile (customer)
> Personalization layer required for meaningful AI analysis

| Task | Status |
|---|---|
| Health profile form (conditions, allergies, goals) | 🔲 |
| Create / update profile in `users/{uid}/profile/main` | 🔲 |
| Profile completion indicator on dashboard | 🔲 |
| Skip option with fallback to generic AI analysis | 🔲 |
| Firestore service (`src/services/profile.ts`) | 🔲 |

---

## Phase 6 — Custom cocktails (customer)
> User-created private cocktails, reuses the cocktail builder

| Task | Status |
|---|---|
| "My cocktails" list view | 🔲 |
| Cocktail builder (fruit picker by category, gram quantity, live price) | 🔲 |
| Save as draft (private by default, `type: 'custom'`) | 🔲 |
| Publish cocktail (`isPublic: true`) | 🔲 |
| Edit / delete own cocktail | 🔲 |
| Browse public custom cocktails from other users | 🔲 |

---

## Phase 7 — AI analysis (NutriFYS)
> LLM-powered compatibility analysis between cocktail and health profile

| Task | Status |
|---|---|
| Trigger analysis on cocktail finalization (not per-ingredient change) | 🔲 |
| Send fruit nutrients + health profile to Claude API | 🔲 |
| Parse response into `AIAnalysis` (verdict, score, notes) | 🔲 |
| Persist `aiAnalysis` field on cocktail document | 🔲 |
| Verdict badge UI (`beneficial` / `neutral` / `caution` / `not_recommended`) | 🔲 |
| Score progress bar + explanatory notes | 🔲 |
| Fallback analysis when no health profile (fruit-level only) | 🔲 |
| Loading / streaming state during analysis | 🔲 |

---

## Phase 8 — Orders
> Booking and checkout flow

| Task | Status |
|---|---|
| Order a cocktail from catalogue or custom list | 🔲 |
| Order confirmation dialog (price snapshot, NutriFYS summary) | 🔲 |
| Snapshot `totalPrice`, `cocktailPriceSnapshot`, `deliveryFee` at order time | 🔲 |
| "My orders" list with status (`pending` → `confirmed` → `delivered`) | 🔲 |
| Admin — all orders list with status management | 🔲 |
| Admin — order status update | 🔲 |
| Cancel order | 🔲 |
| Firestore service (`src/services/order.ts`) | 🔲 |

---

## Phase 9 — Polish & production
> Cross-cutting concerns before launch

| Task | Status |
|---|---|
| Firestore security rules (per business rules in CLAUDE.md) | 🔲 |
| Firebase custom claims for admin role enforcement | 🔲 |
| Toast notifications for mutations (create, update, delete) | 🔲 |
| Skeleton loaders on all data views | 🔲 |
| Pagination / infinite scroll on list views | 🔲 |
| Real-time updates with Firestore `onSnapshot` where appropriate | 🔲 |
| Search and filter across fruits and cocktails | 🔲 |
| Error boundaries and global error handling | 🔲 |
| Responsive QA (mobile, tablet, desktop) | 🔲 |
| Deployment (Vercel or Netlify) | 🔲 |
