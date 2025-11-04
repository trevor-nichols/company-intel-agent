"use client";

// ------------------------------------------------------------------------------------------------
//                CompanyIntelPanel - Basic company intel management UI
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';
import { Card, CardContent } from '@agenai/ui/card';
import { SnapshotDetailsDialog } from './components/SnapshotDetailsDialog/SnapshotDetailsDialog';
import { HeaderCard } from './components/HeaderCard';
import { OverviewPanel } from './components/OverviewPanel';
import { RunIntelForm } from './components/RunIntelForm';
import { SnapshotsPanel } from './components/SnapshotsPanel';
import { useCompanyIntelWorkflow } from './hooks';

interface CompanyIntelPanelProps {
  readonly displayStatusBadge?: boolean;
  readonly displayRunHistory?: boolean;
}

export function CompanyIntelPanel({
  displayStatusBadge = true,
  displayRunHistory = true,
}: CompanyIntelPanelProps = {}): ReactElement {
  const workflow = useCompanyIntelWorkflow();

  const {
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
    detailsOpen,
    onDomainChange,
    onManualUrlChange,
    addManualUrl,
    removeManualUrl,
    toggleSelection,
    submit,
    startOver,
    openSnapshotDetails,
    handleDetailsOpenChange,
    profileEditor,
  } = workflow;

  const domainLabel = profile?.domain ?? (trimmedDomain.length > 0 ? trimmedDomain : null);

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-8 px-4 lg:px-0 lg:space-y-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2.35fr)_minmax(320px,1fr)] xl:gap-10 2xl:gap-12">
        <div className="space-y-6">
          <Card className="h-full w-full">
            <HeaderCard
              profile={profile}
              structuredProfile={structuredSummaryDraft}
              faviconOverride={faviconDraft}
              profileStatus={profileStatus}
              domainLabel={domainLabel}
              isScraping={isScraping}
              isStreaming={isStreaming}
              displayStatusBadge={displayStatusBadge}
              onSaveIdentity={profileEditor.saveIdentity}
              isSavingIdentity={profileEditor.isSavingIdentity}
            />
            <CardContent className="space-y-10 pt-6">
              <OverviewPanel
                profile={profile}
                structuredProfile={structuredSummaryDraft}
                isStreaming={isStreaming}
                isScraping={isScraping}
                isLoading={isLoading}
                overviewDraft={overviewDraft}
                overviewHeadline={overviewReasoningHeadline}
                structuredHeadline={structuredReasoningHeadline}
                onSaveOverview={profileEditor.saveOverview}
                onSavePrimaryIndustries={profileEditor.savePrimaryIndustries}
                onSaveValueProps={profileEditor.saveValueProps}
                onSaveKeyOfferings={profileEditor.saveKeyOfferings}
                isSavingOverview={profileEditor.isSavingOverview}
                isSavingPrimaryIndustries={profileEditor.isSavingPrimaryIndustries}
                isSavingValueProps={profileEditor.isSavingValueProps}
                isSavingKeyOfferings={profileEditor.isSavingKeyOfferings}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col space-y-6">
          <RunIntelForm
            domain={domain}
            trimmedDomain={trimmedDomain}
            onDomainChange={onDomainChange}
            submit={submit}
            startOver={startOver}
            isBusy={isBusy}
            isPreviewing={isPreviewing}
            isScraping={isScraping}
            hasPreview={hasPreview}
            errorMessage={errorMessage}
            manualError={manualError}
            statusMessages={statusMessages}
            manualUrl={manualUrl}
            onManualUrlChange={onManualUrlChange}
            addManualUrl={addManualUrl}
            removeManualUrl={removeManualUrl}
            toggleSelection={toggleSelection}
            selectedUrls={selectedUrls}
            recommendedSelections={recommendedSelections}
            manualSelectedUrls={manualSelectedUrls}
            previewData={previewData}
          />

          {displayRunHistory ? (
            <SnapshotsPanel
              snapshots={snapshots}
              isLoading={isLoading}
              isError={isError}
              onViewDetails={openSnapshotDetails}
            />
          ) : null}
        </div>
      </div>

      <SnapshotDetailsDialog
        snapshot={selectedSnapshot}
        open={Boolean(selectedSnapshot) && detailsOpen}
        onOpenChange={handleDetailsOpenChange}
      />
    </div>
  );
}
