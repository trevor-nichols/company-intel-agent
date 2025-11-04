# Streaming API responses

Learn how to stream model responses from the OpenAI API using server-sent events.

By default, when you make a request to the OpenAI API, we generate the model's entire output before sending it back in a single HTTP response. When generating long outputs, waiting for a response can take time. Streaming responses lets you start printing or processing the beginning of the model's output while it continues generating the full response.

## Enable streaming

To start streaming responses, set `stream=True` in your request to the Responses endpoint:

```javascript
import { OpenAI } from "openai";
const client = new OpenAI();

const stream = await client.responses.create({
    model: "gpt-5",
    input: [
        {
            role: "user",
            content: "Say 'double bubble bath' ten times fast.",
        },
    ],
    stream: true,
});

for await (const event of stream) {
    console.log(event);
}
```

The Responses API uses semantic events for streaming. Each event is typed with a predefined schema, so you can listen for events you care about.

For a full list of event types, see the API reference for streaming. Here are a few examples:

```typescript
type StreamingEvent =
	| ResponseCreatedEvent
	| ResponseInProgressEvent
	| ResponseFailedEvent
	| ResponseCompletedEvent
	| ResponseOutputItemAdded
	| ResponseOutputItemDone
	| ResponseContentPartAdded
	| ResponseContentPartDone
	| ResponseOutputTextDelta
	| ResponseOutputTextAnnotationAdded
	| ResponseTextDone
	| ResponseRefusalDelta
	| ResponseRefusalDone
	| ResponseFunctionCallArgumentsDelta
	| ResponseFunctionCallArgumentsDone
	| ResponseFileSearchCallInProgress
	| ResponseFileSearchCallSearching
	| ResponseFileSearchCallCompleted
	| ResponseCodeInterpreterInProgress
	| ResponseCodeInterpreterCallCodeDelta
	| ResponseCodeInterpreterCallCodeDone
	| ResponseCodeInterpreterCallInterpreting
	| ResponseCodeInterpreterCallCompleted
	| Error
```

## Read the responses

If you're using our SDK, every event is a typed instance. You can also identity individual events using the `type` property of the event.

Some key lifecycle events are emitted only once, while others are emitted multiple times as the response is generated. Common events to listen for when streaming text are:

-   `response.created`
-   `response.output_text.delta`
-   `response.completed`
-   `error`

For a full list of events you can listen for, see the API reference for streaming.

## Streaming structured output

You can use streaming to process model responses or function call arguments as they are being generated, and parse them as structured data.

That way, you don't have to wait for the entire response to complete before handling it. This is particularly useful if you would like to display JSON fields one by one, or handle function call arguments as soon as they are available.

We recommend relying on the SDKs to handle streaming with Structured Outputs.

```javascript
import { OpenAI } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const EntitiesSchema = z.object({
  attributes: z.array(z.string()),
  colors: z.array(z.string()),
  animals: z.array(z.string()),
});

const openai = new OpenAI();
const stream = openai.responses
  .stream({
    model: "gpt-5",
    input: [
      { role: "user", content: "What's the weather like in Paris today?" },
    ],
    text: {
      format: zodTextFormat(EntitiesSchema, "entities"),
    },
  })
  .on("response.refusal.delta", (event) => {
    process.stdout.write(event.delta);
  })
  .on("response.output_text.delta", (event) => {
    process.stdout.write(event.delta);
  })
  .on("response.output_text.done", () => {
    process.stdout.write("\n");
  })
  .on("response.error", (event) => {
    console.error(event.error);
  });

const result = await stream.finalResponse();

console.log(result);
```

## Streaming Function Calls

Streaming can be used to surface progress by showing which function is called as the model fills its arguments, and even displaying the arguments in real time.

Streaming function calls is very similar to streaming regular responses: you set `stream` to `true` and get different event objects.

### Streaming function calls

```javascript
import { OpenAI } from "openai";

const openai = new OpenAI();

const tools = [{
    type: "function",
    name: "get_weather",
    description: "Get current temperature for provided coordinates in celsius.",
    parameters: {
        type: "object",
        properties: {
            latitude: { type: "number" },
            longitude: { type: "number" }
        },
        required: ["latitude", "longitude"],
        additionalProperties: false
    },
    strict: true
}];

const stream = await openai.responses.create({
    model: "gpt-5",
    input: [{ role: "user", content: "What's the weather like in Paris today?" }],
    tools,
    stream: true,
    store: true,
});

for await (const event of stream) {
    console.log(event)
}
```

### Output events

```json
{"type":"response.output_item.added","response_id":"resp_1234xyz","output_index":0,"item":{"type":"function_call","id":"fc_1234xyz","call_id":"call_1234xyz","name":"get_weather","arguments":""}}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":"{\""}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":"location"}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":"\":\""}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":"Paris"}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":","}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":" France"}
{"type":"response.function_call_arguments.delta","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"delta":"\"}"}
{"type":"response.function_call_arguments.done","response_id":"resp_1234xyz","item_id":"fc_1234xyz","output_index":0,"arguments":"{\"location\":\"Paris, France\"}"}
{"type":"response.output_item.done","response_id":"resp_1234xyz","output_index":0,"item":{"type":"function_call","id":"fc_1234xyz","call_id":"call_1234xyz","name":"get_weather","arguments":"{\"location\":\"Paris, France\"}"}}
```

Instead of aggregating chunks into a single content string, however, you're aggregating chunks into an encoded arguments JSON object.

When the model calls one or more functions an event of type `response.output_item.added` will be emitted for each function call that contains the following fields:

| Field          | Description                                                                                             |
| :------------- | :------------------------------------------------------------------------------------------------------ |
| `response_id`  | The id of the response that the function call belongs to                                                |
| `output_index` | The index of the output item in the response. This represents the individual function calls in the response. |
| `item`         | The in-progress function call item that includes a name, arguments and id field                         |

Afterwards you will receive a series of events of type `response.function_call_arguments.delta` which will contain the delta of the arguments field. These events contain the following fields:

| Field          | Description                                                                                             |
| :------------- | :------------------------------------------------------------------------------------------------------ |
| `response_id`  | The id of the response that the function call belongs to                                                |
| `item_id`      | The id of the function call item that the delta belongs to                                              |
| `output_index` | The index of the output item in the response. This represents the individual function calls in the response. |
| `delta`        | The delta of the arguments field.                                                                       |

Below is a code snippet demonstrating how to aggregate the deltas into a final `tool_call` object.

### Accumulating tool_call deltas

```javascript
const finalToolCalls = {};

for await (const event of stream) {
    if (event.type === 'response.output_item.added') {
        finalToolCalls[event.output_index] = event.item;
    } else if (event.type === 'response.function_call_arguments.delta') {
        const index = event.output_index;

        if (finalToolCalls[index]) {
            finalToolCalls[index].arguments += event.delta;
        }
    }
}
```

### Accumulated final_tool_calls[0]

```json
{
    "type": "function_call",
    "id": "fc_1234xyz",
    "call_id": "call_2345abc",
    "name": "get_weather",
    "arguments": "{\"location\":\"Paris, France\"}"
}
```

When the model has finished calling the functions an event of type `response.function_call_arguments.done` will be emitted. This event contains the entire function call including the following fields:

| Field          | Description                                                                                             |
| :------------- | :------------------------------------------------------------------------------------------------------ |
| `response_id`  | The id of the response that the function call belongs to                                                |
| `output_index` | The index of the output item in the response. This represents the individual function calls in the response. |
| `item`         | The function call item that includes a name, arguments and id field.                                    |


Got it—this is solid for general streaming, but it’s **missing the reasoning-specific bits for GPT-5** and has a couple small SDK nits. Here’s a tight review + drop-in fixes.

---

## GPT-5 + reasoning

1. **Call out the reasoning stream.**
   When a GPT-5 variant emits reasoning, you’ll also get **`response.reasoning_text.delta`** and **`response.reasoning_text.done`** events. These are not user-displayable; they’re **obfuscated/encrypted** per policy (no plaintext chain of thought). Add this to “Read the responses”. ([platform.openai.com][3])

2. **Show how to enable/shape reasoning.**
   Document the `reasoning` control on the request (e.g., `reasoning: { effort: "minimal" }` for speed-biased behavior on GPT-5 models that support it). ([platform.openai.com][4])

3. **Lifecycle events list.**
   Your “common events” should include **`response.queued`** and **`response.in_progress`** (they often appear before deltas). ([platform.openai.com][5])

4. **Minor event/type naming.**
   Use **`response.output_text.done`** (and the matching SDK type `ResponseOutputTextDone`) rather than `ResponseTextDone`. Also consider listing `response.output_text.annotation.added/done` explicitly if you keep the annotation type in your union. ([platform.openai.com][2])

5. **Structured Outputs helper.**
   Swap `zodTextFormat(...)` for **`zodResponseFormat(...)`** and pass it via **`response_format`**. That’s the officially supported helper for Responses. ([platform.openai.com][6])

6. **Content shape (optional polish).**
   Prefer the fully typed content form in examples for forward-compat with multimodal:
   `content: [{ type: "text", text: "..." }]`. ([platform.openai.com][7])

---

### A) “Enable streaming” (add reasoning + lifecycle)

```ts
import { OpenAI } from "openai";
const client = new OpenAI();

const stream = await client.responses.create({
  model: "gpt-5",
  stream: true,
  reasoning: { effort: "minimal" }, // <-- reasoning control (variant permitting)
  input: [
    {
      role: "user",
      content: [{ type: "text", text: "Say 'double bubble bath' ten times fast." }],
    },
  ],
});

for await (const event of stream) {
  switch (event.type) {
    case "response.queued":
    case "response.in_progress":
    case "response.created":
      break; // lifecycle; optional
    case "response.reasoning_text.delta":
      // present but obfuscated/encrypted; don't show to end users
      break;
    case "response.output_text.delta":
      process.stdout.write(event.delta);
      break;
    case "response.output_text.done":
      process.stdout.write("\n");
      break;
    case "response.completed":
      // event.response.usage available here
      break;
    case "response.error":
      console.error(event.error);
      break;
  }
}
```

Why: adds the reasoning control and handlers for `reasoning_text` + lifecycle events. ([platform.openai.com][3])

---

### B) “Streaming structured output” (fix helper + wiring)

```ts
import { OpenAI } from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

const EntitiesSchema = z.object({
  attributes: z.array(z.string()),
  colors: z.array(z.string()),
  animals: z.array(z.string()),
});

const client = new OpenAI();
const stream = client.responses
  .stream({
    model: "gpt-5",
    stream: true,
    input: [{ role: "user", content: [{ type: "text", text: "What's the weather like in Paris today?" }]}],
    response_format: zodResponseFormat(EntitiesSchema, "entities"),
    reasoning: { effort: "minimal" }, // optional
  })
  .on("response.output_text.delta", (e) => process.stdout.write(e.delta))
  .on("response.output_text.done", () => process.stdout.write("\n"))
  .on("response.reasoning_text.delta", () => { /* ignore in UI */ })
  .on("response.error", (e) => console.error(e.error));

const result = await stream.finalResponse();
console.log(result);
```

Why: uses the official **`zodResponseFormat`** on `response_format`, keeps reasoning safe, and shows the SDK’s `.stream(...).on(...).finalResponse()` ergonomics. ([platform.openai.com][6])

---

### C) “Streaming function calls” (tiny safety add)

```ts
const finalToolCalls: Record<number, any> = {};

for await (const event of stream) {
  if (event.type === "response.output_item.added") {
    finalToolCalls[event.output_index] = event.item; // has .arguments as a string
  } else if (event.type === "response.function_call_arguments.delta") {
    const i = event.output_index;
    if (finalToolCalls[i]) finalToolCalls[i].arguments += event.delta;
  } else if (event.type === "response.function_call_arguments.done") {
    const i = event.output_index;
    // parse only once at .done:
    finalToolCalls[i].parsed = JSON.parse(finalToolCalls[i].arguments);
  }
}
```

Why: parse the JSON **only after** `.done` to avoid syntax errors from partial chunks. ([platform.openai.com][2])

---

## Quick checklist to mark this “reasoning-ready”

* [ ] Add `reasoning_text` events (`delta`, `done`) to your event matrix and explicitly note **do not render**. ([platform.openai.com][3])
* [ ] Document `reasoning: { effort: ... }` (e.g., **`minimal`** for GPT-5 speed-biased mode) and where it’s allowed. ([platform.openai.com][4])
* [ ] Include `response.queued`/`response.in_progress` in lifecycle. ([platform.openai.com][5])
* [ ] Replace `zodTextFormat` → **`zodResponseFormat`** on `response_format`. ([platform.openai.com][6])
* [ ] Use `response.output_text.done` (and the matching SDK type). ([platform.openai.com][2])
