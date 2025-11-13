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
  it('extracts citations from both file search and annotations', () => {
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

    const citations = extractChatCitations(response) ?? [];
    expect(citations).toHaveLength(2);
    expect(citations[0]).toMatchObject({ fileId: 'file-search-id', filename: 'source.pdf' });
    expect(citations[1]).toMatchObject({ fileId: 'annotated-id', quote: 'Quoted text', index: 10 });
  });
});
