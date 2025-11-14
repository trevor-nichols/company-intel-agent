"use client";

// ------------------------------------------------------------------------------------------------
//                useCompanyIntelWorkflow - Centralized state + actions for company intel UI
// ------------------------------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useCompanyIntelPreview } from './useCompanyIntelPreview';
import { useTriggerCompanyIntel } from './useTriggerCompanyIntel';
import { useCancelCompanyIntelRun } from './useCancelCompanyIntelRun';
import { useUpdateCompanyIntelProfile } from './useUpdateCompanyIntelProfile';
import { HttpError, toHttpError } from '../utils/errors';
import { toCompanyProfileSnapshot } from '../utils/serialization';

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
  const [streamSnapshotId, setStreamSnapshotId] = useState<number | null>(null);
  const lastResumeSnapshotIdRef = useRef<number | null>(null);
  const runBaselineStatusRef = useRef<CompanyProfile['status'] | 'not_configured'>('not_configured');
  const [profileStatusOverride, setProfileStatusOverride] = useState<CompanyProfile['status'] | null>(null);
  const handleStreamEvent = useCallback((event: CompanyIntelStreamEvent) => {
    switch (event.type) {
      case 'snapshot-created':
        setStreamActive(true);
        setStreamStage('mapping');
        setStreamProgress(null);
        setOverviewDraft(null);
        setStructuredSummaryDraft(null);
        setStructuredTextDraft(null);
        setStructuredReasoningHeadlinesDraft([]);
        setOverviewReasoningHeadlinesDraft([]);
        setFaviconDraft(null);
        setLoadedSnapshotId(null);
        setLoadingSnapshotId(null);
        setStreamSnapshotId(event.snapshotId);
        lastResumeSnapshotIdRef.current = event.snapshotId;
        runBaselineStatusRef.current = profileStatusFromQuery;
        setProfileStatusOverride('refreshing');
        break;
      case 'status':
        setStreamActive(true);
        setStreamStage(event.stage);
        if (event.stage === 'scraping' && typeof event.completed === 'number' && typeof event.total === 'number') {
          setStreamProgress({ completed: event.completed, total: event.total });
        } else {
          setStreamProgress(null);
        }
        break;
      case 'overview-delta':
        setOverviewDraft(previous => {
          if (event.displayText && event.displayText.trim().length > 0) {
            return event.displayText.trim();
          }
          return `${previous ?? ''}${event.delta}`;
        });
        break;
      case 'overview-reasoning-delta':
        setOverviewReasoningHeadlinesDraft(event.headlines ?? []);
        break;
      case 'overview-complete':
        setOverviewDraft(event.overview);
        setOverviewReasoningHeadlinesDraft(event.headlines ?? []);
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
      case 'structured-delta':
        setStructuredTextDraft(previous => {
          const next = `${previous ?? ''}${event.delta}`;
          if (event.summary) {
            setStructuredSummaryDraft(event.summary);
            return next;
          }
          try {
            const parsed = JSON.parse(next) as CompanyIntelSnapshotStructuredProfileSummary;
            if (parsed && typeof parsed === 'object') {
              setStructuredSummaryDraft(parsed);
            }
          } catch {
            // Ignore parse errors while the payload is still streaming.
          }
          return next;
        });
        break;
      case 'structured-reasoning-delta':
        setStructuredReasoningHeadlinesDraft(event.headlines ?? []);
        break;
      case 'structured-complete':
        setStructuredSummaryDraft(event.payload.structuredProfile);
        setStructuredTextDraft(null);
        setStructuredReasoningHeadlinesDraft(
          event.payload.metadata?.headlines ?? event.payload.reasoningHeadlines ?? [],
        );
        setFaviconDraft(event.payload.faviconUrl ?? null);
        setLoadedSnapshotId(event.snapshotId);
        break;
      case 'run-complete':
        setStreamActive(false);
        setStreamStage(null);
        setStreamProgress(null);
        setStructuredTextDraft(null);
        setStreamSnapshotId(null);
        lastResumeSnapshotIdRef.current = event.snapshotId;
        void refetch();
        setProfileStatusOverride('ready');
        setVectorStoreOverrides(previous => {
          if (previous[event.snapshotId]) {
            const rest = { ...previous };
            delete rest[event.snapshotId];
            return rest;
          }
          return previous;
        });
        setLoadedSnapshotId(event.snapshotId);
        setLoadingSnapshotId(null);
        break;
      case 'run-error':
        setStreamActive(false);
        setStreamStage(null);
        setStreamProgress(null);
        setOverviewDraft(null);
        setStructuredSummaryDraft(null);
        setStructuredTextDraft(null);
        setStructuredReasoningHeadlinesDraft([]);
        setOverviewReasoningHeadlinesDraft([]);
        setFaviconDraft(null);
        setStreamSnapshotId(null);
        lastResumeSnapshotIdRef.current = event.snapshotId;
        void refetch();
        setProfileStatusOverride('failed');
        setVectorStoreOverrides(previous => {
          if (previous[event.snapshotId]) {
            const rest = { ...previous };
            delete rest[event.snapshotId];
            return rest;
          }
          return previous;
        });
        setLoadedSnapshotId(null);
        setLoadingSnapshotId(null);
        break;
      case 'run-cancelled':
        setStreamActive(false);
        setStreamStage(null);
        setStreamProgress(null);
        setOverviewDraft(null);
        setStructuredSummaryDraft(null);
        setStructuredTextDraft(null);
        setStructuredReasoningHeadlinesDraft([]);
        setOverviewReasoningHeadlinesDraft([]);
        setFaviconDraft(null);
        setStreamSnapshotId(null);
        lastResumeSnapshotIdRef.current = event.snapshotId;
        setErrorMessage(event.reason ?? 'Company intel run cancelled.');
        setProfileStatusOverride(runBaselineStatusRef.current);
        void refetch();
        setLoadedSnapshotId(null);
        setLoadingSnapshotId(null);
        break;
    }
  }, [profileStatusFromQuery, refetch]);

  const triggerMutation = useTriggerCompanyIntel({ onEvent: handleStreamEvent });
  const previewMutation = useCompanyIntelPreview();
  const updateProfileMutation = useUpdateCompanyIntelProfile();
  const cancelRunMutation = useCancelCompanyIntelRun();

  const profile = companyIntelData?.profile ?? null;
  const activeSnapshotId = profile?.activeSnapshotId ?? null;
  const resumeMutation = useTriggerCompanyIntel({ onEvent: handleStreamEvent, resumeSnapshotId: activeSnapshotId ?? undefined });
  const [domain, setDomain] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState('');
  const [selectedUrls, setSelectedUrls] = useState<readonly string[]>([]);
  const [previewDomain, setPreviewDomain] = useState<string | null>(null);
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [isSavingPrimaryIndustries, setIsSavingPrimaryIndustries] = useState(false);
  const [isSavingValueProps, setIsSavingValueProps] = useState(false);
  const [isSavingKeyOfferings, setIsSavingKeyOfferings] = useState(false);
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const [streamStage, setStreamStage] = useState<CompanyIntelRunStage | null>(null);
  const [isStreamActive, setStreamActive] = useState(false);
  const [streamProgress, setStreamProgress] = useState<{ completed: number; total: number } | null>(null);
  const [overviewDraft, setOverviewDraft] = useState<string | null>(null);
  const [structuredSummaryDraft, setStructuredSummaryDraft] = useState<CompanyIntelSnapshotStructuredProfileSummary | null>(null);
  const [, setStructuredTextDraft] = useState<string | null>(null);
  const [structuredReasoningHeadlinesDraft, setStructuredReasoningHeadlinesDraft] = useState<readonly string[]>([]);
  const [overviewReasoningHeadlinesDraft, setOverviewReasoningHeadlinesDraft] = useState<readonly string[]>([]);
  const [faviconDraft, setFaviconDraft] = useState<string | null>(null);
  const [vectorStoreOverrides, setVectorStoreOverrides] = useState<Record<number, VectorStoreOverride>>({});
  const [loadingSnapshotId, setLoadingSnapshotId] = useState<number | null>(null);
  const [loadedSnapshotId, setLoadedSnapshotId] = useState<number | null>(null);
  const isRunRefreshing = triggerMutation.isPending || resumeMutation.isPending || isStreamActive;
  const hasActiveRun = useMemo(() => Boolean(activeSnapshotId ?? streamSnapshotId), [activeSnapshotId, streamSnapshotId]);

  const snapshots = useMemo<readonly CompanyProfileSnapshot[]>(() => companyIntelData?.snapshots ?? [], [companyIntelData?.snapshots]);
  const latestSnapshot = useMemo(() => snapshots[0] ?? null, [snapshots]);
  const chatSnapshot = useMemo(() => {
    if (!latestSnapshot || latestSnapshot.status !== 'complete') {
      return null;
    }

    const override = vectorStoreOverrides[latestSnapshot.id];
    const vectorStoreStatus = override?.status ?? latestSnapshot.vectorStoreStatus ?? 'pending';
    const vectorStoreError = override ? override.error : latestSnapshot.vectorStoreError ?? null;

    return {
      snapshotId: latestSnapshot.id,
      domain: latestSnapshot.domain ?? null,
      vectorStoreStatus,
      vectorStoreError,
      completedAt: latestSnapshot.completedAt ?? null,
    };
  }, [latestSnapshot, vectorStoreOverrides]);
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
    if (profile?.domain) {
      setDomain(profile.domain);
    }
  }, [profile?.domain]);

  useEffect(() => {
    if (!previewDomain) {
      return;
    }

    const trimmed = domain.trim();
    if (trimmed === previewDomain) {
      return;
    }

    previewMutation.reset();
    setSelectedUrls([]);
    setManualUrl('');
    setManualError(null);
    setPreviewDomain(null);
  }, [domain, previewDomain, previewMutation]);

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

  const trimmedDomain = useMemo(() => domain.trim(), [domain]);
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

  const previewData: CompanyIntelPreviewResult | null = useMemo(() => {
    if (!previewMutation.data) {
      return null;
    }
    return previewDomain === trimmedDomain ? previewMutation.data : null;
  }, [previewMutation.data, previewDomain, trimmedDomain]);

  const recommendedSelections: readonly CompanyIntelSelection[] = useMemo(
    () => previewData?.selections ?? [],
    [previewData?.selections],
  );

  const manualSelectedUrls = useMemo(
    () => selectedUrls.filter(url => !recommendedSelections.some(selection => selection.url === url)),
    [selectedUrls, recommendedSelections],
  );

  const previewBaseUrl = useMemo(() => {
    if (previewData?.map.baseUrl) {
      return previewData.map.baseUrl;
    }

    if (!trimmedDomain) {
      return null;
    }

    return trimmedDomain.startsWith('http') ? trimmedDomain : `https://${trimmedDomain}`;
  }, [previewData?.map.baseUrl, trimmedDomain]);

  const hasPreview = Boolean(previewData && !isPreviewing);

  const profileStatus = profileStatusOverride ?? profile?.status ?? 'not_configured';

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

  const handleDomainChange = useCallback((value: string) => {
    setDomain(value);
    setErrorMessage(null);
  }, []);

  const handleManualUrlChange = useCallback((value: string) => {
    setManualUrl(value);
    if (manualError) {
      setManualError(null);
    }
  }, [manualError]);

  const saveOverview = useCallback(
    async (value: string | null) => {
      setIsSavingOverview(true);
      try {
        await updateProfileMutation.mutateAsync({ overview: value });
      } finally {
        setIsSavingOverview(false);
      }
    },
    [updateProfileMutation],
  );

  const savePrimaryIndustries = useCallback(
    async (values: readonly string[]) => {
      setIsSavingPrimaryIndustries(true);
      try {
        await updateProfileMutation.mutateAsync({ primaryIndustries: values });
      } finally {
        setIsSavingPrimaryIndustries(false);
      }
    },
    [updateProfileMutation],
  );

  const saveValueProps = useCallback(
    async (values: readonly string[]) => {
      setIsSavingValueProps(true);
      try {
        await updateProfileMutation.mutateAsync({ valueProps: values });
      } finally {
        setIsSavingValueProps(false);
      }
    },
    [updateProfileMutation],
  );

  const saveKeyOfferings = useCallback(
    async (values: readonly CompanyProfileKeyOffering[]) => {
      setIsSavingKeyOfferings(true);
      try {
        await updateProfileMutation.mutateAsync({ keyOfferings: values });
      } finally {
        setIsSavingKeyOfferings(false);
      }
    },
    [updateProfileMutation],
  );

  const saveIdentity = useCallback(
    async ({ companyName, tagline }: { companyName: string | null; tagline: string | null }) => {
      setIsSavingIdentity(true);
      try {
        await updateProfileMutation.mutateAsync({ companyName, tagline });
      } finally {
        setIsSavingIdentity(false);
      }
    },
    [updateProfileMutation],
  );

  const toggleSelection = useCallback(
    (url: string, checked: boolean) => {
      setSelectedUrls(prev => {
        if (checked) {
          if (prev.includes(url)) {
            return prev;
          }

          const insertionIndex = recommendedSelections.findIndex(selection => selection.url === url);
          if (insertionIndex === -1) {
            return [...prev, url];
          }

          const next = [...prev];
          next.splice(insertionIndex, 0, url);
          return Array.from(new Set(next));
        }

        return prev.filter(item => item !== url);
      });
    },
    [recommendedSelections],
  );

  const addManualUrl = useCallback(() => {
    setManualError(null);

    if (!hasPreview || !previewBaseUrl) {
      setManualError('Generate a site map before adding custom URLs.');
      return;
    }

    const candidate = manualUrl.trim();
    if (!candidate) {
      setManualError('Enter a URL to add.');
      return;
    }

    let resolved: URL;
    try {
      resolved = new URL(candidate, previewBaseUrl);
    } catch {
      setManualError('Enter a valid URL from your site.');
      return;
    }

    const baseHost = new URL(previewBaseUrl).hostname.replace(/^www\./i, '').toLowerCase();
    const candidateHost = resolved.hostname.replace(/^www\./i, '').toLowerCase();
    const hostMatches = candidateHost === baseHost || candidateHost.endsWith(`.${baseHost}`);

    if (!hostMatches) {
      setManualError('Custom URLs must belong to the same domain or subdomain.');
      return;
    }

    const normalized = resolved.toString().replace(/[#?].*$/, '');

    setSelectedUrls(prev => {
      if (prev.includes(normalized)) {
        return prev;
      }

      return [...prev, normalized];
    });
    setManualUrl('');
  }, [hasPreview, manualUrl, previewBaseUrl]);

  const removeManualUrl = useCallback((url: string) => {
    setSelectedUrls(prev => prev.filter(item => item !== url));
  }, []);

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

      setStructuredSummaryDraft(structuredProfile);
      setStructuredReasoningHeadlinesDraft(snapshot.summaries?.metadata?.structuredProfile?.headlines ?? []);
      setOverviewDraft(overviewText);
      setOverviewReasoningHeadlinesDraft(snapshot.summaries?.metadata?.overview?.headlines ?? []);
      setStructuredTextDraft(null);
      setFaviconDraft(null);
      setLoadedSnapshotId(snapshotId);
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, 'Unable to load snapshot details.'));
    } finally {
      setLoadingSnapshotId(current => (current === snapshotId ? null : current));
    }
  }, [request]);

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
    previewMutation.reset();
    setSelectedUrls([]);
    setManualUrl('');
    setManualError(null);
    setPreviewDomain(null);
    setErrorMessage(null);
    setStreamStage(null);
    setStreamProgress(null);
    setStreamActive(false);
    setOverviewDraft(null);
    setStructuredSummaryDraft(null);
    setStructuredReasoningHeadlinesDraft([]);
    setOverviewReasoningHeadlinesDraft([]);
    setFaviconDraft(null);
    setStreamSnapshotId(null);
    lastResumeSnapshotIdRef.current = null;
    setLoadedSnapshotId(null);
    setLoadingSnapshotId(null);
  }, [previewMutation]);

  const submit = useCallback(async () => {
    setErrorMessage(null);
    setManualError(null);
    setStreamStage(null);
    setStreamProgress(null);
    setOverviewDraft(null);
    setStructuredSummaryDraft(null);
    setStructuredReasoningHeadlinesDraft([]);
    setOverviewReasoningHeadlinesDraft([]);
    setFaviconDraft(null);
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
        setSelectedUrls(preview.selections.map(selection => selection.url));
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
      setStreamActive(true);
      setStreamSnapshotId(null);
      lastResumeSnapshotIdRef.current = null;
      await triggerMutation.mutateAsync({
        domain: trimmedDomain,
        selectedUrls,
      });
      await refetch();
      previewMutation.reset();
      setSelectedUrls([]);
      setManualUrl('');
      setManualError(null);
      setPreviewDomain(null);
      setStreamStage(null);
      setStreamProgress(null);
      setStreamActive(false);
      setOverviewDraft(null);
      setStructuredSummaryDraft(null);
      setStructuredReasoningHeadlinesDraft([]);
      setOverviewReasoningHeadlinesDraft([]);
      setFaviconDraft(null);
    } catch (error) {
      setStreamActive(false);
      setErrorMessage(resolveErrorMessage(error, 'Unable to refresh company intel at this time.'));
    }
  }, [
    trimmedDomain,
    hasPreview,
    previewMutation,
    selectedUrls,
    triggerMutation,
    refetch,
    activeSnapshotId,
  ]);

  return {
    profile,
    profileStatus,
    activeSnapshotId,
    hasActiveRun,
    snapshots,
    latestSnapshot,
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
    onDomainChange: handleDomainChange,
    onManualUrlChange: handleManualUrlChange,
    addManualUrl,
    removeManualUrl,
    toggleSelection,
    loadSnapshotIntoEditor,
    cancelActiveRun,
    submit,
    startOver,
    profileEditor: {
      saveOverview,
      savePrimaryIndustries,
      saveValueProps,
      saveKeyOfferings,
      saveIdentity,
      isSavingOverview,
      isSavingPrimaryIndustries,
      isSavingValueProps,
      isSavingKeyOfferings,
      isSavingIdentity,
    },
  };
};
