# Backend Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Supervisore Vendite from browser-side Gemini/in-memory CRM to a local Express backend with Supabase persistence and a frontend API boundary.

**Architecture:** The frontend calls `VITE_API_URL` through `src/lib/api.ts`. Express owns AI calls, Supabase access, validation, and fallback in-memory storage for local development without credentials. Supabase schema is documented in SQL so Andrea can create the tables manually.

**Tech Stack:** React 19, Vite, TypeScript, Express, Supabase JS v2, Ollama HTTP API, Vitest.

---

### Task 1: Test Harness And Type Boundaries

**Files:**
- Modify: `package.json`
- Create: `src/lib/types.ts`
- Create: `src/lib/normalize.test.ts`

- [x] Add Vitest and scripts.
- [x] Extract shared CRM and analysis types from `App.tsx`.
- [x] Write failing tests for clamping CRM probability and defaulting missing arrays.

### Task 2: Backend API

**Files:**
- Create: `server/index.ts`
- Create: `server/lib/ollama.ts`
- Create: `server/lib/salesPrompts.ts`
- Create: `server/lib/storage.ts`
- Create: `server/lib/normalize.ts`
- Create: `server/lib/normalize.test.ts`

- [x] Write failing backend normalization tests.
- [x] Add Express routes for health, guidelines, analyze, CRM, and knowledge base.
- [x] Add Supabase service-role storage with in-memory fallback.
- [x] Add Ollama JSON generation with defensive parsing.

### Task 3: Frontend API And Supabase Flow

**Files:**
- Create: `src/lib/api.ts`
- Create: `src/lib/normalize.ts`
- Modify: `src/App.tsx`
- Delete: `src/lib/gemini.ts`

- [x] Replace direct Gemini calls with backend API calls.
- [x] Load knowledge base and CRM records on startup.
- [x] Save knowledge base after document generation.
- [x] Save CRM records through backend after analysis.
- [x] Fix file upload TypeScript error.

### Task 4: Environment, Schema, Docs, Verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Create: `supabase/schema.sql`

- [x] Document frontend/backend env vars.
- [x] Add Supabase table creation SQL.
- [x] Run `npm test`, `npm run lint`, `npm run build`.
