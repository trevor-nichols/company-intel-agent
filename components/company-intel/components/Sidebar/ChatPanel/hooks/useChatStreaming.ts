import { useCallback, useEffect, useRef } from 'react';

import type { CompanyIntelChatStreamEvent } from '@/shared/company-intel/chat';

import { useCompanyIntelChat } from '../../../../hooks';
import type { ChatMutationAdapter } from '../types';
import { isAbortError, toChatMessages } from '../utils/messages';
import type { UseChatTranscriptResult } from './useChatTranscript';

export interface UseChatStreamingOptions {
  readonly snapshotId: number;
  readonly transcript: UseChatTranscriptResult;
  readonly chatAdapter?: ChatMutationAdapter;
}

export interface UseChatStreamingResult {
  readonly submitMessage: () => Promise<void>;
  readonly stopStreaming: () => void;
  readonly clearConversation: () => void;
  readonly isSending: boolean;
}

export function useChatStreaming(options: UseChatStreamingOptions): UseChatStreamingResult {
  const { snapshotId, transcript, chatAdapter } = options;

  const handleStreamingEvent = useCallback(
    (event: CompanyIntelChatStreamEvent) => {
      switch (event.type) {
        case 'chat-stream-start':
          transcript.updateActiveAssistant(message => ({
            ...message,
            responseId: event.responseId ?? message.responseId ?? null,
          }));
          break;
        case 'chat-reasoning-delta':
          transcript.updateActiveAssistant(message => ({
            ...message,
            reasoning: {
              headline: message.reasoning.headline,
              isStreaming: true,
              startedAt: message.reasoning.startedAt ?? Date.now(),
              segments: {
                ...message.reasoning.segments,
                [event.summaryIndex]: `${message.reasoning.segments[event.summaryIndex] ?? ''}${event.delta}`,
              },
            },
          }));
          break;
        case 'chat-reasoning-summary':
          transcript.updateActiveAssistant(message => ({
            ...message,
            reasoning: {
              headline: event.headline ?? message.reasoning.headline,
              isStreaming: false,
              startedAt: message.reasoning.startedAt ?? Date.now(),
              segments: {
                ...message.reasoning.segments,
                [event.summaryIndex]: event.text,
              },
            },
          }));
          break;
        case 'chat-tool-status':
          transcript.updateActiveAssistant(message => ({
            ...message,
            tool: {
              tool: event.tool,
              status: event.status,
              startedAt: message.tool?.startedAt ?? Date.now(),
            },
          }));
          break;
        case 'chat-message-delta':
          transcript.updateActiveAssistant(message => ({
            ...message,
            contentStartedAt: message.contentStartedAt ?? Date.now(),
            content: `${message.content}${event.delta}`,
          }));
          break;
        case 'chat-message-complete':
          transcript.updateActiveAssistant(message => ({
            ...message,
            contentStartedAt: message.contentStartedAt ?? Date.now(),
            content: (event.message ?? message.content)?.trim() ?? '',
            citations: event.citations ?? message.citations,
            status: 'complete',
            reasoning: {
              ...message.reasoning,
              isStreaming: false,
            },
          }));
          break;
        case 'chat-usage':
          transcript.updateActiveAssistant(message => ({
            ...message,
            usage: event.usage ?? null,
          }));
          break;
        case 'chat-error':
          transcript.setChatError(event.message);
          transcript.updateActiveAssistant(message => ({
            ...message,
            status: 'failed',
            reasoning: {
              ...message.reasoning,
              isStreaming: false,
            },
          }));
          transcript.clearActiveAssistant();
          break;
        case 'chat-complete':
          transcript.updateActiveAssistant(message => ({
            ...message,
            status: 'complete',
            reasoning: {
              ...message.reasoning,
              isStreaming: false,
            },
          }));
          transcript.clearActiveAssistant();
          break;
        default:
          break;
      }
    },
    [transcript],
  );

  const defaultChatMutation = useCompanyIntelChat({
    onEvent: handleStreamingEvent,
  });
  const chatMutation = chatAdapter ?? defaultChatMutation;
  const chatMutationRef = useRef(chatMutation);

  useEffect(() => {
    chatMutationRef.current = chatMutation;
  }, [chatMutation]);

  const submitMessage = useCallback(async () => {
    const turn = transcript.beginAssistantTurn(transcript.draft);
    if (!turn) {
      return;
    }

    try {
      const result = await chatMutationRef.current.mutateAsync({
        snapshotId,
        messages: toChatMessages(turn.pendingHistory),
      });

      if (result) {
        transcript.updateActiveAssistant(message => ({
          ...message,
          content: result.message ?? message.content,
          citations: result.citations ?? message.citations,
          usage: result.usage ?? message.usage ?? null,
          status: 'complete',
        }));
      }
    } catch (error) {
      const aborted = isAbortError(error);
      if (!aborted) {
        transcript.setChatError(error instanceof Error ? error.message : 'Unable to complete the chat request.');
      }
      transcript.updateActiveAssistant(message => ({
        ...message,
        status: 'failed',
        reasoning: {
          ...message.reasoning,
          isStreaming: false,
        },
      }));
    } finally {
      transcript.clearActiveAssistant();
    }
  }, [snapshotId, transcript]);

  const stopStreaming = useCallback(() => {
    if (!transcript.isStreamingResponse) {
      return;
    }
    chatMutationRef.current.cancel?.();
    chatMutationRef.current.reset?.();
    transcript.updateActiveAssistant(message => ({
      ...message,
      status: 'failed',
      reasoning: {
        ...message.reasoning,
        isStreaming: false,
      },
      tool: message.tool
        ? {
            ...message.tool,
            status: 'cancelled',
          }
        : message.tool,
    }));
    transcript.clearActiveAssistant();
    transcript.setChatError('Response cancelled.');
  }, [transcript]);

  const clearConversation = useCallback(() => {
    chatMutationRef.current.cancel?.();
    transcript.clearActiveAssistant();
    transcript.resetTranscript();
    chatMutationRef.current.reset?.();
  }, [transcript]);

  return {
    submitMessage,
    stopStreaming,
    clearConversation,
    isSending: chatMutation.isPending,
  };
}
