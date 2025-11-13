"use client";

// ------------------------------------------------------------------------------------------------
//                CompanyIntelPanel - Basic company intel management UI
// ------------------------------------------------------------------------------------------------

import React, { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Card, CardContent } from '@agenai/ui/card';
import { HeaderCard } from './components/HeaderCard';
import { OverviewPanel } from './components/OverviewPanel';
import { RunIntelForm } from './components/RunIntelForm';
import { SnapshotsPanel } from './components/SnapshotsPanel';
import { ChatPanel, SidebarSwitcher } from './components/Sidebar';
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
    faviconDraft,
    manualUrl,
    hasPreview,
    isPreviewing,
    isScraping,
    isBusy,
    isLoading,
    isError,
    isStreaming,
    isResuming,
    isCancelling,
    hasActiveRun,
    onDomainChange,
    onManualUrlChange,
    addManualUrl,
    removeManualUrl,
    toggleSelection,
    submit,
    startOver,
    cancelActiveRun,
    profileEditor,
  } = workflow;

  const domainLabel = profile?.domain ?? (trimmedDomain.length > 0 ? trimmedDomain : null);

  const sidebarPanes = useMemo(() => {
    const panes: Array<{ id: string; label: string; disabled?: boolean; render: () => ReactElement }> = [];

    panes.push({
      id: 'run',
      label: 'Run & history',
      render: () => (
        <div className="space-y-6">
          <RunIntelForm
            domain={domain}
            trimmedDomain={trimmedDomain}
            onDomainChange={onDomainChange}
            submit={submit}
            startOver={startOver}
            isBusy={isBusy}
            isPreviewing={isPreviewing}
            isScraping={isScraping}
            isResuming={isResuming}
            isStreaming={isStreaming}
            isCancelling={isCancelling}
            hasActiveRun={hasActiveRun}
            cancelActiveRun={cancelActiveRun}
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
            />
          ) : null}
        </div>
      ),
    });

    panes.push({
      id: 'chat',
      label: 'Snapshot chat',
      disabled: !chatSnapshot,
      render: () => (
        chatSnapshot ? (
          <ChatPanel
            key="company-intel-chat"
            snapshotId={chatSnapshot.snapshotId}
            domain={chatSnapshot.domain}
            vectorStoreStatus={chatSnapshot.vectorStoreStatus}
            vectorStoreError={chatSnapshot.vectorStoreError}
            completedAt={chatSnapshot.completedAt}
            isRunInProgress={isScraping || hasActiveRun}
          />
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
            Complete a run to unlock the chat interface.
          </div>
        )
      ),
    });

    return panes;
  }, [
    addManualUrl,
    cancelActiveRun,
    chatSnapshot,
    displayRunHistory,
    domain,
    errorMessage,
    hasActiveRun,
    hasPreview,
    isBusy,
    isCancelling,
    isError,
    isLoading,
    isPreviewing,
    isResuming,
    isScraping,
    isStreaming,
    manualError,
    manualSelectedUrls,
    manualUrl,
    onDomainChange,
    onManualUrlChange,
    previewData,
    recommendedSelections,
    removeManualUrl,
    snapshots,
    startOver,
    statusMessages,
    submit,
    toggleSelection,
    trimmedDomain,
    selectedUrls,
  ]);

  const [sidebarTab, setSidebarTab] = useState<string>(chatSnapshot ? 'chat' : 'run');

  useEffect(() => {
    if (!chatSnapshot && sidebarTab === 'chat') {
      setSidebarTab('run');
    }
  }, [chatSnapshot, sidebarTab]);

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
              latestSnapshot={latestSnapshot}
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
                overviewHeadlines={overviewReasoningHeadlines}
                structuredHeadlines={structuredReasoningHeadlines}
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
          <SidebarSwitcher
            panes={sidebarPanes}
            value={sidebarTab}
            onChange={setSidebarTab}
          />
        </div>
      </div>
    </div>
  );
}
