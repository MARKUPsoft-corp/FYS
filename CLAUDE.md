# FYS (For Your Self) — Project context

## Overview

FYS is a fruit cocktail booking application powered by AI-based health
recommendations. Users mix fruits into custom cocktails, and an AI engine
analyzes whether the mix is beneficial or risky based on the user's health
profile (conditions, allergies, goals) and the nutritional benefits/warnings
of each fruit.

## Tech stack

- Frontend: Rasengan.js (custom React-based framework built by the project
  owner)
- Backend / data: Firebase (Authentication + Firestore)
- AI: LLM-based analysis for fruit-mix / health-profile compatibility

## MVP modules

1. User management — account + health profile (conditions, allergies, goals)
2. Auth module — Firebase Authentication (email, phone, or social sign-in)
3. Fruit management — fruit catalog grouped by category, with nutrition data
4. Cocktail management — catalog cocktails (admin-created) and custom
   cocktails (user-created)
5. Order management — booking and checkout of cocktails

## Core user flow

1. **Sign up** via Firebase Auth.
2. **Health profile setup** (optional but encouraged) — conditions,
   allergies, goals. Skipping this means the AI analysis stays generic
   (fruit-level benefits/warnings only, no personalization).
3. **Build a cocktail** — pick fruits by category, set quantity in grams per
   fruit. Price is computed live from `pricePerGram` per fruit.
4. **AI analysis** — triggered once the user finalizes the mix (not on every
   fruit add/remove, to limit API calls and latency). Produces a verdict
   (`beneficial` / `neutral` / `caution` / `not_recommended`), a score, and
   explanatory notes.
5. **Save** — the cocktail is stored as `custom` type, private by default.
   The user can choose to publish it (`isPublic: true`) so others can see
   and order it.
6. **Order** — saving a cocktail and ordering it are separate actions. A
   user can keep drafts without ever ordering them.

## Data model

Canonical TypeScript types live in `fys-data-model.ts`. Summary:

- `User` — `users/{uid}`, role is `customer` or `admin` (role enforced via
  Firebase custom claims, not stored permissions logic).
- `HealthProfile` — `users/{uid}/profile/main`, one profile per user.
- `Fruit` — `fruits/{id}`, includes `pricePerGram`, `benefits`, `warnings`,
  `nutrients`, and `categoryIds` (many-to-many with categories).
- `Category` — `categories/{id}`.
- `Cocktail` — `cocktails/{id}`. Distinguishes `type: 'catalog'` (admin-only
  write) from `type: 'custom'` (user-created). Ingredients are embedded
  directly on the document (`ingredients: CocktailIngredient[]`) with a
  snapshotted `pricePerGramSnapshot` to avoid retroactive price changes.
  The AI result is embedded as `aiAnalysis` (optional — absent until the
  analysis completes).
- `Order` — `orders/{id}`. References `userId` and `cocktailId`, with a
  snapshotted `totalPrice` and `cocktailNameSnapshot`.

## Business rules to respect

- Only users with `role: 'admin'` (Firebase custom claim) may create or
  edit `Cocktail` documents where `type === 'catalog'`.
- Any authenticated user may create `Cocktail` documents where
  `type === 'custom'`, but may only write to their own documents
  (`createdBy === request.auth.uid`).
- Prices are always snapshotted at creation/order time — never recompute
  historical prices when a fruit's `pricePerGram` changes later.
- `HealthProfile` documents are only readable/writable by their owner.
- `isActive: false` on a `Cocktail` removes it from active listings without
  deleting order history that references it.

## Conventions

- Firestore collection names and document ID conventions are defined in
  `fys-data-model.ts` (`COLLECTIONS` constant) — reuse these rather than
  hardcoding collection path strings.
- Use Firestore `Timestamp` (not JS `Date`) for all datetime fields, matching
  the data model.
- When adding new Firestore-backed features, extend the types in
  `fys-data-model.ts` first, then implement the read/write logic against
  those types.