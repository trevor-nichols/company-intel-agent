"use client";

// ------------------------------------------------------------------------------------------------
//                useWorkflowPreviewState - domain + preview + selection orchestration
// ------------------------------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CompanyIntelPreviewResult, CompanyIntelSelection } from '../../types';
import { useCompanyIntelPreview } from '../useCompanyIntelPreview';
import { ManualUrlValidationError, normalizeManualUrl } from './manualUrl';

export type DomainMode = 'profile' | 'snapshot' | 'manual';

export interface WorkflowPreviewState {
  readonly domain: string;
  readonly trimmedDomain: string;
  readonly domainMode: DomainMode;
  readonly previewData: CompanyIntelPreviewResult | null;
  readonly recommendedSelections: readonly CompanyIntelSelection[];
  readonly manualSelectedUrls: readonly string[];
  readonly selectedUrls: readonly string[];
  readonly manualUrl: string;
  readonly manualError: string | null;
  readonly hasPreview: boolean;
  readonly previewBaseUrl: string | null;
  readonly previewMutation: ReturnType<typeof useCompanyIntelPreview>;
  readonly previewDomain: string | null;
  readonly handleDomainChange: (value: string) => void;
  readonly handleManualUrlChange: (value: string) => void;
  readonly addManualUrl: () => void;
  readonly removeManualUrl: (url: string) => void;
  readonly toggleSelection: (url: string, checked: boolean) => void;
  readonly resetPreviewState: () => void;
  readonly setPreviewDomain: (value: string | null) => void;
  readonly replaceSelections: (urls: readonly string[]) => void;
  readonly clearManualError: () => void;
  readonly setDomainMode: (mode: DomainMode) => void;
  readonly setDomainFromSnapshot: (value: string) => void;
}

interface UseWorkflowPreviewStateOptions {
  readonly profileDomain?: string | null;
}

export function useWorkflowPreviewState({ profileDomain }: UseWorkflowPreviewStateOptions = {}): WorkflowPreviewState {
  const previewMutation = useCompanyIntelPreview();
  const [domain, setDomain] = useState('');
  const [domainMode, setDomainMode] = useState<DomainMode>('profile');
  const [previewDomain, setPreviewDomain] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [selectedUrls, setSelectedUrls] = useState<readonly string[]>([]);

  useEffect(() => {
    if (profileDomain && domainMode === 'profile') {
      setDomain(profileDomain);
    }
  }, [profileDomain, domainMode]);

  const trimmedDomain = useMemo(() => domain.trim(), [domain]);

  useEffect(() => {
    if (!previewDomain) {
      return;
    }
    if (trimmedDomain === previewDomain) {
      return;
    }
    previewMutation.reset();
    setSelectedUrls([]);
    setManualUrl('');
    setManualError(null);
    setPreviewDomain(null);
  }, [trimmedDomain, previewDomain, previewMutation]);

  const previewData: CompanyIntelPreviewResult | null = useMemo(() => {
    if (!previewMutation.data) {
      return null;
    }
    return previewDomain === trimmedDomain ? previewMutation.data : null;
  }, [previewMutation.data, previewDomain, trimmedDomain]);

  const recommendedSelections = useMemo(
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

  const hasPreview = Boolean(previewData && !previewMutation.isPending);

  const handleDomainChange = useCallback((value: string) => {
    setDomain(value);
    setDomainMode('manual');
    setManualError(null);
  }, []);

  const handleManualUrlChange = useCallback((value: string) => {
    setManualUrl(value);
    if (manualError) {
      setManualError(null);
    }
  }, [manualError]);

  const replaceSelections = useCallback((urls: readonly string[]) => {
    setSelectedUrls(Array.from(new Set(urls)));
  }, []);

  const addManualUrl = useCallback(() => {
    setManualError(null);

    if (!hasPreview || !previewBaseUrl) {
      setManualError('Generate a site map before adding custom URLs.');
      return;
    }

    try {
      const normalized = normalizeManualUrl(manualUrl, previewBaseUrl);
      setSelectedUrls(previous => {
        if (previous.includes(normalized)) {
          return previous;
        }
        return [...previous, normalized];
      });
      setManualUrl('');
    } catch (error) {
      if (error instanceof ManualUrlValidationError) {
        setManualError(error.message);
      } else {
        setManualError('Enter a valid URL from your site.');
      }
    }
  }, [hasPreview, manualUrl, previewBaseUrl]);

  const removeManualUrl = useCallback((url: string) => {
    setSelectedUrls(prev => prev.filter(item => item !== url));
  }, []);

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

  const resetPreviewState = useCallback(() => {
    previewMutation.reset();
    setSelectedUrls([]);
    setManualUrl('');
    setManualError(null);
    setPreviewDomain(null);
  }, [previewMutation]);

  const clearManualError = useCallback(() => {
    setManualError(null);
  }, []);

  const setDomainFromSnapshot = useCallback((value: string) => {
    setDomain(value);
    setDomainMode('snapshot');
  }, []);

  return {
    domain,
    trimmedDomain,
    domainMode,
    previewData,
    recommendedSelections,
    manualSelectedUrls,
    selectedUrls,
    manualUrl,
    manualError,
    hasPreview,
    previewBaseUrl,
    previewMutation,
    previewDomain,
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
  };
}
