// ------------------------------------------------------------------------------------------------
//                persistence.ts - Contracts for host-provided persistence helpers
// ------------------------------------------------------------------------------------------------

import type { CompanyProfileKeyOffering, CompanyProfileStatus, CompanyProfileSnapshotStatus } from '../../client/company-intel/types';

export interface CompanyIntelSnapshotRecord {
  readonly id: number;
  readonly teamId: number;
  readonly status: CompanyProfileSnapshotStatus;
  readonly domain?: string | null;
  readonly selectedUrls?: readonly string[] | null;
  readonly mapPayload?: unknown;
  readonly summaries?: unknown;
  readonly rawScrapes?: unknown;
  readonly initiatedByUserId?: number | null;
  readonly error?: string | null;
  readonly createdAt?: Date;
  readonly completedAt?: Date | null;
}

export interface CompanyIntelProfileRecord {
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

export interface CompanyIntelSnapshotCreateParams {
  readonly teamId: number;
  readonly domain?: string | null;
  readonly initiatedByUserId?: number | null;
  readonly status?: CompanyProfileSnapshotStatus;
}

export interface CompanyIntelSnapshotUpdate {
  readonly status?: CompanyProfileSnapshotStatus;
  readonly domain?: string | null;
  readonly selectedUrls?: readonly string[];
  readonly mapPayload?: unknown;
  readonly summaries?: unknown;
  readonly rawScrapes?: unknown;
  readonly error?: string | null;
  readonly completedAt?: Date | null;
}

export interface CompanyIntelPageInsert {
  readonly url: string;
  readonly contentType: 'markdown' | 'html';
  readonly markdown: string | null;
  readonly html: string | null;
  readonly metadata: Record<string, unknown>;
  readonly wordCount: number | null;
  readonly scrapedAt: Date;
  readonly createdAt: Date;
}

export interface CompanyIntelProfileUpsert {
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
}

export interface CompanyIntelPersistence {
  createSnapshot(params: CompanyIntelSnapshotCreateParams): Promise<CompanyIntelSnapshotRecord>;
  updateSnapshot(snapshotId: number, updates: CompanyIntelSnapshotUpdate): Promise<void>;
  replaceSnapshotPages(snapshotId: number, pages: readonly CompanyIntelPageInsert[]): Promise<void>;
  upsertProfile(params: CompanyIntelProfileUpsert): Promise<CompanyIntelProfileRecord>;
  listSnapshots(params: { readonly teamId: number; readonly limit?: number }): Promise<readonly CompanyIntelSnapshotRecord[]>;
  getProfile(teamId: number): Promise<CompanyIntelProfileRecord | null>;
  getSnapshotById(snapshotId: number): Promise<CompanyIntelSnapshotRecord | null>;
}
