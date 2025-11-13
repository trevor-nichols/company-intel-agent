# AGENTS.md — Engineering Agent Persona & Operating Guide

## 1) Mission (what you exist to do)

Build a public-ready **Company-Intel Agent** codebase that runs end-to-end:
**map → scrape → structured outputs → overview → SSE → persist → export PDF**
Deliver professional code (strict TS, tests, CI, docs) with **no private deps**.

## 2) Ground rules (non-negotiables)

* **Security:** never commit secrets. Use `.env.example`. Run a secret scan before PR.
* **Module boundaries:** UI ↔ API ↔ Server. The UI never imports server code directly.
* **Streaming:** use **SSE** (`text/event-stream`) with `[DONE]` terminator; follow the event schema.
* **Validation:** all model outputs validated with **zod**; never trust raw JSON.
* **Public-only deps:** replace `@agenai/*` with local **vendor shims** or public libs.
* **Determinism:** small, readable functions; explicit types; no implicit `any`.
* **Observability:** JSON-ish logs for phases; include model/response ids when available.

## 3) References (read before coding)

* `ARCHITECTURE.md` — system map, contracts, SSE schema, ENV. (refer to `docs/ARCHITECTURE.md`)
* `COMPANY_INTEL_EXECUTION_PLAN.md` — milestone tracker (M0–M8), acceptance criteria. (refer to `docs/COMPANY_INTEL_EXECUTION_PLAN.md`)

## 4) Roles (multi-agent persona)

* **Build Agent (TypeScript/Next):** APIs, SSE, wiring, DX.
* **LLM Agent (OpenAI Responses):** structured outputs, streaming parsing, zod. (refer to `docs/openai-node-latest` for documentation)
* **Infra Agent:** persistence (memory + optional Redis), ENV, logging.
* **QA Agent:** tests (unit + SSE contract), CI gates, story sanity.

## 5) What to implement (macro)

1. De-internalize imports (vendor shims)
2. Persistence (memory; Redis optional) + bootstrap factory
3. API routes (+ SSE)
4. Demo page (mount panel)
5. Tests (schemas, SSE, persistence parity)
6. Docs + Storybook sanity
7. CI + secret scan
8. Polish: errors, retries, timeouts, config docs

(Full detail in `COMPANY_INTEL_EXECUTION_PLAN.md` milestones M0–M8.)

## 6) Environment (required keys)

```
OPENAI_API_KEY=
TAVILY_API_KEY=
OPENAI_MODEL_STRUCTURED=gpt-5
OPENAI_MODEL_OVERVIEW=gpt-5
REDIS_URL=
ALLOW_ORIGINS=http://localhost:3000
```

## 7) Public HTTP API (authoritative)

* `GET /api/company-intel`
  → `{ data: { profile, snapshots } }`
* `PATCH /api/company-intel`
  Body subset: `{ overview?, companyName?, tagline?, primaryIndustries?, valueProps?, keyOfferings? }`
* `POST /api/company-intel/preview`
  → `{ data: preview }`
* `POST /api/company-intel`

  * `Accept: text/event-stream` → **SSE stream** (see §8) + final `[DONE]`
  * else `{ data: result }`
* `GET /api/company-intel/snapshots/:id/export` → `application/pdf`

## 8) SSE contract (strict)

Headers:
`Content-Type: text/event-stream` • `Cache-Control: no-cache, no-transform` • `Connection: keep-alive` • `X-Accel-Buffering: no`

Each frame:

```
data: { "type": "<event>", ... }
<blank line>
```

Events (in practice you’ll see a subset, in this order):

* `snapshot-created` `{ status }`
* `status` `{ stage: 'mapping'|'scraping'|'analysis_structured'|'analysis_overview'|'persisting', completed?, total? }`
* `structured-delta` `{ delta, accumulated, summary? }`
* `structured-reasoning-delta` `{ delta, headline? }`
* `structured-complete` `{ payload: { structuredProfile, metadata, faviconUrl?, reasoningHeadline? } }`
* `overview-delta` `{ delta, displayText? }`
* `overview-reasoning-delta` `{ delta, headline? }`
* `overview-complete` `{ overview, headline? }`
* `run-complete` `{ result }`
* `run-error` `{ message }`
* **Terminal:** send `data: [DONE]` and close.

## 9) Persistence contract (default memory, optional Redis)

Implement `CompanyIntelPersistence` with:

* **Profile** (single record)
* **Snapshots** (global newest→oldest list)
* `replaceSnapshotPages(snapshotId, pages[])` writes normalized page records
* Serialize dates to ISO at boundaries; parse on read

Redis keys (optional):
`ci:profile` • `ci:snapshot:<id>` • `ci:snapshots`

## 10) LLM integration (OpenAI Responses)

* Use **Responses API**:

  * **Structured profile:** `CompanyIntelStructuredOutputSchema` (zod)
  * **Overview:** `{ overview: string }` with minimal length in zod
* **Streaming listeners**:

  * `response.output_text.delta` → buffer & attempt parse; emit `*-delta`
  * `response.reasoning_summary_text.delta` → emit `*-reasoning-delta` and build a short headline
* If Responses/zod helper mismatches SDK version, fall back to `response_format: json_schema` and **post-validate** with zod.

## 11) Quality gates (must pass before merge)

* `pnpm typecheck` (strict TS)
* `pnpm lint` (eslint + prettier)
* `pnpm test` (unit + SSE contract)
* `pnpm build`
* `pnpm scan` (gitleaks) — zero findings
* No unresolved `@agenai/*` imports

## 12) Testing scope

* **Schemas/serialization:** happy path + malformed JSON
* **Ranking/selectors:** path depth, host matching, exclusions
* **SSE contract:** order & `[DONE]` terminator; malformed frames fail
* **Persistence parity:** memory vs redis (if enabled)
* **Golden path:** preview → trigger(stream) → snapshot → export

## 13) Logging & errors

* Log phase transitions with `{ snapshotId, domain }`.
* Include `responseId`, `model`, and minimal `usage` in metadata.
* On fatal run error: emit `run-error`, persist snapshot/profile status `failed`, end stream.

## 14) Vendor shims (replace private deps)

* `lib/logging.ts` → `logger.info|warn|error|debug` to `console`
* `lib/config.ts` → `getEnvVar(key) | requireEnvVar(key)`
* `components/ui/*` → public shim for `card, badge, input, button, textarea, tooltip, dialog, separator, avatar, skeleton, scroll-area`, plus `Markdown` (`react-markdown`) and `ShimmeringText` (CSS).

## 15) Command cheat-sheet

```
pnpm i
pnpm dev        # next dev (demo + APIs)
pnpm build      # next build
pnpm start      # next start
pnpm test       # vitest/jest
pnpm lint
pnpm typecheck
pnpm scan       # gitleaks detect --redact
```

## 16) Task handoff protocol (how you work)

1. Read `ARCHITECTURE.md` + `COMPANY_INTEL_EXECUTION_PLAN.md`.
2. Pick next **M#.#** task; open a short worklog in PR description.
3. Keep PRs focused and small; include test(s) and docs as needed.
4. Before push: **typecheck, lint, test, build, scan** locally.
5. Ensure the event stream follows §8 **exactly** (SSE bugs are show-stoppers).

## 17) Definition of Done (project)

* Local demo works: map → select → **live stream** → snapshot persisted → export PDF returns a file.
* Public-only deps, CI green, secret scan clean.
* README practical enough for a new dev to run in **≤5 min**.

---

### Appendix A — Minimal SSE writer (Node runtime, Next.js)

```ts
// stream/route.ts (sketch)
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const server = makeServer(); // from bootstrap
      // subscribe to events:
      server.runCollection(params, {
        onEvent: (e) => send(e)
      })
      .then((res) => { send({ type: 'run-complete', result: res }); send('[DONE]'); controller.close(); })
      .catch((err) => { send({ type: 'run-error', message: String(err?.message ?? err) }); send('[DONE]'); controller.close(); });
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
```

### Appendix B — Structured output enforcement (zod)

```ts
// overview schema
export const CompanyOverviewZ = z.object({ overview: z.string().min(60) }).strict();
// After streaming buffer:
const parsed = CompanyOverviewZ.parse(JSON.parse(buffer));
```
