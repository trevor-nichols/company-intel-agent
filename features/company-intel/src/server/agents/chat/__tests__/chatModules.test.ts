import { describe, expect, it } from 'vitest';

import { buildChatSystemPrompt } from '../prompts';
import { validateChatRequestBody } from '../validation';
import { extractChatCitations } from '../citations';

describe('chat prompts', () => {
  it('builds a default prompt scoped to the current company with playbook directives', () => {
    const prompt = buildChatSystemPrompt();
    expect(prompt).toContain('You are the dedicated company intelligence analyst for this company');
    expect(prompt).toMatch(/Playbook:/);
    expect(prompt).toMatch(/file_search tool/i);
  });

  it('injects the domain when provided', () => {
    const prompt = buildChatSystemPrompt({ domain: 'acme.com' });
    expect(prompt).toContain('for acme.com');
  });
});

describe('chat validation', () => {
  it('normalizes valid user messages', () => {
    const result = validateChatRequestBody({
      messages: [{ role: 'user', content: '  Hello  ' }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.messages).toEqual([{ role: 'user', content: 'Hello' }]);
    }
  });

  it('rejects payloads without messages', () => {
    const result = validateChatRequestBody({ messages: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/messages array is required/i);
      expect(result.status).toBe(400);
    }
  });
});

describe('chat citations', () => {
  it('separates inline citations from consulted documents and backfills scores', () => {
    const response = {
      output: [
        {
          type: 'file_search_call',
          results: [
            {
              file_id: 'file-search-id',
              filename: 'source.pdf',
              score: 0.82,
              content: [{ text: 'snippet' }],
            },
            {
              file_id: 'annotated-id',
              filename: 'annotated.txt',
              score: 0.77,
            },
          ],
        },
        {
          type: 'message',
          content: [
            {
              annotations: [
                {
                  type: 'file_citation',
                  file_id: 'annotated-id',
                  filename: 'annotated.txt',
                  quoted_text: 'Quoted text',
                  start_index: 10,
                },
              ],
            },
          ],
        },
      ],
    } satisfies Record<string, unknown>;

    const result = extractChatCitations(response);
    expect(result).toBeDefined();
    expect(result?.consultedDocuments).toHaveLength(2);
    expect(result?.consultedDocuments?.[0]).toMatchObject({ fileId: 'file-search-id', score: 0.82 });
    expect(result?.inlineCitations).toHaveLength(1);
    expect(result?.inlineCitations?.[0]).toMatchObject({ fileId: 'annotated-id', quote: 'Quoted text', index: 10, score: 0.77 });
  });
});
