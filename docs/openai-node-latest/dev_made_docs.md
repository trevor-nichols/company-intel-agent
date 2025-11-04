# OpenAI TypeScript SDK — **Responses & Input Items** (Developer Guide)

This guide documents the `responses` resource and its related `inputItems` sub-resource as implemented in the TypeScript SDK excerpt you provided. It also covers SDK behaviors demonstrated in the tests: typed promises, request IDs, streaming, and structured outputs with Zod.

---

## Quickstart

```ts
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Create a response and read the final text
const resp = await client.responses.create({ model: 'gpt-5', input: 'Say hello world' });
console.log(resp.output_text); // "Hello world"
```

---

## Package Exports (from the snippet)

```ts
// exports
export { InputItems, type ResponseItemList, type InputItemListParams } from './input-items';
export { Responses } from './responses';
```

* **`Responses`**: main resource for creating/retrieving/canceling/deleting responses.
* **`InputItems`**: sub-resource for listing the **input items** used to generate a given response.

---

## Client Initialization

```ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'My API Key',
  // Optional: custom base URL for tests/dev
  baseURL: process.env['TEST_API_BASE_URL'] ?? 'http://127.0.0.1:4010',
});
```

---

## Responses — Core Operations

### Create

```ts
const p = client.responses.create({ model: 'gpt-5', input: 'Say hello world' });

const raw = await p.asResponse();        // native Fetch Response
const data = await p;                    // parsed SDK object
const both = await p.withResponse();     // { data, response, request_id }

console.log(data.output_text);
console.log(both.request_id);            // 'x-request-id' header passthrough
```

### Retrieve

```ts
const resp = await client.responses.retrieve('resp_123');
console.log(resp.output_text);
```

### Cancel / Delete

```ts
await client.responses.cancel('resp_123');
await client.responses.delete('resp_123');
```

> **Errors**
> The SDK throws typed errors (e.g., `OpenAI.NotFoundError`) when the server returns an error.

---

## Streaming Responses

High-level streaming lets you subscribe to deltas and then await a consolidated final object:

```ts
const stream = await client.responses.stream({
  model: 'gpt-5',
  input: 'Say hello world',
});

stream.on('response.output_text.delta', (e) => {
  // e.snapshot is a running snapshot of the output_text
  console.log('delta snapshot:', e.snapshot);
});

const final = await stream.finalResponse();
console.log(final.output_text); // "Hello world"
```

**Reasoning models**

```ts
const s = await client.responses.stream({
  model: 'gpt-5',
  input: 'Compute 6 * 7',
  reasoning: { effort: 'medium' },
});

const final = await s.finalResponse();
// final.output[0] may contain reasoning segments
// final.output[1] is typically the assistant message
console.log(final.output_text); // "The answer is 42"
```

> **Event names**
> The tests demonstrate `.on('response.output_text.delta', ...)`. Additional events may be available in your SDK version (e.g., for tool calls, messages, etc.). Use `.on('<event>', handler)` with the event names your SDK emits.

---

## Request IDs (`x-request-id`) & Typed Promises

The SDK wraps fetch calls in an **`APIPromise<T>`** with a few niceties:

* **`.asResponse()`** → returns the raw `Response` (Fetch API).
* **`.withResponse()`** → returns `{ data: T, response: Response, request_id?: string }`.
* When the **parsed value is an object**, the SDK **augments** it with a **`_request_id?: string`** derived from the `x-request-id` header.
* When the parsed value is a **string, array, or page object**, `_request_id` is **not** attached.

Examples (mirroring the tests):

```ts
// object body → `_request_id` present
const obj = await client.chat.completions.create({ model: 'gpt-5', messages: [] });
console.log(obj._request_id); // e.g., 'req_id_xxx'

// array body → no `_request_id`
const arr = await someArrayReturningCall();
console.log((arr as any)._request_id); // undefined

// string body → no `_request_id`
const text = await someStringReturningCall();
console.log((text as any)._request_id); // undefined

// pages (cursor pages) → `_request_id` not attached to the page
const page = await client.fineTuning.jobs.list();
console.log((page as any)._request_id); // undefined
```

Type checks shown in tests ensure `APIPromise<T>` resolves to `T` exactly, preserving your types.

---

## Input Items — List the Inputs Used for a Response

### What it is

Each `response` can include multiple **input items** (e.g., prompt parts, files, tools). The `inputItems` resource lets you list them.

### API

```ts
class InputItems extends APIResource {
  list(
    responseID: string,
    query?: InputItemListParams,          // optional
    options?: RequestOptions,             // optional request overrides
  ): PagePromise<ResponseItemsPage, ResponsesAPI.ResponseItem>
}
```

**Endpoint:** `GET /responses/{responseID}/input_items`

### Parameters

```ts
export interface InputItemListParams extends CursorPageParams {
  include?: Array<ResponsesAPI.ResponseIncludable>;
  order?: 'asc' | 'desc'; // default 'desc'
}
```

* **`include`**: extra fields to include in each item (e.g., `'code_interpreter_call.outputs'` as shown in tests).
* **`order`**: sort order (`asc` or `desc`).
* **Cursor params** (from `CursorPageParams`): commonly `after`, `limit`, etc.
  In tests you can see usage like `{ after: '...', limit: 20 }`.

### Return Type

* **`PagePromise<ResponseItemsPage, ResponseItem>`**: a cursor-paged list you can:

  * `await` for the **first page**
  * or **auto-paginate** with `for await...of`

### Usage

**Auto-paginate (recommended):**

```ts
for await (const item of client.responses.inputItems.list('resp_123', {
  include: ['code_interpreter_call.outputs'],
  order: 'desc',
  limit: 50, // per-page
})) {
  console.log(item); // ResponsesAPI.ResponseItem
}
```

**Manual paging:**

```ts
let page = await client.responses.inputItems.list('resp_123', { limit: 20 });
for (const item of page.data) console.log(item);

while (page.hasNextPage()) {
  page = await page.getNextPage();
  for (const item of page.data) console.log(item);
}
```

**Passing request options:**

```ts
await client.responses.inputItems.list(
  'resp_123',
  { include: ['code_interpreter_call.outputs'], order: 'asc', limit: 10 },
  { headers: { 'x-trace-id': 'my-trace' } },    // example RequestOptions
);
```

---

## Structured Outputs with Zod (`zodResponseFormat`)

The SDK helper `zodResponseFormat` converts a **Zod schema** into a JSON Schema the Responses API can enforce. The tests illustrate the rules:

### Basic

```ts
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod/v3';

const Weather = z.object({
  city: z.string(),
  temperature: z.number(),
  units: z.enum(['c', 'f']),
});

const fmt = zodResponseFormat(Weather, 'location');
// fmt.json_schema → draft-07 JSON Schema with `strict: true`
```

### Required-field rules

* **All fields must be required by the API.**
* If you call `.optional()` on a field, you **must** also allow `null` via `.nullable()`; the helper then **adds it to `required`** while permitting `null`.

```ts
z.object({
  city: z.string(),
  units: z.enum(['c', 'f']).optional().nullable(), // ✅ allowed
});
```

**Will throw** if a field is `.optional()` **without** `.nullable()` (including nested cases).
Defaults (`.default(...)`) are treated as **required**.
You can pass a **`description`** for schema metadata.

---

## Low-Level Streaming (SSE) Internals (Advanced)

The tests show `_iterSSEMessages(...)` decoding Server-Sent Events:

```ts
import { _iterSSEMessages } from 'openai/core/streaming';
import { ReadableStreamFrom } from 'openai/internal/shims';

const iter = _iterSSEMessages(new Response(ReadableStreamFrom(async function* () {
  yield Buffer.from('event: ping\n');
  yield Buffer.from('data: {"ok":true}\n');
  yield Buffer.from('\n');
}())), new AbortController())[Symbol.asyncIterator]();

const first = await iter.next();
console.log(first.value.event); // 'ping' | null
console.log(first.value.data);  // raw string payload (possibly JSON)
```

The decoder:

* Supports **events with/without `event:` lines**.
* Concatenates **multi-line `data:`** correctly (including empty lines and escaped `\n`).
* Handles **multi-byte characters** that span chunk boundaries.

> You typically don’t need this; prefer `responses.stream(...)`. The SSE iterator is useful for custom transports/testing.

---

## Pagination Model

The SDK uses **cursor pagination** via `CursorPage<T>`:

* Typical query params: `limit`, `after` (and/or `before` depending on endpoint).
* Page objects expose helpers like `hasNextPage()` / `getNextPage()` and iterable utilities on `PagePromise`.

---

## RequestOptions (per-call overrides)

Where accepted, `RequestOptions` lets you override request behavior, e.g.:

```ts
await client.responses.retrieve('resp_123', { stream: false }, {
  headers: { 'x-my-header': 'value' },
  // path: '/_stainless_unknown_path' // used in tests to force a 404
});
```

> Use `path` only for testing/internal scenarios. In normal usage you shouldn’t override endpoint paths.

---

## Testing Insights (from the snippet)

* **Types**: `APIPromise<T>` resolves to exactly `T` (e.g., `string`, `number`, `null`, `void`, objects).
* **Request ID propagation**:

  * `.withResponse()` returns `request_id` and the raw `Response`.
  * For **object** JSON results, `_request_id` is patched onto the returned object.
  * Not patched for **arrays**, **strings**, or **page** objects.

---

## FAQ

**Q: How do I get both raw and parsed results?**
A: Use `.withResponse()` to get `{ data, response, request_id }`. Or chain `.asResponse()` and then await the promise itself.

**Q: What if I need the items that produced a response?**
A: Call `client.responses.inputItems.list(responseID, ...)` and iterate (auto-paginate or manual pages).

**Q: Can I stream and still get a final consolidated object?**
A: Yes. Attach event listeners on the stream, then call `.finalResponse()`.

**Q: Why am I seeing an error about optional Zod fields?**
A: The Responses API requires all fields to be “required”. Use `.optional().nullable()` for fields that may be `null`; the helper will still mark them required in JSON Schema.

---

## End-to-End Example

```ts
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod/v3';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// 1) Ask for structured output
const Weather = z.object({
  city: z.string(),
  temperature: z.number(),
  units: z.enum(['c', 'f']).default('c'),
});

const fmt = zodResponseFormat(Weather, 'weather');

const { data: created, request_id } = await client.responses
  .create({
    model: 'gpt-5',
    input: 'Return weather for Tampa as JSON.',
    response_format: fmt,  // schema enforcement
  })
  .withResponse();

console.log(created.output_text, request_id);

// 2) Inspect the inputs that produced this response
for await (const item of client.responses.inputItems.list(created.id, {
  include: ['code_interpreter_call.outputs'],
  order: 'desc',
  limit: 25,
})) {
  console.log(item.type, item); // type depends on ResponsesAPI.ResponseItem
}

// 3) Stream reasoning model
const stream = await client.responses.stream({
  model: 'gpt-5',
  input: 'Compute 128 * 24',
  reasoning: { effort: 'medium' },
});

stream.on('response.output_text.delta', (e) => {
  process.stdout.write(e.snapshot); // live snapshot
});

const final = await stream.finalResponse();
console.log('\nFinal:', final.output_text);
```

---

## Type Reference (from the snippet)

```ts
/** Cursor list of items used to generate a response */
export interface ResponseItemList {
  data: Array<ResponsesAPI.ResponseItem>;
  first_id: string;
  has_more: boolean;
  last_id: string;
  object: 'list';
}

export interface InputItemListParams extends CursorPageParams {
  include?: Array<ResponsesAPI.ResponseIncludable>;
  order?: 'asc' | 'desc';
}
```

> `ResponsesAPI.ResponseItem` and `ResponsesAPI.ResponseIncludable` come from `./responses` in your SDK; their concrete fields depend on what inputs the server recorded (messages, tools, attachments, etc.).

---
