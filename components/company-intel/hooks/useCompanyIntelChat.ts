"use client";

// ------------------------------------------------------------------------------------------------
//                useCompanyIntelChat - Fire-and-forget chat requests against snapshot knowledge base
// ------------------------------------------------------------------------------------------------

import { useMutation } from '@tanstack/react-query';

import { useCompanyIntelClient } from '../context';
import { toHttpError } from '../utils/errors';

export type CompanyIntelChatRole = 'user' | 'assistant' | 'system';

export interface CompanyIntelChatMessage {
  readonly role: CompanyIntelChatRole;
  readonly content: string;
}

export interface CompanyIntelChatCitationChunk {
  readonly text: string;
}

export interface CompanyIntelChatCitation {
  readonly fileId: string;
  readonly filename?: string;
  readonly score?: number;
  readonly chunks?: readonly CompanyIntelChatCitationChunk[];
}

export interface CompanyIntelChatResult {
  readonly message: string | null;
  readonly responseId: string;
  readonly usage?: Record<string, unknown> | null;
  readonly citations?: readonly CompanyIntelChatCitation[];
}

export interface CompanyIntelChatRequest {
  readonly snapshotId: number;
  readonly messages: readonly CompanyIntelChatMessage[];
}

export const useCompanyIntelChat = () => {
  const { request } = useCompanyIntelClient();

  return useMutation<CompanyIntelChatResult, Error, CompanyIntelChatRequest>({
    mutationFn: async ({ snapshotId, messages }) => {
      if (!Number.isFinite(snapshotId)) {
        throw new Error('snapshotId is required to start a chat');
      }

      const response = await request(`/snapshots/${snapshotId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw await toHttpError(response, 'Unable to complete chat request');
      }

      const payload = await response.json();
      return (payload?.data ?? null) as CompanyIntelChatResult;
    },
  });
};

export type UseCompanyIntelChatResult = ReturnType<typeof useCompanyIntelChat>;
