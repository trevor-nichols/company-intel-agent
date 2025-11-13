// ------------------------------------------------------------------------------------------------
//                chat.ts - Shared contracts for the snapshot chat experience
// ------------------------------------------------------------------------------------------------

type CompanyIntelChatRole = 'user' | 'assistant' | 'system';

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

export interface CompanyIntelConsultedDocument {
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
  readonly consultedDocuments?: readonly CompanyIntelConsultedDocument[];
}

interface CompanyIntelChatStreamBaseEvent {
  readonly snapshotId: number;
  readonly responseId?: string | null;
}

export type CompanyIntelChatToolStatus = 'in_progress' | 'searching' | 'completed' | 'cancelled';

interface CompanyIntelChatStreamStartEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-stream-start';
  readonly model?: string | null;
}

interface CompanyIntelChatReasoningDeltaEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-reasoning-delta';
  readonly summaryIndex: number;
  readonly delta: string;
}

interface CompanyIntelChatReasoningSummaryEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-reasoning-summary';
  readonly summaryIndex: number;
  readonly text: string;
  readonly headline: string | null;
}

interface CompanyIntelChatToolEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-tool-status';
  readonly tool: string;
  readonly status: CompanyIntelChatToolStatus;
}

interface CompanyIntelChatMessageDeltaEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-message-delta';
  readonly delta: string;
}

interface CompanyIntelChatMessageCompleteEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-message-complete';
  readonly message: string | null;
  readonly citations?: readonly CompanyIntelChatCitation[];
  readonly consultedDocuments?: readonly CompanyIntelConsultedDocument[];
}

interface CompanyIntelChatUsageEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-usage';
  readonly usage?: Record<string, unknown> | null;
}

interface CompanyIntelChatCompleteEvent extends CompanyIntelChatStreamBaseEvent {
  readonly type: 'chat-complete';
}

interface CompanyIntelChatErrorEvent extends CompanyIntelChatStreamBaseEvent {
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
