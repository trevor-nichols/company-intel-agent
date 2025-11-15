import { renderHook, act } from '@testing-library/react';
import { describe, beforeEach, expect, it, vi, type MockedFunction } from 'vitest';

import type {
  CompanyIntelChatStreamEvent,
  CompanyIntelChatCitation,
  CompanyIntelConsultedDocument,
} from '@company-intel/shared/chat';
import type { AssistantTranscriptMessage } from '../types';

vi.mock('../../../../hooks', async () => {
  const actual = await vi.importActual<typeof import('../../../../hooks')>('../../../../hooks');
  return {
    ...actual,
    useCompanyIntelChat: vi.fn(),
  };
});

import { useCompanyIntelChat } from '../../../../hooks';
import { useChatStreaming } from './useChatStreaming';
import { useChatTranscript } from './useChatTranscript';
import type { ChatMutationAdapter } from '../types';

const useCompanyIntelChatMock = useCompanyIntelChat as unknown as MockedFunction<typeof useCompanyIntelChat>;

describe('useChatStreaming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCompanyIntelChatMock.mockReset();
    useCompanyIntelChatMock.mockImplementation((options?: Parameters<typeof useCompanyIntelChat>[0]) => {
      lastOnEvent = options?.onEvent ?? null;
      return createChatAdapter() as unknown as ReturnType<typeof useCompanyIntelChat>;
    });
    lastOnEvent = null;
  });

  let lastOnEvent: ((event: CompanyIntelChatStreamEvent) => void) | null = null;

  it('submits messages and marks assistant complete when adapter resolves', async () => {
    const consulted: CompanyIntelConsultedDocument[] = [{ fileId: 'file-1', filename: 'source.pdf', score: 0.91 }];
    const adapter = createChatAdapter({
      mutateAsync: vi.fn().mockResolvedValue({
        message: 'Acme wins on data freshness.',
        citations: [{ fileId: 'file-1' } as CompanyIntelChatCitation],
        consultedDocuments: consulted,
        usage: { total_tokens: 120 },
      }),
    });

    const { result } = renderStreamingHook({ chatAdapter: adapter });

    act(() => {
      result.current.transcript.setDraft('Where does Acme differentiate?');
    });

    await act(async () => {
      await result.current.streaming.submitMessage();
    });

    expect(adapter.mutateAsync).toHaveBeenCalledWith({
      snapshotId: 42,
      messages: [
        {
          role: 'user',
          content: 'Where does Acme differentiate?',
        },
      ],
    });

    const assistant = result.current.transcript.messages[1] as AssistantTranscriptMessage;
    expect(assistant.status).toBe('complete');
    expect(assistant.content).toBe('Acme wins on data freshness.');
    expect(assistant.citations).toHaveLength(1);
    expect(assistant.consultedDocuments).toEqual(consulted);
    expect(assistant.usage).toEqual({ total_tokens: 120 });
  });

  it('stopStreaming aborts active responses and sets an error message', () => {
    const adapter = createChatAdapter();
    const { result } = renderStreamingHook({ chatAdapter: adapter });

    act(() => {
      result.current.transcript.beginAssistantTurn('Outline the GTM playbook.');
    });

    act(() => {
      result.current.streaming.stopStreaming();
    });

    expect(adapter.cancel).toHaveBeenCalled();
    expect(result.current.transcript.chatError).toBe('Response cancelled.');
    const assistant = result.current.transcript.messages[1] as AssistantTranscriptMessage;
    expect(assistant.status).toBe('failed');
  });

  it('clearConversation cancels the adapter and resets transcript state', () => {
    const adapter = createChatAdapter();
    const { result } = renderStreamingHook({ chatAdapter: adapter });

    act(() => {
      result.current.transcript.beginAssistantTurn('Capture signals.');
    });

    act(() => {
      result.current.streaming.clearConversation();
    });

    expect(adapter.cancel).toHaveBeenCalled();
    expect(adapter.reset).toHaveBeenCalled();
    expect(result.current.transcript.messages).toHaveLength(0);
    expect(result.current.transcript.chatError).toBeNull();
  });

  it('handles streaming events end-to-end', () => {
    const citations: CompanyIntelChatCitation[] = [{ fileId: 'file-42', quote: 'Live coverage < 15m.' }];
    const consultedDocs: CompanyIntelConsultedDocument[] = [
      { fileId: 'file-42', filename: 'memo', score: 0.77 },
      { fileId: 'file-99', filename: 'roadmap', score: 0.65 },
    ];
    const { result } = renderStreamingHook();

    act(() => {
      result.current.transcript.beginAssistantTurn('Compare to legacy vendors.');
    });

    const publish = (event: CompanyIntelChatStreamEvent) => {
      expect(lastOnEvent).toBeTruthy();
      act(() => {
        lastOnEvent?.(event);
      });
    };

    publish({ type: 'chat-stream-start', responseId: 'resp_1', snapshotId: 42 });
    publish({ type: 'chat-message-delta', delta: 'Acme focuses on freshness ', snapshotId: 42 });
    publish({ type: 'chat-message-delta', delta: 'and QA.', snapshotId: 42 });
    publish({
      type: 'chat-reasoning-delta',
      summaryIndex: 0,
      delta: 'Plan: compare freshness metrics.',
      snapshotId: 42,
    });
    publish({
      type: 'chat-reasoning-summary',
      summaryIndex: 0,
      headline: 'Validate differentiation',
      text: 'Plan finalized',
      snapshotId: 42,
    });
    publish({ type: 'chat-tool-status', tool: 'file_search', status: 'completed', snapshotId: 42 });
    publish({
      type: 'chat-message-complete',
      message: 'Acme provides live signal coverage <15m, unlike legacy vendors.',
      citations,
      consultedDocuments: consultedDocs,
      responseId: 'resp_1',
      snapshotId: 42,
    });
    publish({ type: 'chat-usage', usage: { total_tokens: 88 }, snapshotId: 42 });

    const assistant = result.current.transcript.messages[1] as AssistantTranscriptMessage;
    expect(assistant.content).toContain('live signal coverage');
    expect(assistant.status).toBe('complete');
    expect(assistant.citations).toEqual(citations);
    expect(assistant.consultedDocuments).toEqual(consultedDocs);
    expect(assistant.reasoning.headline).toBe('Validate differentiation');
    expect(assistant.reasoning.segments[0]).toBe('Plan finalized');
    expect(assistant.tool).toEqual(expect.objectContaining({ tool: 'file_search', status: 'completed' }));
    expect(assistant.usage).toEqual({ total_tokens: 88 });
  });

  it('sets an error state when chat-error event is received', () => {
    const { result } = renderStreamingHook();

    act(() => {
      result.current.transcript.beginAssistantTurn('Trigger failure.');
    });

    act(() => {
      lastOnEvent?.({ type: 'chat-error', message: 'Vector store offline.', snapshotId: 42 });
    });

    expect(result.current.transcript.chatError).toBe('Vector store offline.');
    const assistant = result.current.transcript.messages[1] as AssistantTranscriptMessage;
    expect(assistant.status).toBe('failed');
    expect(assistant.reasoning.isStreaming).toBe(false);
    expect(result.current.transcript.isStreamingResponse).toBe(false);
  });
});

function renderStreamingHook(options: { snapshotId?: number; chatAdapter?: ChatMutationAdapter } = {}) {
  const { snapshotId = 42, chatAdapter } = options;
  return renderHook(
    ({ snapshotId: id, chatAdapter: adapter }) => {
      const transcript = useChatTranscript({ snapshotId: id });
      const streaming = useChatStreaming({ snapshotId: id, transcript, chatAdapter: adapter });
      return { transcript, streaming };
    },
    {
      initialProps: { snapshotId, chatAdapter },
    },
  );
}

function createChatAdapter(overrides: Partial<ChatMutationAdapter> = {}): ChatMutationAdapter {
  return {
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    reset: vi.fn(),
    cancel: vi.fn(),
    ...overrides,
  };
}
