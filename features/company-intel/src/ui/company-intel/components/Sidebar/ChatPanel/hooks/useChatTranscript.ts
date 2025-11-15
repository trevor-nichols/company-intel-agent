import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AssistantReasoningState,
  AssistantTranscriptMessage,
  TranscriptMessage,
  UserTranscriptMessage,
} from '../types';
import { createMessageId } from '../utils/messages';

function createInitialReasoningState(): AssistantReasoningState {
  return {
    headline: null,
    segments: {},
    isStreaming: false,
    startedAt: null,
  };
}

export interface UseChatTranscriptOptions {
  readonly snapshotId: number;
}

export interface BeginAssistantTurnResult {
  readonly pendingHistory: readonly TranscriptMessage[];
}

export interface UseChatTranscriptResult {
  readonly messages: readonly TranscriptMessage[];
  readonly draft: string;
  readonly setDraft: (value: string) => void;
  readonly chatError: string | null;
  readonly setChatError: (value: string | null) => void;
  readonly hasMessages: boolean;
  readonly beginAssistantTurn: (content: string) => BeginAssistantTurnResult | null;
  readonly updateActiveAssistant: (
    updater: (message: AssistantTranscriptMessage) => AssistantTranscriptMessage,
  ) => void;
  readonly resetTranscript: () => void;
  readonly clearActiveAssistant: () => void;
  readonly isStreamingResponse: boolean;
}

export function useChatTranscript(options: UseChatTranscriptOptions): UseChatTranscriptResult {
  const { snapshotId } = options;
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [draft, setDraftState] = useState('');
  const [chatError, setChatErrorState] = useState<string | null>(null);
  const activeAssistantIdRef = useRef<string | null>(null);
  const messagesRef = useRef<TranscriptMessage[]>(messages);

  const setDraft = useCallback((value: string) => {
    setDraftState(value);
  }, []);

  const setChatError = useCallback((value: string | null) => {
    setChatErrorState(value);
  }, []);

  const syncMessages = useCallback((producer: (prev: TranscriptMessage[]) => TranscriptMessage[]) => {
    setMessages(prev => {
      const next = producer(prev);
      messagesRef.current = next;
      return next;
    });
  }, []);

  const beginAssistantTurn = useCallback(
    (content: string): BeginAssistantTurnResult | null => {
      const trimmed = content.trim();
      if (!trimmed) {
        return null;
      }

      const userMessage: UserTranscriptMessage = {
        id: createMessageId(),
        role: 'user',
        content: trimmed,
      };

      const assistantMessage: AssistantTranscriptMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: '',
        status: 'streaming',
        citations: undefined,
        consultedDocuments: undefined,
        reasoning: createInitialReasoningState(),
        tool: null,
        responseId: null,
        usage: null,
        createdAt: Date.now(),
        contentStartedAt: null,
      };

      const historyBeforeAssistant: TranscriptMessage[] = [...messagesRef.current, userMessage];
      const nextMessages: TranscriptMessage[] = [...historyBeforeAssistant, assistantMessage];
      messagesRef.current = nextMessages;
      activeAssistantIdRef.current = assistantMessage.id;
      setDraftState('');
      setChatErrorState(null);
      setMessages(nextMessages);

      return { pendingHistory: historyBeforeAssistant };
    },
    [],
  );

  const updateActiveAssistant = useCallback(
    (updater: (message: AssistantTranscriptMessage) => AssistantTranscriptMessage) => {
      const activeId = activeAssistantIdRef.current;
      if (!activeId) {
        return;
      }
      syncMessages(prev =>
        prev.map(message => {
          if (message.role === 'assistant' && message.id === activeId) {
            return updater(message);
          }
          return message;
        }),
      );
    },
    [syncMessages],
  );

  const clearActiveAssistant = useCallback(() => {
    activeAssistantIdRef.current = null;
  }, []);

  const resetTranscript = useCallback(() => {
    activeAssistantIdRef.current = null;
    messagesRef.current = [];
    setMessages([]);
    setDraftState('');
    setChatErrorState(null);
  }, []);

  useEffect(() => {
    resetTranscript();
  }, [resetTranscript, snapshotId]);

  const hasMessages = messages.length > 0;
  const isStreamingResponse = Boolean(activeAssistantIdRef.current);

  return {
    messages,
    draft,
    setDraft,
    chatError,
    setChatError,
    hasMessages,
    beginAssistantTurn,
    updateActiveAssistant,
    resetTranscript,
    clearActiveAssistant,
    isStreamingResponse,
  };
}
