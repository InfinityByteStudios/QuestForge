# Copilot Project Instructions

Purpose: Enable AI coding agents to be productive immediately in this project (QuestForge prototype) by conveying architecture, workflows, and code conventions that are NOT obvious from a single file.

## 🧱 Architecture Overview
- Monorepo style (no workspace config) using TypeScript everywhere.
- Three logical layers:
  1. `shared/` – Cross‑runtime domain types & logic (DB schema via Drizzle, leveling formulas).
  2. `server/` – Express HTTP API (ESM) + in‑memory storage (`MemStorage`) + Vite middleware for dev client serving.
  3. `client/` – React (Vite) app using React Query for data access + lightweight pixel UI components + Radix primitives.
- Data flow: Client -> REST endpoints under `/api/**` -> `storage` abstraction -> in‑memory maps (no persistent DB yet). Some logic (level derivation) lives in `shared/leveling.ts` and must stay isomorphic.

## 🔑 Core Domain Concepts
- Character: progression fields (level, experience, unspentPoints, stats, health/maxHealth), inventory (simple array), equipment (flat keyed object), location (`currentLocationId`).
- CombatSession: ephemeral; only one active per character; stored in memory (Map) and removed on victory/defeat/flee.
- Leveling: Cumulative XP table in `shared/leveling.ts` + helper `applyLevelUps` returning `{ level, statPointsGained }` (3 points / level). Level ups now also: +5 maxHealth per level gained, full heal, +5 gold per level (implemented directly in combat victory handler).
- Training Dummy: Special enemy `training_dummy` – health scales: `30 + (level-1)*10` (capped) and (current logic) deals NO damage (early return before enemy turn). Use this for safe early XP.

## 🧪 Development & Run Workflow
- Dev server: `npm run dev` (runs `tsx server/index.ts`). This spins Express then attaches Vite in middleware mode for the client.
- Production build: `npm run build` (Vite client build + esbuild bundle of server). Start with `npm start`.
- Type checking: `npm run check`.
- No test suite yet; when adding tests prefer colocated `*.test.ts` (currently excluded from build via tsconfig exclude).

## 🗂 Storage Layer (`server/storage.ts`)
- In-memory only; maps per entity type. Adding persistence will require swapping `MemStorage` implementation – avoid leaking direct map usage outside storage class.
- Creating new entity types: Add Drizzle schema in `shared/schema.ts` ONLY if you intend future DB migration; otherwise keep transient types local.

## 🚏 Routes (`server/routes.ts`)
- All REST endpoints registered in `registerRoutes`.
- Pattern: parse / validate input with zod schema from `@shared/schema` (only some endpoints currently do strict parsing – follow that pattern when adding new endpoints).
- Combat flow:
  1. POST `/api/characters/:id/combat/start` – creates session, applies scaling (dummy only).
  2. POST `/api/characters/:id/combat/action` – resolves player action, checks victory, then (unless dummy) resolves enemy turn.
  3. Victory path: apply XP, run `applyLevelUps`, augment with health/maxHealth/gold adjustments, return updated character inline so client can optimistically sync.

## 🎮 Client Patterns
- Data fetching: React Query. Query keys are simple arrays using REST path fragments (e.g., `['/api/characters', id]`). When mutating combat victory, code directly seeds updated character with `queryClient.setQueryData` to avoid flicker.
- Global game state: `contexts/GameContext.tsx` holds selected character id and action log aggregator.
- UI components: Basic set under `client/src/components/ui` (Radix wrappers + Tailwind classes). Reuse rather than re‑implement (e.g., `Button`, `Dialog`, `Toast`).
- Level-up UX: Toast emitted in `CombatPanel` when new character level > cached previous (calculate diff for stat point + HP change).

## 🧮 Level & XP Logic
- XP table is cumulative. Always derive level with `levelFromExperience` if you need to validate server data.
- When adding new XP sources: ALWAYS funnel through a central adjustment (consider extracting reward util from combat if more systems appear).
- Stat points: `unspentPoints` increments only through `applyLevelUps` path; client allocation (not shown here) sends PATCH updates to `/api/characters/:id` (pattern to follow for new stat usages).

## 🛡 Combat Damage Rules
- Player attack formulas live inline in route (not yet modularized). If refactoring, create `server/combat/` directory with pure functions (e.g., `computePlayerDamage`, `computeEnemyDamage`, `startSession`). Keep them deterministic (inject RNG for testability later).
- Training dummy bypass: early return BEFORE enemy turn. Maintain this ordering if inserting middleware logic.

## ⚙️ Conventions & Style
- Use ESM imports everywhere (`type` imports for types to keep bundler fast).
- Path aliases: `@shared/*` and `@/*` configured in `tsconfig.json`.
- Keep shared pure logic (no side effects, no Express) inside `shared/` so it can be reused by future edge runtimes.
- Avoid adding business logic inside React components when it could reside in shared utilities (exception: quick UI-only derivations).

## ➕ Adding Features Safely
1. Define types (shared) if needed across client+server.
2. Extend storage API (add interface method) before using new map directly.
3. Add route + zod schema (validate input early, return minimal shape).
4. On client: create React Query hook (stable key) + minimal optimistic update if necessary.
5. Provide immediate visual feedback (toast/log) – action log is the fallback.

## 🐛 Debugging Tips
- Server request logging middleware truncates JSON > ~80 chars; inspect network tab for full payload.
- If level display looks stale: ensure cache updated; check server auto-correct logic in GET character route.
- Dev crash on Windows often due to unsupported socket reuse; handled already (see `server/index.ts`).

## 🚫 Anti-Patterns To Avoid
- Duplicating leveling math on client without using shared functions.
- Reaching into `storage` internal Maps outside `storage.ts`.
- Creating circular imports between `shared/` and `server/`.
- Silent mutation of character stats without also updating `unspentPoints` logic.

## 📌 Quick Reference
- Start dev: `npm run dev`
- Build: `npm run build`
- Level calc: `levelFromExperience(experience)`
- XP gain path today: ONLY combat victory.
- Special enemy id flags: `training_dummy`.

---
Questions or improvement ideas? Add them below or open an issue titled "Agent Instruction Update". Stay organized! If a new feature that's not already in the codebase make a new file for it
