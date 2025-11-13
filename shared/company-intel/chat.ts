// ------------------------------------------------------------------------------------------------
//                chat.ts - Shared contracts for the snapshot chat experience
// ------------------------------------------------------------------------------------------------

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
  readonly index?: number;
  readonly quote?: string;
}

export interface CompanyIntelChatResult {
  readonly message: string | null;
  readonly responseId: string;
  readonly usage?: Record<string, unknown> | null;
  readonly citations?: readonly CompanyIntelChatCitation[];
}

export interface CompanyIntelChatStreamBaseEvent {
  readonly snapshotId: number;
  readonly responseId?: string | null;
}

export type CompanyIntelChatToolStatus = 'in_progress' | 'searching' | 'completed';

export interface CompanyIntelChatStreamStartEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-stream-start';
  readonly model?: string | null;
}

export interface CompanyIntelChatReasoningDeltaEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-reasoning-delta';
  readonly summaryIndex: number;
  readonly delta: string;
}

export interface CompanyIntelChatReasoningSummaryEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-reasoning-summary';
  readonly summaryIndex: number;
  readonly text: string;
  readonly headline: string | null;
}

export interface CompanyIntelChatToolEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-tool-status';
  readonly tool: string;
  readonly status: CompanyIntelChatToolStatus;
}

export interface CompanyIntelChatMessageDeltaEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-message-delta';
  readonly delta: string;
}

export interface CompanyIntelChatMessageCompleteEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-message-complete';
  readonly message: string | null;
  readonly citations?: readonly CompanyIntelChatCitation[];
}

export interface CompanyIntelChatUsageEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-usage';
  readonly usage?: Record<string, unknown> | null;
}

export interface CompanyIntelChatCompleteEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-complete';
}

export interface CompanyIntelChatErrorEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-error';
  readonly message: string;
}

export type CompanyIntelChatStreamEvent =
  | CompanyIntelChatStreamStartEvent
  | CompanyIntelChatReasoningDeltaEvent
  | CompanyIntelChatReasoningSummaryEvent
  | CompanyIntelChatToolEvent
  | CompanyIntelChatMessageDeltaEvent
  | CompanyIntelChatMessageCompleteEvent
  | CompanyIntelChatUsageEvent
  | CompanyIntelChatCompleteEvent
  | CompanyIntelChatErrorEvent;

export const COMPANY_INTEL_CHAT_MAX_MESSAGES = 20;
