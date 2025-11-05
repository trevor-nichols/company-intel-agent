// ------------------------------------------------------------------------------------------------
//                OverviewPanel.tsx - Executive overview + structured intel presentation
// ------------------------------------------------------------------------------------------------

import React, { type ReactElement } from 'react';
import { Separator } from '@agenai/ui/separator';
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
  readonly overviewHeadline?: string | null;
  readonly structuredHeadline?: string | null;
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
  profile,
  structuredProfile,
  isLoading,
  isStreaming = false,
  isScraping,
  overviewHeadline,
  structuredHeadline,
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
  const effectiveIndustries = structuredProfile?.primaryIndustries ?? profile?.primaryIndustries ?? [];
  const effectiveOfferings = structuredProfile?.keyOfferings ?? profile?.keyOfferings ?? [];
  const effectiveValueProps = structuredProfile?.valueProps ?? profile?.valueProps ?? [];
  const displayOverviewHeadline = overviewHeadline?.trim().length ? overviewHeadline.trim() : null;
  const displayStructuredHeadline = structuredHeadline?.trim().length ? structuredHeadline.trim() : null;
  const hasStreamingOverview = Boolean(overviewDraft && overviewDraft.trim().length > 0);
  const showOverviewThinking = isRefreshing && !hasStreamingOverview;
  const showStructuredThinking = isRefreshing && !structuredProfile;
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
      />

      <Separator />

      <div className="space-y-8">
        <EditableIndustriesSection
          industries={effectiveIndustries}
          onSave={onSavePrimaryIndustries}
          isSaving={isSavingPrimaryIndustries}
          headline={structuredHeadlineForDisplay}
          isThinking={showStructuredThinking}
        />

        <EditableOfferingsSection
          offerings={effectiveOfferings}
          onSave={onSaveKeyOfferings}
          isSaving={isSavingKeyOfferings}
          headline={structuredHeadlineForDisplay}
          isThinking={showStructuredThinking}
        />

        <EditableValuePropsSection
          valueProps={effectiveValueProps}
          onSave={onSaveValueProps}
          isSaving={isSavingValueProps}
          headline={structuredHeadlineForDisplay}
          isThinking={showStructuredThinking}
        />
      </div>
    </div>
  );
}
