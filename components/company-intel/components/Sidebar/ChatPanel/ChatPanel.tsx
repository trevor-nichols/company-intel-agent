"use client";

// ------------------------------------------------------------------------------------------------
//                ChatPanel - Sidebar chat card for snapshot knowledge conversations
// ------------------------------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { AlertTriangle, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@agenai/ui/alert';
import { Badge } from '@agenai/ui/badge';
import { Button } from '@agenai/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@agenai/ui/card';
import { ScrollArea } from '@agenai/ui/scroll-area';
import { Textarea } from '@agenai/ui/textarea';
import { MinimalMarkdown } from '@agenai/ui/minimal-markdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@agenai/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import type { Components } from 'react-markdown';
import type { CompanyIntelVectorStoreStatus } from '../../../types';
import {
  useCompanyIntelChat,
  type CompanyIntelChatCitation,
  type CompanyIntelChatMessage,
  type UseCompanyIntelChatResult,
} from '../../../hooks';

type ChatMutationAdapter = Pick<UseCompanyIntelChatResult, 'mutateAsync' | 'isPending' | 'reset'>;

interface ChatPanelProps {
  readonly snapshotId: number;
  readonly domain?: string | null;
  readonly vectorStoreStatus: CompanyIntelVectorStoreStatus;
  readonly vectorStoreError: string | null;
  readonly completedAt: Date | null;
  readonly isRunInProgress?: boolean;
  readonly chatAdapter?: ChatMutationAdapter;
}

interface TranscriptMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly citations?: readonly CompanyIntelChatCitation[];
}

const STATUS_LABELS: Record<CompanyIntelVectorStoreStatus, string> = {
  ready: 'Ready',
  pending: 'Queued',
  publishing: 'Publishing',
  failed: 'Unavailable',
};

export function ChatPanel(props: ChatPanelProps): ReactElement {
  const {
    snapshotId,
    domain,
    vectorStoreStatus,
    vectorStoreError,
    completedAt,
    isRunInProgress = false,
    chatAdapter,
  } = props;

  const defaultChatMutation = useCompanyIntelChat();
  const chatMutation = chatAdapter ?? defaultChatMutation;
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const isVectorReady = vectorStoreStatus === 'ready';
  const isVectorFailed = vectorStoreStatus === 'failed';
  const isSending = chatMutation.isPending;
  const composerDisabled = !isVectorReady || isRunInProgress || isSending;
  const helperText = isVectorReady
    ? 'Press Ctrl+Enter to send. Shift+Enter adds a new line.'
    : 'Chat unlocks when the knowledge base finishes publishing.';
  const statusBadgeVariant = isVectorReady ? 'secondary' : 'outline';
  const placeholder = isVectorReady
    ? `Ask how ${domain ?? 'this company'} positions itself…`
    : 'Preparing the knowledge base…';

  const statusNotice = useMemo(() => {
    if (isRunInProgress) {
      return 'A refresh is currently running. Chat will resume when the run completes.';
    }
    if (isVectorReady) {
      return 'Ask targeted questions about the latest snapshot. Responses cite the underlying pages.';
    }
    if (vectorStoreStatus === 'publishing') {
      return 'We are packaging the scraped pages into an OpenAI vector store. Hang tight, this usually takes under a minute.';
    }
    if (vectorStoreStatus === 'pending') {
      return 'The knowledge base is queued for publishing. It will unlock automatically once ready.';
    }
    if (vectorStoreStatus === 'failed') {
      return 'We were unable to publish the knowledge base for this snapshot.';
    }
    return null;
  }, [isRunInProgress, isVectorReady, vectorStoreStatus]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    setDraft('');
    setChatError(null);
  }, [snapshotId]);

  const submitMessage = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (composerDisabled) {
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: TranscriptMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmed,
    };

    const history = [...messages, userMessage];
    setMessages(history);
    setDraft('');
    setChatError(null);

    try {
      const result = await chatMutation.mutateAsync({
        snapshotId,
        messages: toChatMessages(history),
      });

      const assistantCopy = result?.message?.trim().length ? result?.message ?? '' : 'I wasn’t able to find that in the snapshot.';
      setMessages(prev => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: assistantCopy,
          citations: result?.citations,
        },
      ]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Unable to complete the chat request.');
    }
  }, [composerDisabled, draft, messages, chatMutation, snapshotId]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void submitMessage();
      }
    },
    [submitMessage],
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setDraft('');
    setChatError(null);
    chatMutation.reset();
  }, [chatMutation]);

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Snapshot chat</CardTitle>
          <Badge variant={statusBadgeVariant}>{STATUS_LABELS[vectorStoreStatus]}</Badge>
        </div>
        <CardDescription>
          {domain ? `Latest run for ${domain}` : 'Latest completed run'}
          {completedAt ? ` · ${completedAt.toLocaleString()}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusNotice ? (
          <div className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {statusNotice}
          </div>
        ) : null}

        {isVectorFailed && vectorStoreError ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <AlertTitle>Knowledge base unavailable</AlertTitle>
            <AlertDescription>{vectorStoreError}</AlertDescription>
          </Alert>
        ) : null}

        <ScrollArea className="h-72 rounded-md border bg-card">
          <div className="flex h-full flex-col gap-3 p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                <MessageCircle className="h-10 w-10 text-muted" aria-hidden />
                <p>When you ask a question, answers stream back with citations to the scraped pages.</p>
              </div>
            ) : (
              messages.map(message => (
                <ChatMessageBubble key={message.id} message={message} />
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {chatError ? (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <AlertTitle>Unable to send message</AlertTitle>
            <AlertDescription>{chatError}</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-2" onSubmit={event => void submitMessage(event)}>
          <Textarea
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={3}
            disabled={composerDisabled}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{helperText}</span>
            <div className="flex items-center gap-2">
              {messages.length > 0 ? (
                <Button type="button" variant="ghost" size="sm" onClick={clearConversation} disabled={isSending}>
                  Clear
                </Button>
              ) : null}
              <Button type="submit" size="sm" disabled={composerDisabled}>
                {isSending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ChatMessageBubble({ message }: { readonly message: TranscriptMessage }): ReactElement {
  const isUser = message.role === 'user';
  const { content, markerMap } = useMemo(
    () => prepareCitationRendering(message.content, message.citations),
    [message.content, message.citations],
  );
  const markdownComponents = useMemo(() => buildCitationComponents(markerMap), [markerMap]);

  const bubble = (
    <div
      className={cn(
        'max-w-full rounded-lg border px-3 py-2 shadow-sm md:max-w-[85%]',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-foreground',
      )}
    >
      {isUser ? (
        <span>{message.content}</span>
      ) : (
        <MinimalMarkdown content={content} className="text-sm" components={markdownComponents} />
      )}
    </div>
  );

  return (
    <div className={cn('flex flex-col gap-2 text-sm', isUser ? 'items-end text-right' : 'items-start text-left')}>
      {isUser ? bubble : (
        <TooltipProvider delayDuration={120} skipDelayDuration={0}>
          {bubble}
        </TooltipProvider>
      )}
    </div>
  );
}

function toChatMessages(history: readonly TranscriptMessage[]): CompanyIntelChatMessage[] {
  return history.map(message => ({ role: message.role, content: message.content }));
}

function createMessageId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface CitationMarkerDescriptor {
  readonly href: string;
  readonly ordinal: number;
  readonly superscript: string;
  readonly citation: CompanyIntelChatCitation;
}

type CitationMarkerMap = Record<string, CitationMarkerDescriptor>;

function prepareCitationRendering(content: string, citations?: readonly CompanyIntelChatCitation[]): {
  readonly content: string;
  readonly markerMap: CitationMarkerMap;
} {
  if (!content || !citations || citations.length === 0) {
    return { content, markerMap: {} };
  }

  const resolved = citations
    .map(citation => ({
      citation,
      resolvedIndex: resolveInsertionIndex(content, citation),
    }))
    .filter((entry): entry is { citation: CompanyIntelChatCitation; resolvedIndex: number } =>
      typeof entry.resolvedIndex === 'number',
    )
    .sort((a, b) => a.resolvedIndex - b.resolvedIndex)
    .map((entry, index) => ({
      ...entry,
      ordinal: index + 1,
    }));

  if (resolved.length === 0) {
    return { content, markerMap: {} };
  }

  let nextContent = content;
  const markerMap: CitationMarkerMap = {};

  const descending = [...resolved].sort((a, b) => b.resolvedIndex - a.resolvedIndex);

  for (const entry of descending) {
    const ordinal = entry.ordinal;
    const key = `c${ordinal}`;
    const href = `citation:${key}`;
    const superscript = toSuperscript(ordinal);
    const insertionIndex = clamp(entry.resolvedIndex, 0, nextContent.length);
    nextContent = `${nextContent.slice(0, insertionIndex)}[${superscript}](${href})${nextContent.slice(insertionIndex)}`;
    markerMap[href] = {
      href,
      ordinal,
      superscript,
      citation: entry.citation,
    } satisfies CitationMarkerDescriptor;
  }

  return { content: nextContent, markerMap };
}

function buildCitationComponents(markerMap: CitationMarkerMap): Components | undefined {
  const hasMarkers = Object.keys(markerMap).length > 0;
  if (!hasMarkers) {
    return undefined;
  }

  const defaultAnchor = ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline-offset-4 hover:underline"
      {...rest}
    >
      {children}
    </a>
  );

  return {
    a: props => {
      const { href } = props;
      if (href && markerMap[href]) {
        return <CitationMarker marker={markerMap[href]} />;
      }
      return defaultAnchor(props);
    },
  } satisfies Components;
}

function CitationMarker({ marker }: { readonly marker: CitationMarkerDescriptor }): ReactElement {
  const label = marker.citation.filename ?? marker.citation.fileId;
  const snippet = marker.citation.quote
    ?? marker.citation.chunks?.[0]?.text
    ?? undefined;
  const score = typeof marker.citation.score === 'number' ? marker.citation.score : undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={`View source ${marker.ordinal}`}
          className="cursor-help px-0.5 text-sm font-semibold text-primary align-super"
        >
          {marker.superscript}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" sideOffset={8} className="max-w-xs text-xs">
        <div className="space-y-1 text-left">
          <p className="font-medium text-foreground">{label}</p>
          {typeof score === 'number' ? (
            <p className="text-muted-foreground">Score: {Math.round(score * 100) / 100}</p>
          ) : null}
          {snippet ? (
            <p className="text-muted-foreground">“{snippet.trim()}”</p>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function resolveInsertionIndex(content: string, citation: CompanyIntelChatCitation): number | undefined {
  const quote = citation.quote ?? citation.chunks?.[0]?.text ?? '';
  if (typeof citation.index === 'number') {
    const offset = clamp(citation.index, 0, content.length);
    const width = quote.length > 0 ? quote.length : 0;
    return clamp(offset + width, 0, content.length);
  }

  if (quote.length > 0) {
    const location = content.indexOf(quote);
    if (location >= 0) {
      return clamp(location + quote.length, 0, content.length);
    }
  }

  return content.length;
}

function toSuperscript(value: number): string {
  const SUPERSCRIPT_DIGITS: Record<string, string> = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
  };

  return value
    .toString()
    .split('')
    .map(char => SUPERSCRIPT_DIGITS[char] ?? char)
    .join('');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
