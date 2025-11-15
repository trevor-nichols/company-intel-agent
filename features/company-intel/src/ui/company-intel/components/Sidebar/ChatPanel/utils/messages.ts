import type { CompanyIntelChatMessage } from '../../../../hooks';
import type { TranscriptMessage } from '../types';

export function toChatMessages(history: readonly TranscriptMessage[]): CompanyIntelChatMessage[] {
  return history
    .filter(message => {
      if (message.role === 'user') {
        return true;
      }
      return message.status === 'complete';
    })
    .map(message => ({ role: message.role, content: message.content }));
}

export function isAbortError(error: unknown): boolean {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return error.name === 'AbortError';
  }
  return error instanceof Error && error.name === 'AbortError';
}

export function createMessageId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
