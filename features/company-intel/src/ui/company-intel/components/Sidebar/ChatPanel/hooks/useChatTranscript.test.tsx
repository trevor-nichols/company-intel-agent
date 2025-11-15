import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useChatTranscript } from './useChatTranscript';
import type { AssistantTranscriptMessage } from '../types';

describe('useChatTranscript', () => {
  it('creates a user + assistant pair and clears draft on beginAssistantTurn', () => {
    const { result } = renderHook(() => useChatTranscript({ snapshotId: 123 }));

    act(() => {
      result.current.setDraft('How does Acme win deals?');
    });

    let turnResult: ReturnType<typeof result.current.beginAssistantTurn> | null = null;
    act(() => {
      turnResult = result.current.beginAssistantTurn(result.current.draft);
    });

    expect(turnResult).not.toBeNull();

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      status: 'streaming',
      content: '',
    });
    expect(result.current.draft).toBe('');
    expect(result.current.chatError).toBeNull();
    expect(result.current.hasMessages).toBe(true);
    expect(result.current.isStreamingResponse).toBe(true);
  });

  it('ignores empty submissions', () => {
    const { result } = renderHook(() => useChatTranscript({ snapshotId: 1 }));

    act(() => {
      result.current.setDraft('   ');
    });

    let turnResult: ReturnType<typeof result.current.beginAssistantTurn> | null = null;
    act(() => {
      turnResult = result.current.beginAssistantTurn(result.current.draft);
    });

    expect(turnResult ?? null).toBeNull();
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isStreamingResponse).toBe(false);
  });

  it('updates the active assistant message via updateActiveAssistant', () => {
    const { result } = renderHook(() => useChatTranscript({ snapshotId: 10 }));

    act(() => {
      result.current.setDraft('Summarize our GTM.');
    });

    act(() => {
      result.current.beginAssistantTurn(result.current.draft);
    });

    act(() => {
      result.current.updateActiveAssistant(message => ({
        ...message,
        content: `${message.content}Initial segment. `,
      }));
    });

    act(() => {
      result.current.updateActiveAssistant(message => ({
        ...message,
        reasoning: {
          ...message.reasoning,
          headline: 'Mapping sources',
          segments: {
            ...message.reasoning.segments,
            0: 'Cross-check landing page and 10-K references.',
          },
          isStreaming: false,
        },
        status: 'complete',
      }));
    });

    const assistant = result.current.messages[1] as AssistantTranscriptMessage;
    expect(assistant.content).toContain('Initial segment');
    expect(assistant.reasoning.headline).toBe('Mapping sources');
    expect(assistant.reasoning.segments[0]).toBe('Cross-check landing page and 10-K references.');
    expect(assistant.status).toBe('complete');
  });

  it('resets transcript state when snapshotId changes', () => {
    const { result, rerender } = renderHook(
      ({ snapshotId }) => useChatTranscript({ snapshotId }),
      { initialProps: { snapshotId: 5 } },
    );

    act(() => {
      result.current.setDraft('Who are the competitors?');
    });

    act(() => {
      result.current.beginAssistantTurn(result.current.draft);
    });

    expect(result.current.messages).toHaveLength(2);

    rerender({ snapshotId: 6 });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.draft).toBe('');
    expect(result.current.chatError).toBeNull();
    expect(result.current.isStreamingResponse).toBe(false);
  });

  it('resetTranscript clears any existing conversation manually', () => {
    const { result } = renderHook(() => useChatTranscript({ snapshotId: 77 }));

    act(() => {
      result.current.setDraft('Outline TAM.');
      result.current.beginAssistantTurn(result.current.draft);
      result.current.resetTranscript();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.draft).toBe('');
    expect(result.current.chatError).toBeNull();
    expect(result.current.isStreamingResponse).toBe(false);
  });
});
