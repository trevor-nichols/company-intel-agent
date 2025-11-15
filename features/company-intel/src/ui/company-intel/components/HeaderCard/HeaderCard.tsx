// ------------------------------------------------------------------------------------------------
//                HeaderCard.tsx - Company intel summary header with export + stats
// ------------------------------------------------------------------------------------------------

import React, { useCallback, useEffect, type ReactElement } from 'react';
import { Button } from '@company-intel/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@company-intel/ui/avatar';
import { Badge } from '@company-intel/ui/badge';
import { CardHeader } from '@company-intel/ui/card';
import { Separator } from '@company-intel/ui/separator';
import { Download } from 'lucide-react';
import { useExportCompanyIntelSnapshot } from '../../hooks';
import type {
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyProfile,
  CompanyProfileSnapshot,
} from '../../types';
import { deriveInitials, formatDate, formatStatusLabel, getStatusVariant } from '../../utils/formatters';
import { EditableIdentity } from './components';

interface HeaderCardProps {
  readonly profile: CompanyProfile | null;
  readonly structuredProfile?: CompanyIntelSnapshotStructuredProfileSummary | null;
  readonly faviconOverride?: string | null;
  readonly profileStatus: CompanyProfile['status'] | 'not_configured';
  readonly latestSnapshot?: CompanyProfileSnapshot | null;
  readonly domainLabel: string | null;
  readonly isScraping: boolean;
  readonly isStreaming?: boolean;
  readonly displayStatusBadge?: boolean;
  readonly onSaveIdentity: (payload: { companyName: string | null; tagline: string | null }) => Promise<void>;
  readonly isSavingIdentity: boolean;
}

export function HeaderCard({
  profile,
  structuredProfile,
  faviconOverride,
  profileStatus,
  latestSnapshot = null,
  domainLabel,
  isScraping,
  isStreaming = false,
  displayStatusBadge = true,
  onSaveIdentity,
  isSavingIdentity,
}: HeaderCardProps): ReactElement {
  const effectiveCompanyName = structuredProfile?.companyName ?? profile?.companyName ?? null;
  const effectiveTagline = structuredProfile?.tagline ?? profile?.tagline ?? null;
  const faviconUrl = faviconOverride ?? profile?.faviconUrl ?? null;
  const domainDisplay = domainLabel ? domainLabel.replace(/https?:\/\//i, '').replace(/\/$/, '') : null;
  const avatarInitials = deriveInitials(effectiveCompanyName ?? domainDisplay ?? null);
  const snapshotForDisplay = latestSnapshot ?? null;
  const isRefreshing = isScraping || isStreaming;
  const snapshotMetadataAvailable = !isRefreshing;
  const snapshotForMetadata = snapshotMetadataAvailable ? snapshotForDisplay : null;
  const lastRefreshedLabel = snapshotForMetadata?.completedAt ? formatDate(snapshotForMetadata.completedAt) : null;
  const latestSnapshotLabel = snapshotForMetadata ? `Snapshot #${snapshotForMetadata.id}` : null;
  const valuePropCount = structuredProfile?.valueProps.length ?? (isRefreshing ? 0 : (profile?.valueProps.length ?? 0));
  const industryCount = structuredProfile?.primaryIndustries.length ?? (isRefreshing ? 0 : (profile?.primaryIndustries.length ?? 0));
  const offeringsCount = structuredProfile?.keyOfferings.length ?? (isRefreshing ? 0 : (profile?.keyOfferings.length ?? 0));
  const showLiveIndicator = isStreaming && (structuredProfile !== null || isScraping);
  const latestSnapshotIsComplete = snapshotForDisplay?.status === 'complete';
  const showStatusBadge =
    displayStatusBadge &&
    !latestSnapshotIsComplete &&
    profileStatus !== 'ready' &&
    profileStatus !== 'not_configured';
  const summaryBadgeClass =
    'rounded-full border border-border/40 bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground';
  const snapshotBadge = latestSnapshotLabel ? (
    <span className={summaryBadgeClass}>{latestSnapshotLabel}</span>
  ) : null;
  const lastRefreshedBadge = lastRefreshedLabel ? (
    <span className={summaryBadgeClass}>{`Refreshed ${lastRefreshedLabel}`}</span>
  ) : null;
  const showSummaryBadges = Boolean(snapshotBadge || lastRefreshedBadge);

  const exportSnapshot = useExportCompanyIntelSnapshot();
  const {
    mutate: exportSnapshotMutate,
    reset: resetExportSnapshot,
    isPending: isExportPending,
    isError: isExportError,
  } = exportSnapshot;

  const handleExport = useCallback(() => {
    if (!snapshotForDisplay || snapshotForDisplay.status !== 'complete') {
      return;
    }
    exportSnapshotMutate({ snapshotId: snapshotForDisplay.id });
  }, [exportSnapshotMutate, snapshotForDisplay]);

  useEffect(() => {
    resetExportSnapshot();
  }, [snapshotForDisplay?.id, resetExportSnapshot]);

  return (
    <CardHeader className="space-y-6 pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border border-border/40 bg-background">
            <AvatarImage src={faviconUrl ?? undefined} alt="" />
            <AvatarFallback className="text-xs font-semibold uppercase text-muted-foreground">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
          <EditableIdentity
            companyName={effectiveCompanyName}
            tagline={effectiveTagline}
            domainLabel={domainLabel}
            isEditable={Boolean(profile)}
            isSaving={isSavingIdentity}
            onSave={onSaveIdentity}
          />
        </div>
        <div className="flex flex-col items-end gap-3 text-xs text-muted-foreground sm:items-end">
          {showSummaryBadges || latestSnapshotIsComplete ? (
            <div className="flex flex-nowrap items-center justify-end gap-2 sm:gap-3">
              {lastRefreshedBadge}
              {snapshotBadge}
              {latestSnapshotIsComplete ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleExport}
                  disabled={isExportPending}
                  className="h-9 w-9 rounded-full border-border/60"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  <span className="sr-only">{isExportPending ? 'Preparing PDF…' : 'Export snapshot as PDF'}</span>
                </Button>
              ) : null}
            </div>
          ) : null}
          {showStatusBadge ? (
            <Badge variant={getStatusVariant(profileStatus)}>{formatStatusLabel(profileStatus)}</Badge>
          ) : null}
          {showLiveIndicator ? (
            <span className="flex items-center gap-1 rounded-full border border-red-200/50 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-500 dark:border-red-400/40 dark:bg-red-400/15">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              Live update
            </span>
          ) : null}
          {isExportError ? (
            <span className="self-end text-xs font-medium text-destructive">
              Unable to export. Please try again.
            </span>
          ) : null}
        </div>
      </div>

      {profile?.lastError && profile?.status === 'failed' ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {profile.lastError}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <OverviewStat label="Value props" value={valuePropCount} />
        <OverviewStat label="Industries" value={industryCount} />
        <OverviewStat label="Key offerings" value={offeringsCount} />
      </div>

      <Separator className="border-border/40" />
    </CardHeader>
  );
}

interface OverviewStatProps {
  readonly label: string;
  readonly value: number;
}

function OverviewStat({ label, value }: OverviewStatProps): ReactElement {
  const displayValue = value > 0 ? value.toString() : '—';
  return (
    <div className="rounded-lg border border-border/30 bg-muted/5 px-3 py-2">
      <p className="text-sm font-semibold text-foreground">{displayValue}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
