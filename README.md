# Company-Intel Starter

An end-to-end Next.js starter for building company-intelligence experiences. The app maps a target domain, scrapes high-signal pages, generates structured insights with GPT-5 via the OpenAI Responses API, streams progress over Server-Sent Events (SSE), persists the run, and exports a finished PDF. Everything ships with strict TypeScript, deterministic contracts, and public-only dependencies so you can drop it straight into your onboarding flow.

## What You Get
- **Full pipeline:** `map → scrape → structured outputs → overview → SSE stream → persist → export PDF` with a demo UI and API surface ready for production.
- **GPT-5 structured intelligence:** Dual GPT-5 models produce a normalized profile and a narrative overview, validated with Zod before anything is stored or emitted.
- **Streaming UX:** Deterministic SSE frames (`text/event-stream`) let the front end surface deltas, reasoning, and completion status in real time.
- **Swappable persistence:** In-memory storage by default with a Redis implementation that satisfies the same `CompanyIntelPersistence` interface.
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

## Environment

| Variable | Description | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI Responses API key used for both structured profile and overview runs. | — |
| `TAVILY_API_KEY` | Tavily site-mapping and extraction key. | — |
| `OPENAI_MODEL_STRUCTURED` | GPT-5 model id for structured profile output. | `gpt-5` |
| `OPENAI_MODEL_OVERVIEW` | GPT-5 model id for narrative overview output. | `gpt-5` |
| `REDIS_URL` | Optional Redis connection string. When unset, memory persistence is used. | — |
| `ALLOW_ORIGINS` | Comma-separated list of allowed origins for downstream clients. | `http://localhost:3000` |

## How It Works

### Flow
1. **Mapping:** Tavily collects candidate URLs for the target domain and ranks them.
2. **Scraping:** High-signal pages are fetched and normalized for downstream processing.
3. **Structured profile:** GPT-5 (Responses API) generates a typed company profile using the `CompanyIntelStructuredOutputSchema` and streams partial deltas.
4. **Narrative overview:** A second GPT-5 run produces long-form narrative context with reasoning summaries.
5. **Persistence:** Final payloads, snapshots, and page excerpts are stored via the configured `CompanyIntelPersistence` implementation.
6. **Export:** A PDF renderer (React-PDF) builds a branded deliverable available at `/api/company-intel/snapshots/:id/export`.

### Architecture
- **UI (`app/**`, `components/company-intel/**`):** Next.js App Router screens, TanStack Query providers, and shadcn-style UI shims. UI never imports server code directly; it talks to the API via fetchers in `CompanyIntelClientProvider`.
- **API (`app/api/company-intel/**`):** Route handlers run in the Node.js runtime, coerce HTTP inputs into typed server calls, stream SSE frames, and sanitize responses for the client.
- **Server (`server/**`):** `createCompanyIntelServer` orchestrates the collection workflow, coordinates Tavily/OpenAI integrations, enforces Zod validation, and drives PDF generation.
- **Persistence (`server/persistence/**`):** Memory and Redis backends implement `CompanyIntelPersistence`, serializing dates to ISO at module boundaries and supporting snapshot/page replacement.
- **Bootstrap (`server/bootstrap.ts`):** `getCompanyIntelEnvironment()` resolves config, logging, persistence, Tavily, and OpenAI clients once per process and caches the singleton.
- **Logging & metrics:** `lib/logging.ts` emits JSON-friendly logs for stage transitions, including model ids, response ids, and usage metadata when available.

### GPT-5 Structured Outputs
- Both runs use the OpenAI Responses API with GPT-5 models configured through environment variables.
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
| `POST` | `/` | Triggers a run. JSON clients receive `{ data: result }`. Clients that send `Accept: text/event-stream` receive streamed frames ending with `[DONE]`.
| `GET` | `/snapshots/:id/export` | Generates a PDF export (`Content-Disposition: attachment`).

### SSE Contract

Each frame is emitted as `data: <json>\n\n` and the stream terminates with `data: [DONE]\n\n`.

1. `snapshot-created` `{ status }`
2. `status` `{ stage, completed?, total? }`
3. `structured-delta` `{ delta, accumulated, summary? }`
4. `structured-reasoning-delta` `{ delta, headline? }`
5. `structured-complete` `{ payload }`
6. `overview-delta` `{ delta, displayText? }`
7. `overview-reasoning-delta` `{ delta, headline? }`
8. `overview-complete` `{ overview, headline? }`
9. `run-complete` `{ result }`
10. `run-error` `{ message }`
11. `[DONE]`

The UI hooks in `components/company-intel/hooks` assume this order and will fail fast if malformed frames are encountered.

## Tooling & Quality Gates
- `pnpm lint` — ESLint + Prettier with strict rules for server and client bundles.
- `pnpm typecheck` — `tsc --noEmit` against the entire workspace.
- `pnpm test` — Vitest suites covering serialization, persistence parity, and SSE framing.
- `pnpm build` — `next build` for production bundles.
- `pnpm scan` — gitleaks secret scan (required to be clean before merge).

## Limitations & Notes
- Integration tests mock Tavily and OpenAI; real runs require valid API keys.
- Redis persistence uses basic JSON serialization. Add TTLs, indices, or sharding strategies before serving heavy multi-tenant traffic.
- PDF generation runs server-side via `@react-pdf/renderer`. Consider queuing long-running exports in production environments.

