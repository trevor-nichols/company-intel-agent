"use client";

// ------------------------------------------------------------------------------------------------
//                ChatPanel - Sidebar chat card for snapshot knowledge conversations
// ------------------------------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo } from 'react';
import { Badge } from '@agenai/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@agenai/ui/card';

import type { CompanyIntelVectorStoreStatus } from '../../../types';
import type { ChatMutationAdapter } from './types';
import { ChatComposer } from './components/ChatComposer';
import { ChatStatusBanner } from './components/ChatStatusBanner';
import { ChatTranscript } from './components/Transcript';
import { useAutoScroll } from './hooks/useAutoScroll';
import { useChatStreaming } from './hooks/useChatStreaming';
import { useChatTranscript } from './hooks/useChatTranscript';

const STATUS_LABELS: Record<CompanyIntelVectorStoreStatus, string> = {
  ready: 'Ready',
  pending: 'Queued',
  publishing: 'Publishing',
  failed: 'Unavailable',
};

interface ChatPanelProps {
  readonly snapshotId: number;
  readonly domain?: string | null;
  readonly vectorStoreStatus: CompanyIntelVectorStoreStatus;
  readonly vectorStoreError: string | null;
  readonly completedAt: Date | null;
  readonly isRunInProgress?: boolean;
  readonly chatAdapter?: ChatMutationAdapter;
}

export function ChatPanel(props: ChatPanelProps): React.ReactElement {
  const {
    snapshotId,
    domain,
    vectorStoreStatus,
    vectorStoreError,
    completedAt,
    isRunInProgress = false,
    chatAdapter,
  } = props;

  const transcript = useChatTranscript({ snapshotId });
  const { setViewport, scrollIfPinned, reset, pinToBottom, isPinned } = useAutoScroll();
  const { submitMessage, stopStreaming, isSending } = useChatStreaming({
    snapshotId,
    transcript,
    chatAdapter,
  });

  const isVectorReady = vectorStoreStatus === 'ready';
  const isVectorFailed = vectorStoreStatus === 'failed';
  const isStreamingResponse = transcript.isStreamingResponse;
  const inputDisabled = !isVectorReady || isRunInProgress || isSending;
  const submitDisabled = inputDisabled || isStreamingResponse;
  const helperText = !isVectorReady
    ? 'Chat unlocks when the knowledge base finishes publishing.'
    : 'Press Ctrl+Enter to send. Shift+Enter adds a new line.';
  const statusBadgeVariant = isVectorReady ? 'secondary' : 'outline';
  const placeholder = isVectorReady
    ? `Ask how ${domain ?? 'this company'} positions itself…`
    : 'Preparing the knowledge base…';

  const statusNotice = useMemo(() => {
    if (isRunInProgress) {
      return 'A refresh is currently running. Chat will resume when the run completes.';
    }
    if (isVectorReady) {
      return null;
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
    scrollIfPinned(transcript.isStreamingResponse ? 'smooth' : 'auto');
  }, [scrollIfPinned, transcript.isStreamingResponse, transcript.messages]);

  useEffect(() => {
    reset();
  }, [reset, snapshotId]);

  const handleSubmit = useCallback(async () => {
    reset();
    await submitMessage();
  }, [reset, submitMessage]);

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
        <ChatStatusBanner statusNotice={statusNotice} isVectorFailed={isVectorFailed} vectorStoreError={vectorStoreError} />

        <ChatTranscript
          messages={transcript.messages}
          viewportRef={setViewport}
          isPinned={isPinned}
          onJumpToLatest={() => pinToBottom('smooth')}
        />

        <ChatComposer
          value={transcript.draft}
          onChange={transcript.setDraft}
          onSubmit={() => void handleSubmit()}
          placeholder={placeholder}
          inputDisabled={inputDisabled}
          submitDisabled={submitDisabled}
          helperText={helperText}
          isStreaming={isStreamingResponse}
          onStop={stopStreaming}
        />
      </CardContent>
    </Card>
  );
}
