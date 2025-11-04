// ------------------------------------------------------------------------------------------------
//                useCompanyIntelWorkflow - Centralized state + actions for company intel UI
// ------------------------------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CompanyIntelPreviewResult,
  CompanyIntelSelection,
  CompanyIntelRunStage,
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyIntelStreamEvent,
  CompanyProfile,
  CompanyProfileKeyOffering,
  CompanyProfileSnapshot,
} from '../types';
import { useCompanyIntel } from './useCompanyIntel';
import { useCompanyIntelPreview } from './useCompanyIntelPreview';
import { useTriggerCompanyIntel } from './useTriggerCompanyIntel';
import { useUpdateCompanyIntelProfile } from './useUpdateCompanyIntelProfile';
import { HttpError } from '../utils/errors';

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

export interface UseCompanyIntelWorkflowResult {
  readonly profile: CompanyProfile | null;
  readonly profileStatus: CompanyProfile['status'] | 'not_configured';
  readonly snapshots: readonly CompanyProfileSnapshot[];
  readonly selectedSnapshot: CompanyProfileSnapshot | null;
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
  readonly structuredReasoningHeadline: string | null;
  readonly overviewReasoningHeadline: string | null;
  readonly faviconDraft: string | null;
  readonly manualUrl: string;
  readonly hasPreview: boolean;
  readonly isPreviewing: boolean;
  readonly isScraping: boolean;
  readonly isBusy: boolean;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isStreaming: boolean;
  readonly streamStage: CompanyIntelRunStage | null;
  readonly streamProgress: { readonly completed: number; readonly total: number } | null;
  readonly detailsOpen: boolean;
  readonly onDomainChange: (value: string) => void;
  readonly onManualUrlChange: (value: string) => void;
  readonly addManualUrl: () => void;
  readonly removeManualUrl: (url: string) => void;
  readonly toggleSelection: (url: string, checked: boolean) => void;
  readonly submit: () => Promise<void>;
  readonly startOver: () => void;
  readonly openSnapshotDetails: (snapshotId: number) => void;
  readonly handleDetailsOpenChange: (open: boolean) => void;
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

export const useCompanyIntelWorkflow = (): UseCompanyIntelWorkflowResult => {
  const companyIntelQuery = useCompanyIntel();
  const handleStreamEvent = useCallback((event: CompanyIntelStreamEvent) => {
    switch (event.type) {
      case 'snapshot-created':
        setStreamActive(true);
        setStreamStage('mapping');
        setStreamProgress(null);
        setOverviewDraft(null);
        setStructuredSummaryDraft(null);
        setStructuredTextDraft(null);
        setStructuredReasoningHeadlineDraft(null);
        setOverviewReasoningHeadlineDraft(null);
        setFaviconDraft(null);
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
        setOverviewReasoningHeadlineDraft(event.headline ?? null);
        break;
      case 'overview-complete':
        setOverviewDraft(event.overview);
        setOverviewReasoningHeadlineDraft(event.headline ?? null);
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
        setStructuredReasoningHeadlineDraft(event.headline ?? null);
        break;
      case 'structured-complete':
        setStructuredSummaryDraft(event.payload.structuredProfile);
        setStructuredTextDraft(null);
        setStructuredReasoningHeadlineDraft(
          event.payload.metadata?.headline ?? event.payload.reasoningHeadline ?? null,
        );
        setFaviconDraft(event.payload.faviconUrl ?? null);
        break;
      case 'run-complete':
        setStreamActive(false);
        setStreamStage(null);
        setStreamProgress(null);
        setStructuredTextDraft(null);
        break;
      case 'run-error':
        setStreamActive(false);
        setStreamStage(null);
        setStreamProgress(null);
        setOverviewDraft(null);
        setStructuredSummaryDraft(null);
        setStructuredTextDraft(null);
        setStructuredReasoningHeadlineDraft(null);
        setOverviewReasoningHeadlineDraft(null);
        setFaviconDraft(null);
        break;
    }
  }, []);

  const triggerMutation = useTriggerCompanyIntel({ stream: true, onEvent: handleStreamEvent });
  const previewMutation = useCompanyIntelPreview();
  const updateProfileMutation = useUpdateCompanyIntelProfile();

  const { data, isLoading, isError, refetch } = companyIntelQuery;
  const profile = data?.profile ?? null;
  const [domain, setDomain] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState('');
  const [selectedUrls, setSelectedUrls] = useState<readonly string[]>([]);
  const [previewDomain, setPreviewDomain] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<number | null>(null);
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
  const [structuredReasoningHeadlineDraft, setStructuredReasoningHeadlineDraft] = useState<string | null>(null);
  const [overviewReasoningHeadlineDraft, setOverviewReasoningHeadlineDraft] = useState<string | null>(null);
  const [faviconDraft, setFaviconDraft] = useState<string | null>(null);

  const snapshots = useMemo<readonly CompanyProfileSnapshot[]>(() => data?.snapshots ?? [], [data?.snapshots]);
  const latestSnapshot = useMemo(() => snapshots[0] ?? null, [snapshots]);
  const structuredReasoningHeadline = useMemo(
    () => structuredReasoningHeadlineDraft ?? latestSnapshot?.summaries?.metadata?.structuredProfile?.headline ?? null,
    [structuredReasoningHeadlineDraft, latestSnapshot],
  );
  const overviewReasoningHeadline = useMemo(
    () => overviewReasoningHeadlineDraft ?? latestSnapshot?.summaries?.metadata?.overview?.headline ?? null,
    [overviewReasoningHeadlineDraft, latestSnapshot],
  );

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

  const trimmedDomain = useMemo(() => domain.trim(), [domain]);
  const isPreviewing = previewMutation.isPending;
  const isScraping = triggerMutation.isPending;
  const isBusy = isPreviewing || isScraping;

  useEffect(() => {
    if (companyIntelQuery.error) {
      setErrorMessage(current =>
        current ?? resolveErrorMessage(companyIntelQuery.error, 'Unable to load company intel data right now.'),
      );
      return;
    }

    if (companyIntelQuery.data) {
      setErrorMessage(null);
    }
  }, [companyIntelQuery.error, companyIntelQuery.data]);

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

  const selectedSnapshot = useMemo(() => {
    if (!selectedSnapshotId) {
      return null;
    }

    return snapshots.find(snapshot => snapshot.id === selectedSnapshotId) ?? null;
  }, [snapshots, selectedSnapshotId]);

  const profileStatus = profile?.status ?? 'not_configured';

  const statusMessages = useMemo(() => {
    const messages: string[] = [];

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
  }, [isPreviewing, isScraping, streamProgress, streamStage]);

  const isStreaming = isStreamActive;

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
    setStructuredReasoningHeadlineDraft(null);
    setOverviewReasoningHeadlineDraft(null);
    setFaviconDraft(null);
  }, [previewMutation]);

  const submit = useCallback(async () => {
    setErrorMessage(null);
    setManualError(null);
    setStreamStage(null);
    setStreamProgress(null);
    setOverviewDraft(null);
    setStructuredSummaryDraft(null);
    setStructuredReasoningHeadlineDraft(null);
    setOverviewReasoningHeadlineDraft(null);
    setFaviconDraft(null);

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
      setStructuredReasoningHeadlineDraft(null);
      setOverviewReasoningHeadlineDraft(null);
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
  ]);

  const openSnapshotDetails = useCallback((snapshotId: number) => {
    setSelectedSnapshotId(snapshotId);
    setDetailsOpen(true);
  }, []);

  const handleDetailsOpenChange = useCallback((open: boolean) => {
    setDetailsOpen(open);
    if (!open) {
      setSelectedSnapshotId(null);
    }
  }, []);

  return {
    profile,
    profileStatus,
    snapshots,
    selectedSnapshot,
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
    structuredReasoningHeadline,
    overviewReasoningHeadline,
    faviconDraft,
    manualUrl,
    hasPreview,
    isPreviewing,
    isScraping,
    isBusy,
    isLoading,
    isError,
    isStreaming,
    streamStage,
    streamProgress,
    detailsOpen,
    onDomainChange: handleDomainChange,
    onManualUrlChange: handleManualUrlChange,
    addManualUrl,
    removeManualUrl,
    toggleSelection,
    submit,
    startOver,
    openSnapshotDetails,
    handleDetailsOpenChange,
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
