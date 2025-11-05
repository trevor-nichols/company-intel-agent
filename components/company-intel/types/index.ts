// ------------------------------------------------------------------------------------------------
//                Company Intel Types - Shared between hooks and components
// ------------------------------------------------------------------------------------------------

export type CompanyProfileStatus = 'not_configured' | 'pending' | 'ready' | 'failed';
export type CompanyProfileSnapshotStatus = 'pending' | 'complete' | 'failed';

export interface CompanyProfileKeyOffering {
  readonly title: string;
  readonly description?: string;
}

export interface CompanyProfile {
  readonly id: number;
  readonly teamId: number;
  readonly domain: string | null;
  readonly status: CompanyProfileStatus;
  readonly companyName: string | null;
  readonly tagline: string | null;
  readonly overview: string | null;
  readonly valueProps: readonly string[];
  readonly keyOfferings: readonly CompanyProfileKeyOffering[];
  readonly primaryIndustries: readonly string[];
  readonly faviconUrl: string | null;
  readonly lastSnapshotId: number | null;
  readonly lastRefreshedAt: Date | null;
  readonly lastError: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CompanyIntelAgentSource {
  readonly page: string;
  readonly url: string;
  readonly rationale?: string;
}

export interface CompanyIntelSnapshotAgentMetadata {
  readonly responseId?: string | null;
  readonly model?: string | null;
  readonly usage?: Record<string, unknown> | null;
  readonly rawText?: string | null;
  readonly headline?: string | null;
  readonly summary?: string | null;
}

export interface CompanyIntelSnapshotStructuredProfileSummary {
  readonly companyName?: string | null;
  readonly tagline?: string | null;
  readonly valueProps: readonly string[];
  readonly keyOfferings: readonly CompanyProfileKeyOffering[];
  readonly primaryIndustries: readonly string[];
  readonly sources: readonly CompanyIntelAgentSource[];
}

export interface CompanyIntelSnapshotSummaries {
  readonly structuredProfile?: CompanyIntelSnapshotStructuredProfileSummary;
  readonly overview?: string | null;
  readonly metadata?: {
    readonly structuredProfile?: CompanyIntelSnapshotAgentMetadata;
    readonly overview?: CompanyIntelSnapshotAgentMetadata;
  };
  readonly pagesXml?: string | null;
}

export interface CompanyIntelStreamStructuredPayload {
  readonly structuredProfile: CompanyIntelSnapshotStructuredProfileSummary;
  readonly metadata?: CompanyIntelSnapshotAgentMetadata;
  readonly faviconUrl?: string | null;
  readonly reasoningHeadline?: string | null;
}

export interface CompanyProfileSnapshot {
  readonly id: number;
  readonly teamId: number;
  readonly domain: string | null;
  readonly status: CompanyProfileSnapshotStatus;
  readonly selectedUrls: readonly string[];
  readonly mapPayload: unknown;
  readonly summaries: CompanyIntelSnapshotSummaries | null;
  readonly rawScrapes: readonly CompanyIntelScrapeRecord[];
  readonly initiatedByUserId: number | null;
  readonly error: string | null;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
}

export interface CompanyIntelData {
  readonly profile: CompanyProfile | null;
  readonly snapshots: readonly CompanyProfileSnapshot[];
}

export interface CompanyIntelPreviewMapLink {
  readonly url: string;
}

export interface CompanyIntelPreviewMap {
  readonly baseUrl: string;
  readonly links: readonly CompanyIntelPreviewMapLink[];
  readonly responseTime: number | null;
  readonly requestId: string | null;
}

export interface CompanyIntelSelection {
  readonly url: string;
  readonly score: number;
  readonly matchedSignals: readonly string[];
}

export interface CompanyIntelPreviewResult {
  readonly domain: string;
  readonly map: CompanyIntelPreviewMap;
  readonly selections: readonly CompanyIntelSelection[];
}

export interface CompanyIntelScrapeResponseResult {
  readonly url: string;
  readonly rawContent?: string;
  readonly markdown?: string;
  readonly text?: string;
  readonly images?: readonly string[];
  readonly favicon?: string | null;
  readonly title?: string;
  readonly description?: string;
  readonly metadata?: Record<string, unknown> | null;
}

export interface CompanyIntelScrapeResponseFailure {
  readonly url: string;
  readonly error?: string;
  readonly status?: number;
  readonly reason?: string;
}

export interface CompanyIntelScrapeResponse {
  readonly results: readonly CompanyIntelScrapeResponseResult[];
  readonly failedResults: readonly CompanyIntelScrapeResponseFailure[];
  readonly requestId: string | null;
  readonly responseTime: number | null;
}

export interface CompanyIntelScrapeError {
  readonly name: string;
  readonly message: string;
}

export interface CompanyIntelScrapeRecord {
  readonly url: string;
  readonly success: boolean;
  readonly durationMs: number;
  readonly response?: CompanyIntelScrapeResponse;
  readonly error?: CompanyIntelScrapeError;
}

export interface CompanyIntelTriggerOptions {
  readonly maxPages?: number;
  readonly includeSubdomains?: boolean;
  readonly ignoreQueryParameters?: boolean;
}

export interface PreviewCompanyIntelInput {
  readonly domain: string;
  readonly options?: CompanyIntelTriggerOptions;
}

export interface TriggerCompanyIntelInput {
  readonly domain: string;
  readonly options?: CompanyIntelTriggerOptions;
  readonly selectedUrls?: readonly string[];
}

export interface TriggerCompanyIntelResult {
  readonly snapshotId: number;
  readonly teamId: number;
  readonly status: CompanyProfileSnapshotStatus;
  readonly selections: readonly CompanyIntelSelection[];
  readonly totalLinksMapped: number;
  readonly successfulPages: number;
  readonly failedPages: number;
}

export type CompanyIntelRunStage =
  | 'mapping'
  | 'scraping'
  | 'analysis_structured'
  | 'analysis_overview'
  | 'persisting';

export interface CompanyIntelStreamBaseEvent {
  readonly snapshotId: number;
  readonly teamId: number;
  readonly domain: string;
}

export type CompanyIntelStreamEvent =
  | (CompanyIntelStreamBaseEvent & {
      readonly type: 'snapshot-created';
      readonly status: CompanyProfileSnapshotStatus;
    })
  | (CompanyIntelStreamBaseEvent & {
      readonly type: 'status';
      readonly stage: CompanyIntelRunStage;
      readonly completed?: number;
      readonly total?: number;
    })
  | (CompanyIntelStreamBaseEvent & {
      readonly type: 'structured-delta';
      readonly delta: string;
      readonly accumulated: string;
      readonly snapshot?: string | null;
      readonly summary?: CompanyIntelSnapshotStructuredProfileSummary | null;
    })
  | (CompanyIntelStreamBaseEvent & {
      readonly type: 'structured-reasoning-delta';
      readonly delta: string;
      readonly headline: string | null;
      readonly snapshot?: string | null;
    })
  | (CompanyIntelStreamBaseEvent & {
      readonly type: 'structured-complete';
      readonly payload: CompanyIntelStreamStructuredPayload;
    })
  | (CompanyIntelStreamBaseEvent & {
      readonly type: 'overview-delta';
      readonly delta: string;
      readonly snapshot?: string | null;
      readonly displayText?: string | null;
    })
  | (CompanyIntelStreamBaseEvent & {
      readonly type: 'overview-reasoning-delta';
      readonly delta: string;
      readonly headline: string | null;
      readonly snapshot?: string | null;
    })
  | (CompanyIntelStreamBaseEvent & {
      readonly type: 'overview-complete';
      readonly overview: string;
      readonly headline?: string | null;
    })
  | (CompanyIntelStreamBaseEvent & {
      readonly type: 'run-complete';
      readonly result: TriggerCompanyIntelResult;
    })
  | (CompanyIntelStreamBaseEvent & {
      readonly type: 'run-error';
      readonly message: string;
    });
