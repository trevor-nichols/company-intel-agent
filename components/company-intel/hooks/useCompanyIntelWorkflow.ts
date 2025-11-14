"use client";

// ------------------------------------------------------------------------------------------------
//                useCompanyIntelWorkflow - Centralized state + actions for company intel UI
// ------------------------------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type {
  CompanyIntelPreviewResult,
  CompanyIntelSelection,
  CompanyIntelRunStage,
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyIntelStreamEvent,
  CompanyProfile,
  CompanyProfileKeyOffering,
  CompanyProfileSnapshot,
  CompanyIntelVectorStoreStatus,
} from '../types';
import { useCompanyIntelClient } from '../context';
import { useCompanyIntel } from './useCompanyIntel';
import { useTriggerCompanyIntel } from './useTriggerCompanyIntel';
import { useCancelCompanyIntelRun } from './useCancelCompanyIntelRun';
import { HttpError, toHttpError } from '../utils/errors';
import { toCompanyProfileSnapshot } from '../utils/serialization';
import { useWorkflowProfileEditor } from './workflow/useWorkflowProfileEditor';
import { useWorkflowPreviewState } from './workflow/useWorkflowPreviewState';
import { initialWorkflowStreamState, workflowStreamReducer } from './workflow/streamReducer';

const RATE_LIMIT_MESSAGE = 'You’ve reached the demo rate limit. Please wait about a minute and try again.';

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpError && error.status === 429) {
    return RATE_LIMIT_MESSAGE;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

interface UseCompanyIntelWorkflowResult {
  readonly profile: CompanyProfile | null;
  readonly profileStatus: CompanyProfile['status'] | 'not_configured';
  readonly activeSnapshotId: number | null;
  readonly hasActiveRun: boolean;
  readonly snapshots: readonly CompanyProfileSnapshot[];
  readonly latestSnapshot: CompanyProfileSnapshot | null;
  readonly displayedSnapshot: CompanyProfileSnapshot | null;
  readonly chatSnapshot: {
    readonly snapshotId: number;
    readonly domain: string | null;
    readonly vectorStoreStatus: CompanyIntelVectorStoreStatus;
    readonly vectorStoreError: string | null;
    readonly completedAt: Date | null;
  } | null;
  readonly previewData: CompanyIntelPreviewResult | null;
  readonly recommendedSelections: readonly CompanyIntelSelection[];
  readonly manualSelectedUrls: readonly string[];
  readonly selectedUrls: readonly string[];
  readonly domain: string;
  readonly trimmedDomain: string;
  readonly errorMessage: string | null;
  readonly manualError: string | null;
  readonly statusMessages: readonly string[];
  readonly overviewDraft: string | null;
  readonly structuredSummaryDraft: CompanyIntelSnapshotStructuredProfileSummary | null;
  readonly structuredReasoningHeadlines: readonly string[];
  readonly overviewReasoningHeadlines: readonly string[];
  readonly structuredReasoningHeadline: string | null;
  readonly overviewReasoningHeadline: string | null;
  readonly faviconDraft: string | null;
  readonly loadedSnapshotId: number | null;
  readonly loadingSnapshotId: number | null;
  readonly manualUrl: string;
  readonly hasPreview: boolean;
  readonly isPreviewing: boolean;
  readonly isResuming: boolean;
  readonly isScraping: boolean;
  readonly isBusy: boolean;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isStreaming: boolean;
  readonly isCancelling: boolean;
  readonly streamStage: CompanyIntelRunStage | null;
  readonly streamProgress: { readonly completed: number; readonly total: number } | null;
  readonly onDomainChange: (value: string) => void;
  readonly onManualUrlChange: (value: string) => void;
  readonly addManualUrl: () => void;
  readonly removeManualUrl: (url: string) => void;
  readonly toggleSelection: (url: string, checked: boolean) => void;
  readonly loadSnapshotIntoEditor: (snapshotId: number) => Promise<void>;
  readonly cancelActiveRun: () => Promise<void>;
  readonly submit: () => Promise<void>;
  readonly startOver: () => void;
  readonly profileEditor: {
    readonly saveOverview: (value: string | null) => Promise<void>;
    readonly savePrimaryIndustries: (values: readonly string[]) => Promise<void>;
    readonly saveValueProps: (values: readonly string[]) => Promise<void>;
    readonly saveKeyOfferings: (values: readonly CompanyProfileKeyOffering[]) => Promise<void>;
    readonly saveIdentity: (input: { companyName: string | null; tagline: string | null }) => Promise<void>;
    readonly isSavingOverview: boolean;
    readonly isSavingPrimaryIndustries: boolean;
    readonly isSavingValueProps: boolean;
    readonly isSavingKeyOfferings: boolean;
    readonly isSavingIdentity: boolean;
  };
}

interface VectorStoreOverride {
  readonly status: CompanyIntelVectorStoreStatus;
  readonly error: string | null;
}

export const useCompanyIntelWorkflow = (): UseCompanyIntelWorkflowResult => {
  const { request } = useCompanyIntelClient();
  const companyIntelQuery = useCompanyIntel();
  const {
    data: companyIntelData,
    isLoading,
    isError,
    refetch,
  } = companyIntelQuery;
  const queryProfileStatus = companyIntelData?.profile?.status ?? null;
  const profileStatusFromQuery = queryProfileStatus ?? 'not_configured';
  const profile = companyIntelData?.profile ?? null;
  const activeSnapshotId = profile?.activeSnapshotId ?? null;

  const previewState = useWorkflowPreviewState({ profileDomain: profile?.domain ?? null });
  const {
    domain,
    trimmedDomain,
    previewData,
    recommendedSelections,
    manualSelectedUrls,
    selectedUrls,
    manualUrl,
    manualError,
    hasPreview,
    previewMutation,
    handleDomainChange,
    handleManualUrlChange,
    addManualUrl,
    removeManualUrl,
    toggleSelection,
    resetPreviewState,
    setPreviewDomain,
    replaceSelections,
    clearManualError,
    setDomainMode,
    setDomainFromSnapshot,
  } = previewState;

  const profileEditor = useWorkflowProfileEditor();

  const [streamState, dispatchStreamAction] = useReducer(workflowStreamReducer, initialWorkflowStreamState);
  const {
    isStreamActive,
    streamStage,
    streamProgress,
    streamSnapshotId,
    overviewDraft,
    structuredSummaryDraft,
    structuredReasoningHeadlinesDraft,
    overviewReasoningHeadlinesDraft,
    faviconDraft,
  } = streamState;

  const [vectorStoreOverrides, setVectorStoreOverrides] = useState<Record<number, VectorStoreOverride>>({});
  const [loadingSnapshotId, setLoadingSnapshotId] = useState<number | null>(null);
  const [loadedSnapshotId, setLoadedSnapshotId] = useState<number | null>(null);
  const [snapshotOverride, setSnapshotOverride] = useState<CompanyProfileSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileStatusOverride, setProfileStatusOverride] = useState<CompanyProfile['status'] | null>(null);
  const lastResumeSnapshotIdRef = useRef<number | null>(null);
  const runBaselineStatusRef = useRef<CompanyProfile['status'] | 'not_configured'>('not_configured');

  const handleStreamEvent = useCallback(
    (event: CompanyIntelStreamEvent) => {
      dispatchStreamAction({ type: 'event', event });

      switch (event.type) {
        case 'snapshot-created':
          setSnapshotOverride(null);
          setLoadedSnapshotId(null);
          setLoadingSnapshotId(null);
          lastResumeSnapshotIdRef.current = event.snapshotId;
          runBaselineStatusRef.current = profileStatusFromQuery;
          setProfileStatusOverride('refreshing');
          break;
        case 'vector-store-status':
          setVectorStoreOverrides(prev => {
            const current = prev[event.snapshotId];
            const nextOverride: VectorStoreOverride = {
              status: event.status,
              error: event.error ?? null,
            };
            if (current && current.status === nextOverride.status && current.error === nextOverride.error) {
              return prev;
            }
            return {
              ...prev,
              [event.snapshotId]: nextOverride,
            };
          });
          if (event.status === 'ready' || event.status === 'failed') {
            void refetch();
          }
          break;
        case 'structured-complete':
          setSnapshotOverride(null);
          setLoadedSnapshotId(event.snapshotId);
          break;
        case 'run-complete':
          lastResumeSnapshotIdRef.current = event.snapshotId;
          void refetch();
          setProfileStatusOverride('ready');
          setVectorStoreOverrides(prev => {
            if (prev[event.snapshotId]) {
              const rest = { ...prev };
              delete rest[event.snapshotId];
              return rest;
            }
            return prev;
          });
          setSnapshotOverride(null);
          setLoadedSnapshotId(event.snapshotId);
          setLoadingSnapshotId(null);
          break;
        case 'run-error':
          lastResumeSnapshotIdRef.current = event.snapshotId;
          void refetch();
          setProfileStatusOverride('failed');
          setVectorStoreOverrides(prev => {
            if (prev[event.snapshotId]) {
              const rest = { ...prev };
              delete rest[event.snapshotId];
              return rest;
            }
            return prev;
          });
          setSnapshotOverride(null);
          setLoadedSnapshotId(null);
          setLoadingSnapshotId(null);
          break;
        case 'run-cancelled':
          lastResumeSnapshotIdRef.current = event.snapshotId;
          setErrorMessage(event.reason ?? 'Company intel run cancelled.');
          setProfileStatusOverride(runBaselineStatusRef.current);
          void refetch();
          setSnapshotOverride(null);
          setLoadedSnapshotId(null);
          setLoadingSnapshotId(null);
          break;
        default:
          break;
      }
    },
    [profileStatusFromQuery, refetch],
  );

  const triggerMutation = useTriggerCompanyIntel({ onEvent: handleStreamEvent });
  const resumeMutation = useTriggerCompanyIntel({ onEvent: handleStreamEvent, resumeSnapshotId: activeSnapshotId ?? undefined });
  const cancelRunMutation = useCancelCompanyIntelRun();

  const handleDomainChangeWithErrorReset = useCallback(
    (value: string) => {
      setErrorMessage(null);
      handleDomainChange(value);
    },
    [handleDomainChange],
  );

  const isRunRefreshing = triggerMutation.isPending || resumeMutation.isPending || isStreamActive;
  const hasActiveRun = useMemo(() => Boolean(activeSnapshotId ?? streamSnapshotId), [activeSnapshotId, streamSnapshotId]);

  const snapshots = useMemo<readonly CompanyProfileSnapshot[]>(() => companyIntelData?.snapshots ?? [], [companyIntelData?.snapshots]);
  const latestSnapshot = useMemo(() => snapshots[0] ?? null, [snapshots]);
  const loadedSnapshotFromHistory = useMemo(() => {
    if (!loadedSnapshotId) {
      return null;
    }
    return snapshots.find(snapshot => snapshot.id === loadedSnapshotId) ?? null;
  }, [loadedSnapshotId, snapshots]);
  const displayedSnapshot = snapshotOverride ?? loadedSnapshotFromHistory ?? latestSnapshot;

  const chatSnapshot = useMemo(() => {
    const candidateSnapshot = (() => {
      if (displayedSnapshot && displayedSnapshot.status === 'complete') {
        return displayedSnapshot;
      }
      if (latestSnapshot && latestSnapshot.status === 'complete') {
        return latestSnapshot;
      }
      return null;
    })();

    if (!candidateSnapshot) {
      return null;
    }

    const override = vectorStoreOverrides[candidateSnapshot.id];
    const vectorStoreStatus = override?.status ?? candidateSnapshot.vectorStoreStatus ?? 'pending';
    const vectorStoreError = override ? override.error : candidateSnapshot.vectorStoreError ?? null;

    return {
      snapshotId: candidateSnapshot.id,
      domain: candidateSnapshot.domain ?? null,
      vectorStoreStatus,
      vectorStoreError,
      completedAt: candidateSnapshot.completedAt ?? null,
    };
  }, [displayedSnapshot, latestSnapshot, vectorStoreOverrides]);

  const structuredReasoningHeadlines = useMemo<readonly string[]>(() => {
    if (structuredReasoningHeadlinesDraft.length > 0) {
      return structuredReasoningHeadlinesDraft;
    }
    if (isRunRefreshing) {
      return [];
    }
    return latestSnapshot?.summaries?.metadata?.structuredProfile?.headlines ?? [];
  }, [structuredReasoningHeadlinesDraft, isRunRefreshing, latestSnapshot]);

  const overviewReasoningHeadlines = useMemo<readonly string[]>(() => {
    if (overviewReasoningHeadlinesDraft.length > 0) {
      return overviewReasoningHeadlinesDraft;
    }
    if (isRunRefreshing) {
      return [];
    }
    return latestSnapshot?.summaries?.metadata?.overview?.headlines ?? [];
  }, [overviewReasoningHeadlinesDraft, isRunRefreshing, latestSnapshot]);

  const structuredReasoningHeadline = structuredReasoningHeadlines[0] ?? null;
  const overviewReasoningHeadline = overviewReasoningHeadlines[0] ?? null;

  useEffect(() => {
    if (!activeSnapshotId) {
      lastResumeSnapshotIdRef.current = null;
      return;
    }
    if (!profile?.domain) {
      return;
    }
    if (triggerMutation.isPending || resumeMutation.isPending) {
      return;
    }
    if (streamSnapshotId === activeSnapshotId) {
      return;
    }
    if (lastResumeSnapshotIdRef.current === activeSnapshotId) {
      return;
    }

    lastResumeSnapshotIdRef.current = activeSnapshotId;
    void resumeMutation
      .mutateAsync({ domain: profile.domain })
      .catch(error => {
        lastResumeSnapshotIdRef.current = null;
        setErrorMessage(resolveErrorMessage(error, 'Unable to resume active run.'));
      });
  }, [activeSnapshotId, profile?.domain, streamSnapshotId, triggerMutation.isPending, resumeMutation]);

  const isPreviewing = previewMutation.isPending;
  const isCancelling = cancelRunMutation.isPending;
  const isResumeConnecting = resumeMutation.isPending && !isStreamActive;
  const isScraping = isRunRefreshing;
  const isResuming = isResumeConnecting;
  const isBusy = isPreviewing || isScraping || isCancelling;

  useEffect(() => {
    if (companyIntelQuery.error) {
      setErrorMessage(current =>
        current ?? resolveErrorMessage(companyIntelQuery.error, 'Unable to load company intel data right now.'),
      );
      return;
    }

    if (companyIntelData) {
      setErrorMessage(null);
    }
  }, [companyIntelQuery.error, companyIntelData]);

  useEffect(() => {
    if (!profileStatusOverride) {
      return;
    }
    if (queryProfileStatus && queryProfileStatus === profileStatusOverride) {
      setProfileStatusOverride(null);
    }
  }, [profileStatusOverride, queryProfileStatus]);

  useEffect(() => {
    if (!latestSnapshot) {
      if (Object.keys(vectorStoreOverrides).length > 0) {
        setVectorStoreOverrides({});
      }
      return;
    }
    const override = vectorStoreOverrides[latestSnapshot.id];
    if (!override) {
      return;
    }
    const status = latestSnapshot.vectorStoreStatus ?? 'pending';
    const error = latestSnapshot.vectorStoreError ?? null;
    if (override.status === status && override.error === error) {
      setVectorStoreOverrides(prev => {
        const rest = { ...prev };
        delete rest[latestSnapshot.id];
        return rest;
      });
    }
  }, [latestSnapshot, vectorStoreOverrides]);

  const statusMessages = useMemo(() => {
    const messages: string[] = [];

    if (loadingSnapshotId) {
      messages.push('Loading snapshot details…');
    }

    if (isResumeConnecting) {
      messages.push('Reconnecting to active run…');
    }

    if (isCancelling) {
      messages.push('Stopping run…');
    }

    if (isPreviewing && streamStage !== 'mapping') {
      messages.push('Mapping site…');
    }

    if (streamStage) {
      const stageLabels: Record<CompanyIntelRunStage, string> = {
        mapping: 'Mapping site…',
        scraping: 'Scraping selected pages…',
        analysis_structured: 'Analysing structured profile…',
        analysis_overview: 'Composing overview summary…',
        persisting: 'Saving updated profile…',
      };

      let label = stageLabels[streamStage] ?? 'Processing company intel…';
      if (
        streamStage === 'scraping' &&
        streamProgress &&
        typeof streamProgress.completed === 'number' &&
        typeof streamProgress.total === 'number' &&
        streamProgress.total > 0
      ) {
        const completed = Math.min(streamProgress.completed, streamProgress.total);
        label = `${label} (${completed} / ${streamProgress.total})`;
      }
      messages.push(label);
    } else if (isScraping) {
      messages.push('Refreshing profile…');
    }

    return messages;
  }, [isPreviewing, isScraping, streamProgress, streamStage, isResumeConnecting, isCancelling, loadingSnapshotId]);

  const isStreaming = isStreamActive || resumeMutation.isPending;

  const loadSnapshotIntoEditor = useCallback(async (snapshotId: number) => {
    setErrorMessage(null);
    setLoadingSnapshotId(snapshotId);

    try {
      const response = await request(`/snapshots/${snapshotId}`);
      if (!response.ok) {
        throw await toHttpError(response, 'Unable to load snapshot details.');
      }

      const payload = await response.json();
      const snapshot = toCompanyProfileSnapshot(payload.data);
      const structuredProfile = snapshot.summaries?.structuredProfile ?? null;
      const overviewText = typeof snapshot.summaries?.overview === 'string' ? snapshot.summaries.overview : null;
      const structuredHeadlines = snapshot.summaries?.metadata?.structuredProfile?.headlines ?? [];
      const overviewHeadlines = snapshot.summaries?.metadata?.overview?.headlines ?? [];

      dispatchStreamAction({
        type: 'hydrate-drafts',
        payload: {
          structuredProfile,
          overviewText,
          structuredHeadlines,
          overviewHeadlines,
          faviconUrl: null,
        },
      });
      setSnapshotOverride(snapshot);
      setLoadedSnapshotId(snapshotId);

      if (snapshot.domain) {
        setDomainFromSnapshot(snapshot.domain);
      }
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, 'Unable to load snapshot details.'));
    } finally {
      setLoadingSnapshotId(current => (current === snapshotId ? null : current));
    }
  }, [request, setDomainFromSnapshot]);

  const cancelActiveRun = useCallback(async () => {
    const snapshotId = activeSnapshotId ?? streamSnapshotId;
    if (!snapshotId) {
      setErrorMessage('No active company intel run found to cancel.');
      return;
    }

    try {
      await cancelRunMutation.mutateAsync(snapshotId);
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, 'Unable to cancel company intel run.'));
    }
  }, [activeSnapshotId, streamSnapshotId, cancelRunMutation]);

  const startOver = useCallback(() => {
    resetPreviewState();
    setErrorMessage(null);
    dispatchStreamAction({ type: 'reset-all' });
    setSnapshotOverride(null);
    setLoadedSnapshotId(null);
    setLoadingSnapshotId(null);
    lastResumeSnapshotIdRef.current = null;
    setDomainMode('profile');
  }, [resetPreviewState, setDomainMode]);

  const submit = useCallback(async () => {
    setErrorMessage(null);
    clearManualError();
    dispatchStreamAction({ type: 'reset-drafts' });
    setSnapshotOverride(null);
    setLoadedSnapshotId(null);
    setLoadingSnapshotId(null);

    if (activeSnapshotId) {
      setErrorMessage('A company intel refresh is already running. Cancel it before starting a new one.');
      return;
    }

    if (!trimmedDomain) {
      setErrorMessage('Please provide a website domain before collecting company intel.');
      return;
    }

    if (!hasPreview) {
      try {
        const preview = await previewMutation.mutateAsync({ domain: trimmedDomain });
        replaceSelections(preview.selections.map(selection => selection.url));
        setPreviewDomain(trimmedDomain);
      } catch (error) {
        setErrorMessage(resolveErrorMessage(error, 'Unable to map the site at this time.'));
      }
      return;
    }

    if (selectedUrls.length === 0) {
      setErrorMessage('Select at least one page before scraping.');
      return;
    }

    try {
      dispatchStreamAction({ type: 'start-request' });
      lastResumeSnapshotIdRef.current = null;
      await triggerMutation.mutateAsync({
        domain: trimmedDomain,
        selectedUrls,
      });
      setDomainMode('profile');
      await refetch();
      resetPreviewState();
      dispatchStreamAction({ type: 'reset-all' });
    } catch (error) {
      dispatchStreamAction({ type: 'reset-all' });
      setErrorMessage(resolveErrorMessage(error, 'Unable to refresh company intel at this time.'));
    }
  }, [
    activeSnapshotId,
    clearManualError,
    hasPreview,
    previewMutation,
    refetch,
    replaceSelections,
    resetPreviewState,
    selectedUrls,
    setDomainMode,
    setPreviewDomain,
    trimmedDomain,
    triggerMutation,
  ]);

  const profileStatus = profileStatusOverride ?? profile?.status ?? 'not_configured';

  return {
    profile,
    profileStatus,
    activeSnapshotId,
    hasActiveRun,
    snapshots,
    latestSnapshot,
    displayedSnapshot,
    chatSnapshot,
    previewData,
    recommendedSelections,
    manualSelectedUrls,
    selectedUrls,
    domain,
    trimmedDomain,
    errorMessage,
    manualError,
    statusMessages,
    overviewDraft,
    structuredSummaryDraft,
    structuredReasoningHeadlines,
    overviewReasoningHeadlines,
    structuredReasoningHeadline,
    overviewReasoningHeadline,
    faviconDraft,
    loadedSnapshotId,
    loadingSnapshotId,
    manualUrl,
    hasPreview,
    isPreviewing,
    isResuming,
    isScraping,
    isBusy,
    isLoading,
    isError,
    isStreaming,
    isCancelling,
    streamStage,
    streamProgress,
    onDomainChange: handleDomainChangeWithErrorReset,
    onManualUrlChange: handleManualUrlChange,
    addManualUrl,
    removeManualUrl,
    toggleSelection,
    loadSnapshotIntoEditor,
    cancelActiveRun,
    submit,
    startOver,
    profileEditor,
  };
};
