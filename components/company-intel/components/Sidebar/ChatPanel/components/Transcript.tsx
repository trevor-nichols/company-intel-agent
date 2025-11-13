import React from 'react';
import { ArrowDown, MessageCircle } from 'lucide-react';

import { ScrollArea } from '@agenai/ui/scroll-area';

import type { TranscriptMessage } from '../types';
import { AssistantMessage } from './messages/AssistantMessage';
import { UserMessage } from './messages/UserMessage';

interface ChatTranscriptProps {
  readonly messages: readonly TranscriptMessage[];
  readonly viewportRef: (node: HTMLDivElement | null) => void;
  readonly isPinned: boolean;
  readonly onJumpToLatest: () => void;
}

export function ChatTranscript({ messages, viewportRef, isPinned, onJumpToLatest }: ChatTranscriptProps): React.ReactElement {
  return (
    <div className="relative">
      <ScrollArea className="h-72 rounded-md border bg-card" viewportRef={viewportRef}>
        <div className="flex h-full flex-col gap-3 p-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
              <MessageCircle className="h-10 w-10 text-muted" aria-hidden />
              <p>Ask targeted questions about the latest snapshot.</p>
            </div>
          ) : (
            messages.map(message =>
              message.role === 'user' ? (
                <UserMessage key={message.id} message={message} />
              ) : (
                <AssistantMessage key={message.id} message={message} />
              ),
            )
          )}
        </div>
      </ScrollArea>

      {!isPinned ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <button
            type="button"
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/95 px-3 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-background"
            onClick={onJumpToLatest}
          >
            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
            Jump to latest
          </button>
        </div>
      ) : null}
    </div>
  );
}
