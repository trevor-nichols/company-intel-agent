// ------------------------------------------------------------------------------------------------
//                HeaderCard.tsx - Company intel summary header with status + stats
// ------------------------------------------------------------------------------------------------

import type { ReactElement } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@agenai/ui/avatar';
import { Badge } from '@agenai/ui/badge';
import { CardHeader } from '@agenai/ui/card';
import { Separator } from '@agenai/ui/separator';
import type { CompanyProfile, CompanyIntelSnapshotStructuredProfileSummary } from '../../types';
import { deriveInitials, formatDate, formatStatusLabel, getStatusVariant } from '../../utils/formatters';
import { EditableIdentity } from './components';

interface HeaderCardProps {
  readonly profile: CompanyProfile | null;
  readonly structuredProfile?: CompanyIntelSnapshotStructuredProfileSummary | null;
  readonly faviconOverride?: string | null;
  readonly profileStatus: CompanyProfile['status'] | 'not_configured';
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
  const lastRefreshedLabel = profile?.lastRefreshedAt ? formatDate(profile.lastRefreshedAt) : null;
  const latestSnapshotLabel = profile?.lastSnapshotId ? `Snapshot #${profile.lastSnapshotId}` : null;
  const valuePropCount = structuredProfile?.valueProps.length ?? profile?.valueProps.length ?? 0;
  const industryCount = structuredProfile?.primaryIndustries.length ?? profile?.primaryIndustries.length ?? 0;
  const offeringsCount = structuredProfile?.keyOfferings.length ?? profile?.keyOfferings.length ?? 0;
  const showLiveIndicator = isStreaming && (structuredProfile !== null || isScraping);
  const showLastRun = Boolean(lastRefreshedLabel || latestSnapshotLabel);

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
        <div className="flex flex-col items-start gap-3 text-xs text-muted-foreground sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {displayStatusBadge ? (
              <Badge variant={getStatusVariant(profileStatus)}>{formatStatusLabel(profileStatus)}</Badge>
            ) : null}
            {showLiveIndicator ? (
              <span className="flex items-center gap-1 rounded-full border border-red-200/50 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-500 dark:border-red-400/40 dark:bg-red-400/15">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                Live update
              </span>
            ) : null}
          </div>
          {showLastRun ? (
            <div className="flex flex-col items-start gap-1 sm:items-end">
              {lastRefreshedLabel ? <span>{`Last refreshed ${lastRefreshedLabel}`}</span> : null}
            {latestSnapshotLabel ? (
              <div className="flex items-center gap-2 self-start sm:self-end">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Latest snapshot</span>
                <span className="rounded-full border border-border/40 bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground">
                  {latestSnapshotLabel}
                </span>
              </div>
            ) : null}
            </div>
          ) : null}
          {isScraping ? (
            <span className="flex items-center gap-2 text-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Refreshing…
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
