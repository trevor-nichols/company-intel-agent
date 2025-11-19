# Company-Intel Agent

An end-to-end Next.js agent for building company-intelligence experiences. The app maps a target domain, scrapes high-signal pages, generates structured insights with GPT-5.1 via the OpenAI Responses API, streams progress over Server-Sent Events (SSE), persists the run, and exports a finished PDF. Everything ships with strict TypeScript, deterministic contracts, and public-only dependencies so you can drop it straight into your onboarding flow.

![Company Intel Agent demo UI](docs/assets/media/demo.jpeg)

**What the agent extracts**
- Structured profile with companyName, tagline, up to 10 value props, key offerings (title + optional description), up to 6 primary industries, and page-level source citations so analysts can audit the output.
- Narrative executive overview that streams token-by-token and powers the PDF, dashboard copy, and run summaries.
- Model metadata for both GPT-5.1 runs (responseId, model id, token usage, raw text, reasoning headline/summary) to support observability and incident review.
- Provenance bundle covering sitemap selections, mapped links, raw scrape payloads (markdown/text/media), and the XML snapshot of pages handed to the models.
- Snapshot lifecycle data including run status, stage progress, favicon, timestamps, and counts of successful vs. failed pages for reporting and retries.

## What You Get
- **Full pipeline:** `map → scrape → structured outputs → overview → SSE stream → persist → export PDF` with a demo UI and API surface ready for production.
- **GPT-5.1 structured intelligence:** Dual GPT-5.1 models produce a normalized profile and a narrative overview, validated with Zod before anything is stored or emitted.
- **Streaming UX:** Deterministic SSE frames (`text/event-stream`) let the front end surface deltas, reasoning, and completion status in real time—even if the client reconnects mid-run.
- **Durable runs:** Active collections survive refreshes via a runtime coordinator backed by Redis. Clients can resume a stream or cancel the run with dedicated APIs.
- **Historical snapshots:** Analysts can load any prior completed run back into the editor or chat via the snapshot detail API, hydrate drafts, and re-export PDFs without re-running the pipeline.
- **Swappable persistence:** Choose in-memory for demos, Redis for fast prototyping, or Postgres + Drizzle for production auditing—all wired through the same `CompanyIntelPersistence` interface and selectable via `PERSISTENCE_BACKEND`.
- **Operational guardrails:** JSON-ish logging, configurable origins, secret scanning, strict ESLint/Prettier, Vitest, and CI workflows baked in.

## Quickstart
Prerequisites: Node.js ≥ 20.11, pnpm ≥ 9.

1. Copy the environment template and add your keys:
   ```bash
   cp .env.example .env
   ```
   You must provide `OPENAI_API_KEY` (Responses API) and `TAVILY_API_KEY` to run live collections.
2. Install dependencies and start the dev server:
   ```bash
   pnpm install
   pnpm dev
   ```
3. Visit `http://localhost:3000` to use the demo workflow. By default the app uses in-memory persistence; set `REDIS_URL` to enable Redis-backed storage. For a production build run `pnpm build` followed by `pnpm start`.
4. Launch Storybook (optional) to explore isolated UI states:
   ```bash
   pnpm storybook
   ```
   Storybook runs at `http://localhost:6007` and uses MSW fixtures to simulate streaming states.

### Database Tooling (Postgres milestone)

The Postgres adapter work (MILESTONE_POSTGRES_IMPLEMENTATION) ships with Drizzle migrations so schema changes stay deterministic:

- `pnpm db:generate` — diff `database/schema.ts` into `database/migrations/` (requires `DATABASE_URL` for Drizzle config).
- `pnpm db:migrate` — apply migrations to the database referenced by `DATABASE_URL`.

You only need these when working on the Postgres backend; Redis/memory flows remain unchanged.

### Docker (local Postgres)

Spin up a disposable Postgres the same way CI will run it:

```bash
docker compose up postgres -d
# waits until pg_isready passes, creates companyintel/companyintel db/user mapped to localhost:55432

# Run migrations once the container is healthy
DATABASE_URL=postgres://companyintel:companyintel@localhost:55432/companyintel pnpm db:migrate:docker
```

With that in place you can set `DATABASE_URL` + `PERSISTENCE_BACKEND=postgres` in `.env` and run `pnpm dev` normally.

### Postgres Test Pass

When you want to prove the Postgres adapter matches in-memory behavior, make sure Docker postgres is running (see above) and then run:

```bash
TEST_DATABASE_ALLOW_DROP=true pnpm test:postgres
```

The script defaults `TEST_DATABASE_URL` to `postgres://companyintel:companyintel@localhost:55432/companyintel_test`, aligns `DATABASE_URL` with it, and sets `TEST_DATABASE_ALLOW_DROP=true` so the helper can recreate schemas safely. CI can override `TEST_DATABASE_URL` to its own throwaway DB if needed.

### Syncing Snapshots into Postgres & Downstream Agents

Once Postgres persistence is on, every run populates:

- `company_profiles` — the live profile (company name, tagline, value props, industries, favicon).
- `company_snapshots` — structured summaries, overview text, vector-store metadata, timestamps.
- `company_snapshot_pages` — normalized scrape payloads handed to the LLMs.

Recommended workflow:

1. Set `PERSISTENCE_BACKEND=postgres` and run collections normally.
2. Watch `company_snapshots` for new `status = 'complete'` rows.
3. Sync the relevant JSON fields into your own CRM/agent tables and mark the snapshot as consumed.

Example poller:

```ts
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);
const sinceId = Number(process.env.LAST_SYNCED_SNAPSHOT_ID ?? 0);
const pending = await sql`
  select id, summaries, vector_store_id
  from company_snapshots
  where status = 'complete' and id > ${sinceId}
  order by id asc
`;

for (const snapshot of pending) {
  // hydrate downstream agents (CRM, article writer, etc.)
  process.env.LAST_SYNCED_SNAPSHOT_ID = String(snapshot.id);
}
```

Because the Postgres adapter already normalizes JSON/Zod output, you can reference those fields directly inside other agents (“Resume-ready” talking point: *company intel snapshots stream into Postgres via Drizzle, then hydrate downstream prompts via a background sync job*).

## Using the Feature Package

All UI, server, and API contracts live inside the workspace package `@company-intel/feature` (see `features/company-intel`). You can import the pieces you need without relying on the demo app, then install via npm **or** a local tarball:

```ts
// UI
import { CompanyIntelPanel, CompanyIntelProviders } from '@company-intel/ui/company-intel';

// Server + persistence bootstrap
import { createCompanyIntelEnvironment } from '@company-intel/server/bootstrap';

// HTTP handlers (framework agnostic)
import { handleCompanyIntelGet, handleCompanyIntelPatch } from '@company-intel/feature/api/companyIntelRest';
import { createRunStream } from '@company-intel/feature/api/runStream';
import { createChatStream } from '@company-intel/feature/api/chatStream';

// Next.js adapters (optional)
import { toNextResponse, createSseResponse } from '@company-intel/feature/adapters/next/http';
```

### Configuring env + logging

Call the new config helpers once during bootstrap so the feature never reaches into global `process.env` or console logging implicitly:

```ts
import { configureCompanyIntelFeature, createLogger } from '@company-intel/feature/config';

configureCompanyIntelFeature({
  env: process.env, // replace with your own env loader in serverless contexts
  logger: createLogger({ service: 'my-app' }), // optional
});
```

For finer-grained control (e.g., tests), use `configureCompanyIntelEnv(customSource)` or `configureCompanyIntelLogger(customLogger)` directly.

### Distribution options
- **npm registry (recommended):** `pnpm add @company-intel/feature`. Publish updates with `npm publish --access public` from `features/company-intel`.
- **Tarball / file install:** `pnpm pack --filter @company-intel/feature` produces `company-intel-feature-X.Y.Z.tgz`, which consumers can install via `pnpm add ./company-intel-feature-X.Y.Z.tgz`.
- **Workspace link (monorepo consumers):** add `"@company-intel/feature": "workspace:*"` in your root `package.json`.

The integration steps below are identical regardless of distribution method.

For a detailed integration guide (including server bootstrap, API mounting, and SSE expectations) see [`docs/integration.md`](docs/integration.md).

## Environment

| Variable | Description | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI Responses API key used for both structured profile and overview runs. | — |
| `TAVILY_API_KEY` | Tavily site-mapping and extraction key. | — |
| `TAVILY_EXTRACT_DEPTH` | Default Tavily Extract depth (`basic` or `advanced`). | `basic` |
| `OPENAI_MODEL_STRUCTURED` | GPT-5.1 model id for structured profile output. | `gpt-5.1` |
| `OPENAI_MODEL_OVERVIEW` | GPT-5.1 model id for narrative overview output. | `gpt-5.1` |
| `OPENAI_MODEL_CHAT` | GPT-5.1 model id for the knowledge chat agent. | `gpt-5.1` |
| `STRUCTURED_REASONING_EFFORT` | Default reasoning effort (`low`/`medium`/`high`) for the structured profile agent. | `medium` |
| `OVERVIEW_REASONING_EFFORT` | Default reasoning effort (`low`/`medium`/`high`) for the overview agent. | `medium` |
| `CHAT_REASONING_EFFORT` | Default reasoning effort (`low`/`medium`/`high`) for the snapshot chat agent. | `low` |
| `REDIS_URL` | Optional Redis connection string. When unset, memory persistence is used. | — |
| `DATABASE_URL` | Optional Postgres connection string used by the new Drizzle adapter. Required when `PERSISTENCE_BACKEND=postgres`. | — |
| `PERSISTENCE_BACKEND` | Force a backend (`postgres`, `redis`, or `memory`). Recommended when both `DATABASE_URL` and `REDIS_URL` are set; otherwise the app logs a warning and defaults to Postgres. Defaults to Postgres when only `DATABASE_URL` is set, Redis when only `REDIS_URL` is set, else memory. | — |
| `ALLOW_ORIGINS` | Comma-separated list of allowed origins for downstream clients. | `http://localhost:3000` |

## How It Works

### Flow
1. **Mapping:** Tavily collects candidate URLs for the target domain and ranks them.
2. **Scraping:** High-signal pages are fetched and normalized for downstream processing.
3. **Structured profile:** GPT-5.1 (Responses API) generates a typed company profile using the `CompanyIntelStructuredOutputSchema` and streams partial deltas.
4. **Narrative overview:** A second GPT-5.1 run produces long-form narrative context with reasoning summaries.
5. **Persistence:** Final payloads, snapshots, and page excerpts are stored via the configured `CompanyIntelPersistence` implementation.
6. **Export:** A PDF renderer (React-PDF) builds a branded deliverable available at `/api/company-intel/snapshots/:id/export`.
7. **Durability:** The runtime coordinator keeps the active snapshot id and progress in Redis so clients can resume streaming or cancel mid-run.

### Architecture
Need a visual? Check `docs/ops/workflow.md` for the Mermaid systems diagram that walks through the frontend, API, orchestrator, and RAG subsystems end-to-end.
- **UI (`app/**`, `features/company-intel/src/ui/company-intel/**`):** Next.js App Router screens, TanStack Query providers, and shadcn-style UI shims. UI never imports server code directly; it talks to the API via fetchers in `CompanyIntelClientProvider`.
- **API (`app/api/company-intel/**`):** Route handlers run in the Node.js runtime, coerce HTTP inputs into typed server calls, stream SSE frames, and sanitize responses for the client.
- **Server (`features/company-intel/src/server/**`):** `createCompanyIntelServer` orchestrates the collection workflow, coordinates Tavily/OpenAI integrations, enforces Zod validation, and drives PDF generation.
- **Persistence (`features/company-intel/src/server/persistence/**`):** Memory, Redis, and Postgres adapters all satisfy `CompanyIntelPersistence`, so you can pick your durability story without touching the server or UI layers. Dates are serialized to ISO at boundaries, and `replaceSnapshotPages` keeps page blobs in sync.
- **Runtime coordinator (`features/company-intel/src/server/runtime/**`):** Manages single-flight execution, SSE subscriptions, cancellation, and recovery so runs survive disconnects.
- **Bootstrap (`features/company-intel/src/server/bootstrap.ts`):** `getCompanyIntelEnvironment()` resolves config, logging, persistence, Tavily, and OpenAI clients once per process and caches the singleton.
- **Logging & metrics:** `lib/logging.ts` emits JSON-friendly logs for stage transitions, including model ids, response ids, and usage metadata when available.

### GPT-5.1 Structured Outputs
- Both runs use the OpenAI Responses API with GPT-5.1 models configured through environment variables.
- Structured profile responses stream token-level deltas (`response.output_text.delta`), which are accumulated and validated against the `CompanyIntelStructuredOutputSchema` before persistence or emission.
- Overview responses stream `delta` and `reasoning_summary_text.delta` events; handlers emit `overview-delta` and `overview-reasoning-delta` frames so the UI can present long-form copy and short headlines.
- On any validation failure the run aborts fast, emits a `run-error` SSE event, and the snapshot is marked `failed`.

## API Surface

All routes live under `/api/company-intel` and run on the Node.js runtime.

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/` | Returns `{ data: { profile, snapshots } }` with ISO timestamps.
| `PATCH` | `/` | Applies sanitized updates (`companyName`, `tagline`, `overview`, `primaryIndustries`, `valueProps`, `keyOfferings`).
| `POST` | `/preview` | Maps a domain and returns recommended selections before scraping.
| `POST` | `/` | Triggers a run. **Requires** `Accept: text/event-stream`; the response is an SSE feed that ends with `[DONE]`. Returns `406` if the header is missing and `409` if a run is already active for the domain.
| `GET` | `/runs/:snapshotId/stream` | Reconnects to an active run, replays buffered frames, and resumes the live SSE stream.
| `DELETE` | `/runs/:snapshotId` | Cancels the active run (idempotent). On success the stream emits `run-cancelled` and the snapshot is pruned.
| `GET` | `/snapshots/:id` | Returns a fully serialized snapshot (profile summaries, overview text, scrape stats) so the UI can hydrate historical runs or gate chat readiness.
| `POST` | `/snapshots/:id/chat` | Streams chat completions for a snapshot. **Requires** `Accept: text/event-stream`; responds with `[DONE]` upon completion.
| `GET` | `/snapshots/:id/export` | Generates a PDF export (`Content-Disposition: attachment`).

### SSE Contract

Each frame is emitted as `data: <json>\n\n` and the stream terminates with `data: [DONE]\n\n`.

1. `snapshot-created` `{ status }`
2. `status` `{ stage, completed?, total? }`
3. `structured-delta` `{ delta, accumulated, summary? }`
4. `structured-reasoning-delta` `{ delta, headlines: string[] }`
5. `structured-complete` `{ payload }` (payload metadata includes `reasoningHeadlines: string[]`)
6. `overview-delta` `{ delta, displayText? }`
7. `overview-reasoning-delta` `{ delta, headlines: string[] }`
8. `overview-complete` `{ overview, headlines: string[] }`
9. `vector-store-status` `{ status: 'publishing'|'ready'|'failed', error?, vectorStoreId?, fileCounts? }`
10. `run-complete` `{ result }`
11. `run-error` `{ message }`
12. `run-cancelled` `{ reason? }`
13. `[DONE]`

The UI hooks in `features/company-intel/src/ui/company-intel/hooks` assume this order and will fail fast if malformed frames are encountered.

## Tooling & Quality Gates
- `pnpm lint` — ESLint + Prettier with strict rules for server and client bundles.
- `pnpm typecheck` — `tsc --noEmit` against the entire workspace.
- `pnpm test` — Vitest suites covering serialization, persistence parity, and SSE framing.
- `pnpm build` — `next build` for production bundles.
- `pnpm scan` — gitleaks secret scan (required to be clean before merge).
- `pnpm prune:exports` — runs `ts-prune` with Storybook stories and Next.js entrypoints filtered out so signal focuses on actionable unused exports.

## Limitations & Notes
- Integration tests mock Tavily and OpenAI; real runs require valid API keys.
- Redis persistence uses basic JSON serialization. Add TTLs, indices, or sharding strategies before serving heavy multi-tenant traffic.
- PDF generation runs server-side via `@react-pdf/renderer`. Consider queuing long-running exports in production environments.
