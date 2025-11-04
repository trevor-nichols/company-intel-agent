# Structured Outputs with Zod and OpenAI

```ts
#!/usr/bin/env -S npm run tsn -T

import { OpenAI } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod/v3';

const Step = z.object({
  explanation: z.string(),
  output: z.string(),
});

const MathResponse = z.object({
  steps: z.array(Step),
  final_answer: z.string(),
});

const client = new OpenAI();

async function main() {
  const rsp = await client.responses.parse({
    input: 'solve 8x + 31 = 2',
    model: 'gpt-5',
    text: {
      format: zodTextFormat(MathResponse, 'math_response'),
    },
  });

  console.log(rsp.output_parsed);
  console.log('answer: ', rsp.output_parsed?.final_answer);
}

main().catch(console.error);
```

# Structured Outputs + Reasoning
Just add the **reasoning** block alongside **Structured Outputs**. You can use Zod (cleanest in JS) or raw JSON Schema; both work with GPT-5 and `reasoning: { effort: "medium" }` in the **Responses API**.

### JS + Zod (recommended)

```js
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const openai = new OpenAI();

// Example schema for a blog outline extractor
const PostOutline = z.object({
  title: z.string(),
  tldr: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      bullets: z.array(z.string()),
    })
  ),
  tags: z.array(z.string()),
});

const resp = await openai.responses.parse({
  model: "gpt-5",
  reasoning: { effort: "medium" },        // ← your “Medium” reasoning setting
  input: [
    { role: "system", content: "Extract a clean outline for a Medium-style post." },
    { role: "user", content: "Here are my messy notes about agents, codex, and Zod…" },
  ],
  text: { format: zodTextFormat(PostOutline, "post_outline") },
  // optional guardrails for cost/latency on reasoning + output:
  max_output_tokens: 4000,
});

const outline = resp.output_parsed;   // fully typed object
```

### Raw JSON Schema (no Zod)

```js
const resp = await openai.responses.create({
  model: "gpt-5",
  reasoning: { effort: "medium" },
  input: [{ role: "user", content: "Summarize and structure this draft…" }],
  text: {
    format: {
      type: "json_schema",
      name: "post_outline",
      strict: true,
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          tldr: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                bullets: { type: "array", items: { type: "string" } }
              },
              required: ["heading", "bullets"],
              additionalProperties: false
            }
          },
          tags: { type: "array", items: { type: "string" } }
        },
        required: ["title", "tldr", "sections", "tags"],
        additionalProperties: false
      }
    }
  }
});
```

### Optional niceties

* **Streaming with Structured Outputs** (SDK handles the details):

  ```js
  const stream = openai.responses.stream({
    model: "gpt-5",
    reasoning: { effort: "medium" },
    input: [{ role: "user", content: "Turn these notes into a structured outline." }],
    text: { format: zodTextFormat(PostOutline, "post_outline") },
  });
  const final = await stream.finalResponse();
  const parsed = final.output_parsed;
  ```
* **Keep reasoning across turns** (for better multi-step performance):

  * First call: include encrypted reasoning items

    ```js
    const r1 = await openai.responses.create({
      model: "gpt-5",
      reasoning: { effort: "medium" },
      include: ["reasoning.encrypted_content"],
      input: [{ role: "user", content: "Draft an outline about agent workflows." }],
    });
    ```
  * Next call: reuse with `previous_response_id` (or pass prior output items)

    ```js
    const r2 = await openai.responses.create({
      model: "gpt-5",
      previous_response_id: r1.id,
      input: [{ role: "user", content: "Now expand section 2 into bullets." }],
    });
    ```
* **Handle edge cases**: if `response.status === "incomplete"` and `reason` is `max_output_tokens`, bump `max_output_tokens` (reasoning tokens count against it), or lower `reasoning.effort`.

**Docs to back this up:** Structured Outputs via `text.format` (Zod/JSON Schema), Responses API usage, GPT-5 model + reasoning settings, and retaining encrypted reasoning items are all documented in OpenAI’s official docs. 

