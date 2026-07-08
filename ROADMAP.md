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
| Tailwind CSS v4 + theme (light/dark) | ✅ |
| UI component library (Radix + shadcn-style) | ✅ |
| Data model — entities & Firestore constants | ✅ |
| Firebase project setup | ✅ |

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
| Mobile bottom tab bar | ✅ |
| Role-based navigation data (`customer` vs `admin`) | ✅ |
| Home dashboard — Admin view (stat cards, quick actions) | ✅ |
| Home dashboard — Customer view (proposals, CTA banner) | ✅ |
| Stub pages for all nav routes | ✅ |

---

## Phase 3 — Fruits & Categories (admin)
> Foundational catalog — required before cocktails or AI analysis

| Task | Status |
|---|---|
| Category list view (admin) | 🔲 |
| Create / edit / delete category | 🔲 |
| Fruit list view with category filter (admin) | 🔲 |
| Create / edit fruit (name, price/gram, nutrients, benefits, warnings, image) | 🔲 |
| Assign fruit to categories (many-to-many) | 🔲 |
| Delete / deactivate fruit | 🔲 |
| Firestore read/write service (`src/services/fruit.ts`, `category.ts`) | 🔲 |

---

## Phase 4 — Health profile (customer)
> Personalization layer required for meaningful AI analysis

| Task | Status |
|---|---|
| Health profile form (conditions, allergies, goals) | 🔲 |
| Create / update profile in `users/{uid}/profile/main` | 🔲 |
| Profile completion indicator on dashboard | 🔲 |
| Skip option with fallback to generic AI analysis | 🔲 |
| Firestore service (`src/services/profile.ts`) | 🔲 |

---

## Phase 5 — Catalogue cocktails (admin)
> Admin-created cocktails visible to all customers

| Task | Status |
|---|---|
| Cocktail list view — catalogue (admin) | 🔲 |
| Cocktail builder — fruit picker by category, gram quantity | 🔲 |
| Live total price computation from `pricePerGram` | 🔲 |
| Snapshotted `pricePerGramSnapshot` on save | 🔲 |
| Activate / deactivate cocktail (`isActive`) | 🔲 |
| Cocktail detail page (ingredients, price, AI badge) | 🔲 |
| Firestore service (`src/services/cocktail.ts`) | 🔲 |

---

## Phase 6 — Custom cocktails (customer)
> User-created private cocktails, reuses the cocktail builder

| Task | Status |
|---|---|
| "Mes cocktails" list view | 🔲 |
| Cocktail builder (same UI as admin, scoped to `createdBy === uid`) | 🔲 |
| Save as draft (private by default) | 🔲 |
| Publish cocktail (`isPublic: true`) | 🔲 |
| Edit / delete own cocktail | 🔲 |
| Browse public custom cocktails from other users | 🔲 |

---

## Phase 7 — AI analysis (NutriFYS)
> LLM-powered compatibility analysis between cocktail and health profile

| Task | Status |
|---|---|
| Trigger analysis on cocktail finalization (not per-ingredient edit) | 🔲 |
| Send fruit nutrients + health profile to LLM endpoint | 🔲 |
| Parse response into `AIAnalysis` (verdict, score, notes) | 🔲 |
| Persist `aiAnalysis` field on cocktail document | 🔲 |
| Display verdict badge (`beneficial` / `neutral` / `caution` / `not_recommended`) | 🔲 |
| Score progress bar + explanatory notes UI | 🔲 |
| Fallback analysis when no health profile (fruit-level only) | 🔲 |
| Loading state during analysis (async) | 🔲 |

---

## Phase 8 — Orders
> Booking and checkout flow

| Task | Status |
|---|---|
| Order a cocktail from catalogue or custom cocktails | 🔲 |
| Order confirmation dialog (price snapshot, NutriFYS summary) | 🔲 |
| Snapshot `totalPrice` and `cocktailNameSnapshot` at order time | 🔲 |
| "Mes commandes" list with status (`pending` → `confirmed` → `delivered`) | 🔲 |
| Admin — all orders list with status management | 🔲 |
| Order status update (admin action) | 🔲 |
| Cancel order (`cancelled` status) | 🔲 |
| Firestore service (`src/services/order.ts`) | 🔲 |

---

## Phase 9 — Polish & production
> Cross-cutting concerns before launch

| Task | Status |
|---|---|
| Firestore security rules (per business rules in CLAUDE.md) | 🔲 |
| Firebase custom claims for admin role enforcement | 🔲 |
| Image upload for fruits and cocktails (Firebase Storage) | 🔲 |
| Pagination / infinite scroll on list views | 🔲 |
| Search and filter across fruits and cocktails | 🔲 |
| Error boundaries and global error handling | 🔲 |
| Empty states and skeleton loaders on all data views | 🔲 |
| Responsive QA (mobile, tablet, desktop) | 🔲 |
| Deployment (Vercel or Netlify) | 🔲 |
