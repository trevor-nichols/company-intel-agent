import type { CompanyIntelChatCitation, UseCompanyIntelChatResult } from '../../../../hooks';
import type { CompanyIntelChatToolStatus } from '@/shared/company-intel/chat';

export type TranscriptMessage = UserTranscriptMessage | AssistantTranscriptMessage;

export interface UserTranscriptMessage {
  readonly id: string;
  readonly role: 'user';
  readonly content: string;
}

export interface AssistantTranscriptMessage {
  readonly id: string;
  readonly role: 'assistant';
  readonly content: string;
  readonly status: 'streaming' | 'complete' | 'failed';
  readonly citations?: readonly CompanyIntelChatCitation[];
  readonly reasoning: AssistantReasoningState;
  readonly tool?: AssistantToolState | null;
  readonly responseId?: string | null;
  readonly usage?: Record<string, unknown> | null;
}

export interface AssistantReasoningState {
  readonly headline: string | null;
  readonly segments: Record<number, string>;
  readonly isStreaming: boolean;
}

export interface AssistantToolState {
  readonly tool: string;
  readonly status: CompanyIntelChatToolStatus;
}

export type ChatMutationAdapter = Pick<UseCompanyIntelChatResult, 'mutateAsync' | 'isPending' | 'reset' | 'cancel'>;
