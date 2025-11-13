// ------------------------------------------------------------------------------------------------
//                validation.ts - Chat request validation helpers
// ------------------------------------------------------------------------------------------------

import type { CompanyIntelChatMessage } from '@/shared/company-intel/chat';
import { COMPANY_INTEL_CHAT_MAX_MESSAGES } from '@/shared/company-intel/chat';

export interface ChatValidationSuccess {
  readonly ok: true;
  readonly messages: readonly CompanyIntelChatMessage[];
}

export interface ChatValidationFailure {
  readonly ok: false;
  readonly status: number;
  readonly message: string;
}

export type ChatValidationResult = ChatValidationSuccess | ChatValidationFailure;

export function validateChatRequestBody(
  payload: unknown,
  maxMessages = COMPANY_INTEL_CHAT_MAX_MESSAGES,
): ChatValidationResult {
  if (!payload || typeof payload !== 'object') {
    return invalid('Invalid JSON payload');
  }

  const messagesValue = (payload as { messages?: unknown }).messages;
  if (!Array.isArray(messagesValue)) {
    return invalid('messages array is required');
  }

  if (messagesValue.length === 0) {
    return invalid('messages array is required');
  }

  if (messagesValue.length > maxMessages) {
    return invalid(`messages cannot exceed ${maxMessages} entries`);
  }

  const normalized: CompanyIntelChatMessage[] = [];

  for (const entry of messagesValue) {
    if (!entry || typeof entry !== 'object') {
      return invalid('Each message must be an object');
    }

    const role = (entry as { role?: unknown }).role;
    const contentRaw = (entry as { content?: unknown }).content;
    const content = typeof contentRaw === 'string' ? contentRaw.trim() : '';

    if ((role !== 'user' && role !== 'assistant' && role !== 'system') || content.length === 0) {
      return invalid('Each message must include a role and non-empty content');
    }

    normalized.push({
      role,
      content,
    });
  }

  return { ok: true, messages: normalized };
}

function invalid(message: string): ChatValidationFailure {
  return {
    ok: false,
    status: 400,
    message,
  };
}
