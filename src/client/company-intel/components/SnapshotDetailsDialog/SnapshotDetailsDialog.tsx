"use client";

// ------------------------------------------------------------------------------------------------
//                SnapshotDetailsDialog.tsx - Snapshot content viewer - Dependencies: ui/dialog, MarkdownRenderer
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Component
// ------------------------------------------------------------------------------------------------

import { useCallback, useEffect, type ReactElement } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@agenai/ui/dialog';
import { ScrollArea } from '@agenai/ui/scroll-area';
import { Button } from '@agenai/ui/button';
import { Download } from 'lucide-react';
import type { CompanyProfileSnapshot } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import { ScrapeResults, SnapshotSummary, SummariesSection, SummaryMetadataPanel } from './components';
import { useSnapshotDetails } from './hooks/useSnapshotDetails';
import { useExportCompanyIntelSnapshot } from '../../hooks';

interface SnapshotDetailsDialogProps {
  readonly snapshot: CompanyProfileSnapshot | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function SnapshotDetailsDialog({ snapshot, open, onOpenChange }: SnapshotDetailsDialogProps): ReactElement {
  const {
    snapshot: resolvedSnapshot,
    scrapeViewModels,
    structuredProfile,
    overview,
    metadata,
    pagesXml,
    structuredReasoningHeadline,
    overviewReasoningHeadline,
    totalScrapes,
    successfulScrapes,
    failedScrapes,
  } = useSnapshotDetails(snapshot);

  const exportSnapshot = useExportCompanyIntelSnapshot();
  const {
    mutate: exportSnapshotMutate,
    reset: resetExportSnapshot,
    isPending: isExportPending,
    isError: isExportError,
  } = exportSnapshot;

  const handleExport = useCallback(() => {
    if (!resolvedSnapshot) {
      return;
    }
    exportSnapshotMutate({ snapshotId: resolvedSnapshot.id });
  }, [exportSnapshotMutate, resolvedSnapshot]);

  useEffect(() => {
    resetExportSnapshot();
  }, [resolvedSnapshot?.id, resetExportSnapshot]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {resolvedSnapshot ? (
        <DialogContent className="w-[min(96vw,72rem)] max-w-[72rem] border-none bg-transparent p-0 shadow-none">
          <div className="flex min-h-[60vh] max-h-[82vh] flex-col overflow-hidden rounded-3xl border border-border/60 bg-white shadow-2xl backdrop-blur-lg dark:bg-gray-950">
            <div className="sticky top-0 z-20 border-b border-border/60 bg-white/95 px-6 py-5 backdrop-blur-lg dark:bg-gray-950/90">
              <DialogHeader className="space-y-3 text-left">
                <DialogTitle className="text-xl font-semibold tracking-tight">
                  Snapshot #{resolvedSnapshot.id}
                </DialogTitle>
                <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                  Captured {totalScrapes} URL{totalScrapes === 1 ? '' : 's'} on{' '}
                  <span className="font-medium text-foreground">{resolvedSnapshot.domain ?? '—'}</span>. Success: {successfulScrapes} ·
                  Failures: {failedScrapes}. Last update{' '}
                  {formatDateTime(resolvedSnapshot.completedAt ?? resolvedSnapshot.createdAt)}.
                </DialogDescription>
              </DialogHeader>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <SnapshotSummary
                  snapshot={resolvedSnapshot}
                  totalScrapes={totalScrapes}
                  successfulScrapes={successfulScrapes}
                  failedScrapes={failedScrapes}
                />
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={isExportPending}
                  className="min-w-[9rem]"
                >
                  <Download className="mr-2 h-4 w-4" aria-hidden />
                  {isExportPending ? 'Preparing…' : 'Export PDF'}
                </Button>
                {isExportError ? (
                  <span className="text-xs font-medium text-destructive">
                    Unable to export. Please try again.
                  </span>
                ) : null}
              </div>
            </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 px-6 py-6">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
                  <div className="space-y-6">
                    <SummariesSection
                      overview={overview}
                      structuredProfile={structuredProfile}
                      metadata={metadata}
                      pagesXml={pagesXml}
                      overviewHeadline={overviewReasoningHeadline}
                      structuredHeadline={structuredReasoningHeadline}
                    />
                  </div>

                  <div className="space-y-6">
                    <SummaryMetadataPanel metadata={metadata} />
                    <ScrapeResults
                      scrapes={scrapeViewModels}
                      totalScrapes={totalScrapes}
                      successfulScrapes={successfulScrapes}
                      failedScrapes={failedScrapes}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
