"use client";

// ------------------------------------------------------------------------------------------------
//                useCompanyIntelChat - Fire-and-forget (or streaming) chat requests
// ------------------------------------------------------------------------------------------------

import { useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import type {
  CompanyIntelChatMessage,
  CompanyIntelChatResult,
  CompanyIntelChatStreamEvent,
} from '@/shared/company-intel/chat';
import { useCompanyIntelClient } from '../context';
import { toHttpError } from '../utils/errors';

export interface CompanyIntelChatRequest {
  readonly snapshotId: number;
  readonly messages: readonly CompanyIntelChatMessage[];
}

export interface UseCompanyIntelChatOptions {
  readonly onEvent?: (event: CompanyIntelChatStreamEvent) => void;
}

type CompanyIntelMutationResult = UseMutationResult<CompanyIntelChatResult, Error, CompanyIntelChatRequest> & {
  cancel: () => void;
};

export const useCompanyIntelChat = (options: UseCompanyIntelChatOptions = {}) => {
  const { request } = useCompanyIntelClient();
  const abortRef = useRef<AbortController | null>(null);
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const mutation = useMutation<CompanyIntelChatResult, Error, CompanyIntelChatRequest>({
    mutationFn: async ({ snapshotId, messages }) => {
      if (!Number.isFinite(snapshotId)) {
        throw new Error('snapshotId is required to start a chat');
      }

      const path = `/snapshots/${snapshotId}/chat/stream`;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await request(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await toHttpError(response, 'Unable to complete chat request');
      }

      const contentType = response.headers.get('content-type') ?? '';
      const isEventStream = contentType.includes('text/event-stream');

      try {
        if (isEventStream) {
          const handler = options.onEvent ?? (() => {});
          return await consumeChatStream(response, handler);
        }

        throw new Error('Chat endpoint must stream results. Verify Accept: text/event-stream.');
      } finally {
        abortRef.current = null;
      }
    },
  });

  const mutationWithCancel = mutation as CompanyIntelMutationResult;
  mutationWithCancel.cancel = cancel;

  return mutationWithCancel;
};

export type UseCompanyIntelChatResult = ReturnType<typeof useCompanyIntelChat>;

async function consumeChatStream(
  response: Response,
  onEvent: (event: CompanyIntelChatStreamEvent) => void,
): Promise<CompanyIntelChatResult> {
  const body = response.body;
  if (!body) {
    throw new Error('Streaming response did not include a readable body');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;
  let finalMessage: CompanyIntelChatResult | null = null;
  let usage: Record<string, unknown> | null | undefined = undefined;
  let responseId: string | null = null;

  try {
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) {
        buffer += decoder.decode();
        done = true;
      } else if (value) {
        buffer += decoder.decode(value, { stream: true });
      }

      while (true) {
        const separatorIndex = buffer.indexOf('\n\n');
        if (separatorIndex === -1) {
          break;
        }

        const chunk = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        if (!chunk.trim()) {
          continue;
        }

        const dataLines = chunk
          .split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).trimStart());

        if (dataLines.length === 0) {
          continue;
        }

        const payload = dataLines.join('');
        if (payload === '[DONE]') {
          done = true;
          break;
        }

        let event: CompanyIntelChatStreamEvent;
        try {
          event = JSON.parse(payload) as CompanyIntelChatStreamEvent;
        } catch {
          throw new Error('Failed to parse chat stream payload');
        }

        if (!responseId && event.responseId) {
          responseId = event.responseId;
        }

        onEvent(event);

        if (event.type === 'chat-error') {
          throw new Error(event.message);
        }

        if (event.type === 'chat-message-complete') {
          const resolvedResponseId: string = event.responseId ?? responseId ?? '';
          responseId = resolvedResponseId;
          finalMessage = {
            message: event.message ?? null,
            responseId: resolvedResponseId,
            citations: event.citations,
            usage: null,
          };
        } else if (event.type === 'chat-usage') {
          usage = event.usage ?? null;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalMessage) {
    throw new Error('Stream ended without completion event');
  }

  return {
    ...finalMessage,
    usage: usage ?? finalMessage.usage,
  };
}
