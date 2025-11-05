# Company-Intel Starter — Execution Plan & Tracker

> Purpose: turn this extracted package into a professional, public-ready TypeScript codebase with clean APIs, SSE streaming, optional Redis, and a minimal demo UI.  
> Owner: _______   •   Repo: _______   •   Date: _______

---

## 0) Status Legend

- ☐ Not started  •  ◐ In progress  •  ☐🚧 Blocked  •  ✅ Done

---

## 1) Non-Negotiables (Goals)

- ✅ End-to-end **map → scrape → structured outputs → overview → SSE → persist**.
- ✅ No private deps (no `@agenai/*`). Provide local shims or public packages only.
- ✅ Minimal **Next.js App Router** API with **SSE**; one demo page; works on `pnpm dev`.
- ✅ **Memory** persistence by default; **Redis** optional via `REDIS_URL`.
- ✅ Clean **env** handling; no secrets committed; **gitleaks** clean.
- ✅ Tests: unit + a streaming contract test; CI runs **typecheck, lint, test, build**.
- ✅ README with quickstart + event contract + diagram.

---

## 2) Architecture Snapshot

- **UI**: `CompanyIntelPanel` (already present) + provider → calls API
- **API** (Next.js App Router):
  - `GET /api/company-intel` → profile + snapshots
  - `POST /api/company-intel/preview` → preview map
  - `POST /api/company-intel` (+ `Accept: text/event-stream`) → **SSE**
  - `GET /api/company-intel/snapshots/:id/export` → PDF
- **Server**: `createCompanyIntelServer()` (OpenAI + Tavily + persistence)
- **Persistence**: memory (default) / redis (optional)
- **Agents**: Structured profile (zod), Overview (zod), both via OpenAI Responses streaming

---

## 3) Milestones

- **M0**: Project setup & de-internalize imports  
- **M1**: Persistence (memory) + bootstrap  
- **M2**: API routes + **SSE** streaming  
- **M3**: Demo page wiring (panel works E2E)  
- **M4**: Optional Redis impl + toggle  
- **M5**: Tests (unit + SSE contract)  
- **M6**: Docs & Storybook sanity  
- **M7**: CI (typecheck, lint, test, build), secrets scan  
- **M8**: Polish (logs, errors, timeouts, config)

---

## 4) Task Board (IDs, deps, acceptance)

### M0 — Setup & De-internalize

- ✅ **M0.1** Add vendor shims  
  **Files**: `lib/logging.ts`, `lib/config.ts`  
  **Acceptance**: `@agenai/logging` and `@agenai/config` resolve to these shims and compile.

- ✅ **M0.2** UI shim mapping  
  **Files**: `components/ui/{card.tsx,badge.tsx,input.tsx,button.tsx,textarea.tsx,tooltip.tsx,dialog.tsx,separator.tsx,avatar.tsx,skeleton.tsx,scroll-area.tsx,index.ts}`, plus `MinimalMarkdown` (react-markdown) and `ShimmeringText` (CSS)  
  **Acceptance**: all `@agenai/ui/*` imports compile without changes in client code.

- ✅ **M0.3** TS config & paths  
  **Files**: `tsconfig.json` (paths for `@agenai/*` and `@/*`)  
  **Acceptance**: `pnpm typecheck` passes.

- ✅ **M0.4** Package scaffolding  
  **Files**: `package.json`, `.env.example`, `next.config.js`, `postcss.config.js`, `tailwind.config.js`, `app/globals.css`  
  **Acceptance**: `pnpm dev` serves Next.js.

### M1 — Persistence (Memory) & Bootstrap

- ✅ **M1.1** Memory persistence  
  **Files**: `server/persistence/memory.ts` implementing `CompanyIntelPersistence`  
  **Acceptance**: create/update/list/get works; snapshots and profiles persist during process lifetime.

- ✅ **M1.2** Bootstrap factory  
  **Files**: `server/bootstrap.ts`  
  **Logic**: instantiate OpenAI/Tavily clients + memory persistence; return `createCompanyIntelServer(...)`  
  **Acceptance**: server object returned with all methods callable.

### M2 — API Routes & SSE

- ✅ **M2.1** GET + PATCH + POST[SSE]  
  **Files**:  
  - `app/api/company-intel/route.ts`  
  - `app/api/company-intel/preview/route.ts`  
  - `app/api/company-intel/snapshots/[id]/export/route.ts`  
  **Acceptance**:  
  - GET returns `{ data: { profile, snapshots } }`  
  - PATCH updates profile fields (trimmed + sanitized)  
  - POST preview returns domain map + selections  
  - POST with `Accept: text/event-stream` streams **status/structured-delta/overview-delta/…/run-complete** with final `[DONE]` frame  
  - Export returns `application/pdf` with filename header

- ✅ **M2.2** SSE correctness  
  **Headers**: `text/event-stream`, `no-cache`, `keep-alive`, `X-Accel-Buffering: no`  
  **Frames**: `data: <json>\n\n` ; final `data: [DONE]\n\n`  
  **Acceptance**: client hook receives events and updates UI live.

### M3 — Demo Wiring

- ✅ **M3.1** Demo page  
  **Files**: `app/page.tsx`  
  **Logic**: wrap `CompanyIntelPanel` with `CompanyIntelProviders teamId={1}` to supply query + client context  
  **Acceptance**: manual flow works in browser (map → select → stream → snapshot).

### M4 — Redis (Optional Toggle)

- ✅ **M4.1** Redis persistence  
  **Files**: `server/persistence/redis.ts` (use `ioredis`)  
  **Keys**: `ci:profile:<teamId>`, `ci:snapshot:<id>`, `ci:snapshots:byTeam:<teamId>`  
  **Acceptance**: setting `REDIS_URL` switches to Redis; parity with memory in basic tests.

### M5 — Tests

- ✅ **M5.1** Unit: serialization & agents  
  **Files**: `tests/serialization.test.ts`, `tests/agents-guards.test.ts`  
  **Acceptance**: zod schemas validate; parsing functions behave on happy + edge cases.

- ✅ **M5.2** SSE contract test  
  **Files**: `tests/sse-contract.test.ts`  
  **Method**: start route handler in-memory (Next test utils or node fetch mock), feed a fake emitter, assert event order & `[DONE]`.  
  **Acceptance**: test fails on malformed frames or missing terminal.

- ✅ **M5.3** Persistence parity (memory vs redis)  
  **Files**: `tests/persistence-parity.test.ts`  
  **Acceptance**: same behaviors for create/update/list/get.

### M6 — Docs & Storybook

- ✅ **M6.1** README  
  **Content**: quickstart, env vars, endpoints, SSE contract, architecture diagram (Mermaid), limitations.  
  **Acceptance**: a new contributor can run in 5 minutes.

- ✅ **M6.2** Storybook minimal run  
  **Acceptance**: `pnpm storybook` renders existing stories using local UI shims.

### M7 — CI & Security

- ✅ **M7.1** CI workflow  
  **Files**: `.github/workflows/ci.yml` with `pnpm i`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`  
  **Acceptance**: PRs must pass CI.

- ✅ **M7.2** Secret scan  
  **Files**: `gitleaks.toml` (optional), workflow step `gitleaks`  
  **Acceptance**: clean run; no `.env*` committed; repo ignores secrets.

### M8 — Polish & Ops

- ✅ **M8.1** Logs & errors  
  **Acceptance**: consistent JSON-ish logs in server; errors return structured bodies; SSE route catches and streams `run-error`.

- ✅ **M8.2** Timeouts & retries  
  **Acceptance**: Tavily has rate-limit backoff; OpenAI client has sane `timeout` & `maxRetries`; POST trigger can’t hang forever.

- ✅ **M8.3** Config docs  
  **Acceptance**: `.env.example` documents all keys with defaults.

---

## 5) API & Event Contracts (source of truth)

**Endpoints**
- `GET /api/company-intel` → `{ data: { profile, snapshots } }`
- `PATCH /api/company-intel` → `{ data: profile }`
- `POST /api/company-intel/preview` → `{ data: preview }`
- `POST /api/company-intel`  
  - **SSE** if `Accept: text/event-stream`, else `{ data: result }`
- `GET /api/company-intel/snapshots/:id/export` → **PDF**

**SSE Frames** (each line = `data: <json>`; blank line between frames)
- `snapshot-created`
- `status` `{ stage: 'mapping'|'scraping'|'analysis_structured'|'analysis_overview'|'persisting', completed?, total? }`
- `structured-delta` `{ delta, accumulated, summary? }`
- `structured-reasoning-delta` `{ delta, headline? }`
- `structured-complete` `{ payload: { structuredProfile, metadata, faviconUrl?, reasoningHeadline? } }`
- `overview-delta` `{ delta, displayText? }`
- `overview-reasoning-delta` `{ delta, headline? }`
- `overview-complete` `{ overview, headline? }`
- `run-complete` `{ result }`
- `run-error` `{ message }`
- Terminal: `[DONE]`

---

## 6) Environment

```

OPENAI_API_KEY=
TAVILY_API_KEY=
OPENAI_MODEL_STRUCTURED=gpt-5
OPENAI_MODEL_OVERVIEW=gpt-5
REDIS_URL=
ALLOW_ORIGINS=[http://localhost:3000](http://localhost:3000)

```

---

## 7) Quality Gates (PR must pass)

- Typecheck (tsc) ✅
- ESLint + Prettier ✅
- Unit tests + SSE contract ✅
- Build ✅
- gitleaks ✅
- No `@agenai/*` unresolved imports ✅

---

## 8) Risks / Gotchas

- OpenAI SDK **Responses** API version drift → pin known-good version.
- SSE buffering (proxies) → send `X-Accel-Buffering: no` and avoid big chunking.
- Streaming JSON fragments → only emit validated sections or buffered text; don’t send malformed JSON to UI.
- Redis JSON size/TTL → if added, consider TTL or pagination later.

---

## 9) Agent Working Rules (for prompts)

- Never commit `.env*` or secrets; always create `.env.example`.
- If a task needs private deps, **replace with vendor shim**.
- Keep changes in small commits; reference task IDs (e.g. `M2.1`).
- On SSE, always send `[DONE]` at end or an `run-error` first.
- Prefer clarity over cleverness; minimal deps.

---

## 10) Command Cheatsheet

```

pnpm i
pnpm dev        # next dev
pnpm build      # next build
pnpm start      # next start
pnpm storybook  # optional
pnpm test       # vitest or jest
pnpm lint       # eslint
pnpm typecheck  # tsc --noEmit
pnpm scan       # gitleaks detect --redact

```

---

## 11) Definition of Done (Project)

- Demo runs locally without private deps.
- SSE stream renders in panel; final snapshot persists; export PDF works.
- README is newcomer-friendly; CI green; secret scan clean.
- Memory store default; Redis optional with parity tests.

```
