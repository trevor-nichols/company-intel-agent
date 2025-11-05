// ------------------------------------------------------------------------------------------------
//                index.ts - Shared type contracts for company intel feature - Dependencies: none
// ------------------------------------------------------------------------------------------------

export interface CompanyIntelSelection {
  readonly url: string;
  readonly title?: string | null;
  readonly summary?: string | null;
}

export interface CompanyIntelPageContent {
  readonly url: string;
  readonly content: string;
  readonly title?: string;
}

export interface CompanyIntelOverviewSummary {
  readonly overview: string;
  readonly sources: readonly CompanyIntelSelection[];
}

export interface CompanyIntelStructuredSummary {
  readonly companyName: string | null;
  readonly tagline: string | null;
  readonly valueProps: readonly string[];
  readonly keyOfferings: readonly { readonly title: string; readonly description?: string; }[];
  readonly primaryIndustries: readonly string[];
  readonly sources: readonly { readonly page: string; readonly url: string; readonly rationale?: string; }[];
}

export interface CompanyIntelSnapshotPreview {
  readonly domain: string;
  readonly selections: readonly CompanyIntelSelection[];
  readonly totalLinksMapped: number;
  readonly successfulPages: number;
  readonly failedPages: number;
}

export interface CompanyIntelCollectionResult {
  readonly snapshotId?: number;
  readonly structuredSummary: CompanyIntelStructuredSummary;
  readonly overviewSummary: CompanyIntelOverviewSummary;
  readonly snapshotPreview: CompanyIntelSnapshotPreview;
  readonly faviconUrl?: string | null;
  readonly completedAt?: Date;
}

export interface CompanyIntelAdapter {
  runCollection(params: CompanyIntelRunParams): Promise<CompanyIntelCollectionResult>;
  getSnapshotHistory?(params?: CompanyIntelHistoryParams): Promise<unknown>;
  getProfile?(): Promise<unknown>;
  updateProfile?(params: CompanyIntelProfileUpdateParams): Promise<unknown>;
}

export interface CompanyIntelRunParams {
  readonly domain: string;
  readonly options?: Record<string, unknown>;
}

export interface CompanyIntelHistoryParams {
  readonly limit?: number;
}

export interface CompanyIntelProfileUpdateParams {
  readonly updates: Partial<{
    companyName: string | null;
    tagline: string | null;
    overview: string | null;
    primaryIndustries: readonly string[];
    valueProps: readonly string[];
    keyOfferings: readonly { readonly title: string; readonly description?: string; }[];
  }>;
}
