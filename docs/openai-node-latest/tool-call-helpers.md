```ts
#!/usr/bin/env -S npm run tsn -T

import OpenAI from 'openai';

// gets API Key from environment variable OPENAI_API_KEY
const openai = new OpenAI();

/**
 * Note, this will automatically ensure the model returns valid JSON,
 * but won't ensure it conforms to your schema.
 *
 * For that functionality, please see the `tool-call-helpers-zod.ts` example,
 * which shows a fully typesafe, schema-validating version.
 */
const tools = [
  {
    type: 'function',
    function: {
      name: 'list',
      description: 'List queries books by genre, and returns a list of names of books',
      parameters: {
        type: 'object',
        properties: {
          genre: { type: 'string', enum: ['mystery', 'nonfiction', 'memoir', 'romance', 'historical'] },
        },
        required: ['genre'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search',
      description: 'Search queries books by their name and returns a list of book names and their ids',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get',
      description:
        "Get returns a book's detailed information based on the id of the book. Note that this does not accept names, and only IDs, which you can get by using search.",
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
];

async function main() {
  let response = await openai.responses.create({
    model: 'gpt-5',
    input: [
      {
        role: 'system',
        content:
          'Please use our book database, which you can access using functions to answer the following questions.',
      },
      {
        role: 'user',
        content:
          'I really enjoyed reading To Kill a Mockingbird, could you recommend me a book that is similar and tell me why?',
      },
    ],
    tools,
  });

  while (response.status === 'requires_action') {
    const toolCalls = response.required_action.submit_tool_outputs.tool_calls;
    const toolOutputs = [];

    for (const toolCall of toolCalls) {
      if (toolCall.type !== 'function') {
        continue;
      }

      const args = JSON.parse(toolCall.function.arguments);
      let result: unknown;

      switch (toolCall.function.name) {
        case 'list':
          result = await list(args);
          break;
        case 'search':
          result = await search(args);
          break;
        case 'get':
          result = await get(args);
          break;
        default:
          throw new Error(`Unknown tool: ${toolCall.function.name}`);
      }

      toolOutputs.push({
        tool_call_id: toolCall.id,
        output: JSON.stringify(result ?? null),
      });
    }

    response = await openai.responses.submitToolOutputs(response.id, {
      tool_outputs: toolOutputs,
    });
  }

  if (response.status !== 'completed') {
    throw new Error(`Response finished with status ${response.status}`);
  }

  console.log(response.output_text);
}

const db = [
  {
    id: 'a1',
    name: 'To Kill a Mockingbird',
    genre: 'historical',
    description: `Compassionate, dramatic, and deeply moving, "To Kill A Mockingbird" takes readers to the roots of human behavior - to innocence and experience, kindness and cruelty, love and hatred, humor and pathos. Now with over 18 million copies in print and translated into forty languages, this regional story by a young Alabama woman claims universal appeal. Harper Lee always considered her book to be a simple love story. Today it is regarded as a masterpiece of American literature.`,
  },
  {
    id: 'a2',
    name: 'All the Light We Cannot See',
    genre: 'historical',
    description: `In a mining town in Germany, Werner Pfennig, an orphan, grows up with his younger sister, enchanted by a crude radio they find that brings them news and stories from places they have never seen or imagined. Werner becomes an expert at building and fixing these crucial new instruments and is enlisted to use his talent to track down the resistance. Deftly interweaving the lives of Marie-Laure and Werner, Doerr illuminates the ways, against all odds, people try to be good to one another.`,
  },
  {
    id: 'a3',
    name: 'Where the Crawdads Sing',
    genre: 'historical',
    description: `For years, rumors of the “Marsh Girl” haunted Barkley Cove, a quiet fishing village. Kya Clark is barefoot and wild; unfit for polite society. So in late 1969, when the popular Chase Andrews is found dead, locals immediately suspect her.
But Kya is not what they say. A born naturalist with just one day of school, she takes life's lessons from the land, learning the real ways of the world from the dishonest signals of fireflies. But while she has the skills to live in solitude forever, the time comes when she yearns to be touched and loved. Drawn to two young men from town, who are each intrigued by her wild beauty, Kya opens herself to a new and startling world—until the unthinkable happens.`,
  },
];

async function list({ genre }: { genre: string }) {
  return db.filter((item) => item.genre === genre).map((item) => ({ name: item.name, id: item.id }));
}

async function search({ name }: { name: string }) {
  return db.filter((item) => item.name.includes(name)).map((item) => ({ name: item.name, id: item.id }));
}

async function get({ id }: { id: string }) {
  return db.find((item) => item.id === id)!;
}

main();
```
