import React from 'react';
import { MessageCircle } from 'lucide-react';

import { ScrollArea } from '@agenai/ui/scroll-area';

import type { TranscriptMessage } from '../types';
import { AssistantMessage } from './messages/AssistantMessage';
import { UserMessage } from './messages/UserMessage';

interface ChatTranscriptProps {
  readonly messages: readonly TranscriptMessage[];
  readonly viewportRef: (node: HTMLDivElement | null) => void;
}

export function ChatTranscript({ messages, viewportRef }: ChatTranscriptProps): React.ReactElement {
  return (
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
  );
}
