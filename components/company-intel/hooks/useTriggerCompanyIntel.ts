 "use client";

// ------------------------------------------------------------------------------------------------
//                useTriggerCompanyIntel - Mutation hook to refresh company intel
// ------------------------------------------------------------------------------------------------

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  CompanyIntelStreamEvent,
  TriggerCompanyIntelInput,
  TriggerCompanyIntelResult,
} from '../types';
import { useCompanyIntelClient } from '../context';
import { toTriggerResult } from '../utils/serialization';
import { toHttpError } from '../utils/errors';

export interface UseTriggerCompanyIntelOptions {
  readonly stream?: boolean;
  readonly onEvent?: (event: CompanyIntelStreamEvent) => void;
  readonly resumeSnapshotId?: number | null;
}

export const useTriggerCompanyIntel = (options: UseTriggerCompanyIntelOptions = {}) => {
  const queryClient = useQueryClient();
  const { request } = useCompanyIntelClient();

  return useMutation<TriggerCompanyIntelResult, Error, TriggerCompanyIntelInput>({
    mutationFn: async (input) => {
      const wantsStream = Boolean(options.stream && options.onEvent);
      const resumeSnapshotId = typeof options.resumeSnapshotId === 'number' ? options.resumeSnapshotId : null;

      let response: Response;

      if (resumeSnapshotId && wantsStream) {
        response = await request(`/runs/${resumeSnapshotId}/stream`, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
          },
        });
      } else {
        response = await request('', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(wantsStream ? { Accept: 'text/event-stream' } : {}),
          },
          body: JSON.stringify(input),
        });
      }

      if (!response.ok) {
        throw await toHttpError(response, 'Unable to trigger company intel');
      }

      const contentType = response.headers.get('content-type') ?? '';
      const isEventStream = contentType.includes('text/event-stream');

      if (wantsStream && isEventStream) {
        const body = response.body;
        if (!body) {
          throw new Error('Streaming response did not include a readable body');
        }

        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamEnded = false;
        let finalResult: TriggerCompanyIntelResult | null = null;

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) {
              buffer += decoder.decode();
              break;
            }

            buffer += decoder.decode(value, { stream: true });

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
                streamEnded = true;
                break;
              }

              let event: CompanyIntelStreamEvent;
              try {
                event = JSON.parse(payload) as CompanyIntelStreamEvent;
              } catch {
                throw new Error('Failed to parse streaming payload');
              }

              options.onEvent?.(event);

              if (event.type === 'run-complete') {
                finalResult = event.result;
              } else if (event.type === 'run-error') {
                throw new Error(event.message);
              } else if (event.type === 'run-cancelled') {
                throw new Error(event.reason ?? 'Run cancelled');
              }
            }

            if (streamEnded) {
              break;
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (!finalResult) {
          throw new Error('Stream ended without completion event');
        }

        return finalResult;
      }

      const result = await response.json();
      return toTriggerResult(result.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-intel'] });
    },
  });
};
