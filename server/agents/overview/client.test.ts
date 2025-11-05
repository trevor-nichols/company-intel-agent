import { describe, expect, it, vi } from 'vitest';

import type { OpenAIClientLike } from '../shared/openai';
import { generateCompanyOverview } from './client';

describe('generateCompanyOverview streaming', () => {
  it('emits cleaned text deltas derived from structured output snapshots', async () => {
    const overviewText =
      'Executive overview ready for stakeholders with actionable insights and KPIs across segments and channels.';

    const streamMock = vi.fn(() => {
      const handlers: Record<string, Array<(event: unknown) => void>> = {};
      let dispatched = false;

      const dispatch = () => {
        if (dispatched) {
          return;
        }
        dispatched = true;

        const firstSnapshot = {
          snapshot: '{"overview":"Executive overview"}',
          delta: '{"overview":"Executive overview"}',
        };
        const secondSnapshot = {
          snapshot:
            '{"overview":"Executive overview ready for stakeholders with actionable insights and KPIs across segments and channels."}',
          delta:
            '{"overview":"Executive overview ready for stakeholders with actionable insights and KPIs across segments and channels."}',
        };

        handlers['response.output_text.delta']?.forEach(handler => handler(firstSnapshot));
        handlers['response.output_text.delta']?.forEach(handler => handler(secondSnapshot));
      };

      const runner = {
        on(eventName: string, handler: (event: unknown) => void) {
          handlers[eventName] = handlers[eventName] ?? [];
          handlers[eventName]!.push(handler);
          return runner;
        },
        finalResponse: vi.fn().mockImplementation(async () => {
          dispatch();
          return {
            id: 'resp_test',
            model: 'gpt-5',
            output_parsed: { overview: overviewText },
            output: [{ content: overviewText }],
          } satisfies { id: string; model: string; output_parsed: { overview: string }; output: Array<{ content: string }> };
        }),
      };

      queueMicrotask(dispatch);
      return runner;
    });

    const openAIClient = {
      responses: {
        stream: streamMock,
        parse: vi.fn(),
      },
    } as unknown as OpenAIClientLike;

    const onDelta = vi.fn();

    const result = await generateCompanyOverview(
      {
        domain: 'example.com',
        pages: [
          {
            url: 'https://example.com/about',
            content: 'About Example Corp: customer operations and analytics platform.',
          },
        ],
      },
      {
        openAIClient,
        onDelta,
      },
    );

    expect(result.data.overview).toBe(overviewText);

    expect(onDelta).toHaveBeenCalledTimes(2);

    const [firstCall, secondCall] = onDelta.mock.calls;

    expect(firstCall?.[0]).toMatchObject({
      delta: 'Executive overview',
      displayText: 'Executive overview',
    });

    expect(secondCall?.[0]).toMatchObject({
      delta: ' ready for stakeholders with actionable insights and KPIs across segments and channels.',
      displayText: overviewText,
    });
  });
});
