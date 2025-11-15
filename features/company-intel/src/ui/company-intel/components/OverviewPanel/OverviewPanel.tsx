// ------------------------------------------------------------------------------------------------
//                OverviewPanel.tsx - Executive overview + structured intel presentation
// ------------------------------------------------------------------------------------------------

import React, { type ReactElement } from 'react';
import { Separator } from '../../../primitives/separator';
import type {
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyProfile,
  CompanyProfileKeyOffering,
} from '../../types';
import { OverviewSkeleton } from '../Skeletons';
import {
  EditableIndustriesSection,
  EditableOfferingsSection,
  EditableOverviewSection,
  EditableValuePropsSection,
} from './components';

interface OverviewPanelProps {
  readonly profile: CompanyProfile | null;
  readonly structuredProfile?: CompanyIntelSnapshotStructuredProfileSummary | null;
  readonly isLoading: boolean;
  readonly isStreaming?: boolean;
  readonly isScraping: boolean;
  readonly overviewHeadlines?: readonly string[];
  readonly structuredHeadlines?: readonly string[];
  readonly overviewDraft?: string | null;
  readonly onSaveOverview: (value: string | null) => Promise<void>;
  readonly onSavePrimaryIndustries: (values: readonly string[]) => Promise<void>;
  readonly onSaveValueProps: (values: readonly string[]) => Promise<void>;
  readonly onSaveKeyOfferings: (values: readonly CompanyProfileKeyOffering[]) => Promise<void>;
  readonly isSavingOverview: boolean;
  readonly isSavingPrimaryIndustries: boolean;
  readonly isSavingValueProps: boolean;
  readonly isSavingKeyOfferings: boolean;
}

export function OverviewPanel({
  isStreaming = false,
  profile,
  structuredProfile,
  isLoading,
  isScraping,
  overviewHeadlines,
  structuredHeadlines,
  overviewDraft,
  onSaveOverview,
  onSavePrimaryIndustries,
  onSaveValueProps,
  onSaveKeyOfferings,
  isSavingOverview,
  isSavingPrimaryIndustries,
  isSavingValueProps,
  isSavingKeyOfferings,
}: OverviewPanelProps): ReactElement {
  if (isLoading) {
    return <OverviewSkeleton />;
  }

  const isRefreshing = isScraping || isStreaming;
  const persistedIndustries = profile?.primaryIndustries ?? [];
  const persistedOfferings = profile?.keyOfferings ?? [];
  const persistedValueProps = profile?.valueProps ?? [];
  const effectiveIndustries = structuredProfile?.primaryIndustries ?? (isRefreshing ? [] : persistedIndustries);
  const effectiveOfferings = structuredProfile?.keyOfferings ?? (isRefreshing ? [] : persistedOfferings);
  const effectiveValueProps = structuredProfile?.valueProps ?? (isRefreshing ? [] : persistedValueProps);
  const displayOverviewHeadline = (() => {
    const headline = overviewHeadlines?.[0];
    return headline && headline.trim().length ? headline.trim() : null;
  })();
  const displayStructuredHeadline = (() => {
    const headline = structuredHeadlines?.[0];
    return headline && headline.trim().length ? headline.trim() : null;
  })();
  const hasStreamingOverview = Boolean(overviewDraft && overviewDraft.trim().length > 0);
  const showOverviewThinking = isRefreshing && !hasStreamingOverview;
  const showStructuredThinking = isRefreshing && !structuredProfile;
  const isEditingLocked = isRefreshing;
  const overviewHeadlineForDisplay = isRefreshing ? displayOverviewHeadline : null;
  const structuredHeadlineForDisplay = isRefreshing ? displayStructuredHeadline : null;

  return (
    <div className="space-y-8">
      <EditableOverviewSection
        overview={profile?.overview ?? null}
        streamingDraft={overviewDraft}
        isStreaming={isStreaming}
        isThinking={showOverviewThinking}
        onSave={onSaveOverview}
        isSaving={isSavingOverview}
        headline={overviewHeadlineForDisplay}
        isEditingLocked={isEditingLocked}
      />

      <Separator />

      <div className="space-y-8">
        <EditableIndustriesSection
          industries={effectiveIndustries}
          onSave={onSavePrimaryIndustries}
          isSaving={isSavingPrimaryIndustries}
          headline={structuredHeadlineForDisplay}
          isThinking={showStructuredThinking}
          isEditingLocked={isEditingLocked}
        />

        <EditableOfferingsSection
          offerings={effectiveOfferings}
          onSave={onSaveKeyOfferings}
          isSaving={isSavingKeyOfferings}
          headline={structuredHeadlineForDisplay}
          isThinking={showStructuredThinking}
          isEditingLocked={isEditingLocked}
        />

        <EditableValuePropsSection
          valueProps={effectiveValueProps}
          onSave={onSaveValueProps}
          isSaving={isSavingValueProps}
          headline={structuredHeadlineForDisplay}
          isThinking={showStructuredThinking}
          isEditingLocked={isEditingLocked}
        />
      </div>
    </div>
  );
}
