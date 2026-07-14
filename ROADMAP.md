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
| Firestore service `cocktail.ts` (getCocktails, create, update, delete) | ✅ |
| `CocktailFormDrawer` — fruit picker, quantity, live price computation | ✅ |
| Replace mock data with real Firestore reads via React Query | ✅ |
| Activate / deactivate cocktail persisted to Firestore | ✅ |

---

## Phase 5 — Health profile (customer)
> Personalization layer required for meaningful AI analysis

| Task | Status |
|---|---|
| Firestore service (`src/services/profile.ts`) | ✅ |
| Profile store (`src/stores/profile.ts`) + `isProfileComplete` helper | ✅ |
| Duolingo-style 3-step onboarding modal (fullscreen, chip selector, free text) | ✅ |
| Auto-trigger modal on session start when profile is incomplete | ✅ |
| Skip option — dismissed for current session, re-shown next login | ✅ |
| `ProfileCompletionCard` on customer home (banner with CTA) | ✅ |
| `ProfileFloatingButton` — fixed bottom-right with pulse indicator | ✅ |
| Create / update profile in `users/{uid}/profile/main` | ✅ |

---

## Phase 6 — Custom cocktails (customer)
> User-created private cocktails, reuses the cocktail builder

| Task | Status |
|---|---|
| `getUserCocktails(uid)` + `toggleCocktailPublic` in Firestore service | ✅ |
| Lab compose tab — real Fruit data from Firestore (image grid, quantity stepper per fruit) | ✅ |
| Live price computation in lab (base + per-fruit prices) | ✅ |
| Save cocktail as `type: 'custom'`, private by default | ✅ |
| Desktop save panel (name input, price breakdown, save button) | ✅ |
| Mobile bottom bar → Sheet with name input + save | ✅ |
| "Mes Cocktails" page — list view wired to Firestore via React Query | ✅ |
| Publish / unpublish toggle (`isPublic`) from card menu | ✅ |
| Delete own cocktail with confirmation dialog | ✅ |
| Admin redirected to catalogue from cocktails page | ✅ |
| Browse public custom cocktails from other users | 🔲 |
| Edit an existing custom cocktail in the lab | 🔲 |

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
