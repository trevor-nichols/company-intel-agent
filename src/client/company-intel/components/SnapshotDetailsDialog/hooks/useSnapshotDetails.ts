// ------------------------------------------------------------------------------------------------
//                useSnapshotDetails - Derives snapshot view models for dialog presentation
// ------------------------------------------------------------------------------------------------

import { useMemo } from 'react';
import type {
  CompanyIntelScrapeRecord,
  CompanyIntelScrapeResponseResult,
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyIntelSnapshotSummaries,
  CompanyProfileSnapshot,
} from '../../../types';

export interface SnapshotScrapeViewModel {
  readonly scrape: CompanyIntelScrapeRecord;
  readonly primaryDocument: CompanyIntelScrapeResponseResult | null;
  readonly content: string | null;
  readonly hasImages: boolean;
  readonly imageCount: number;
}

export interface UseSnapshotDetailsResult {
  readonly snapshot: CompanyProfileSnapshot | null;
  readonly scrapes: readonly CompanyIntelScrapeRecord[];
  readonly scrapeViewModels: readonly SnapshotScrapeViewModel[];
  readonly summaries: CompanyProfileSnapshot['summaries'];
  readonly structuredProfile: CompanyIntelSnapshotStructuredProfileSummary | null;
  readonly overview: string | null;
  readonly metadata: CompanyIntelSnapshotSummaries['metadata'] | null;
  readonly pagesXml: string | null;
  readonly structuredReasoningHeadline: string | null;
  readonly overviewReasoningHeadline: string | null;
  readonly totalScrapes: number;
  readonly successfulScrapes: number;
  readonly failedScrapes: number;
}

const pickPrimaryDocument = (
  scrape: CompanyIntelScrapeRecord,
): CompanyIntelScrapeResponseResult | null => {
  if (!scrape.response) {
    return null;
  }

  const { results } = scrape.response;
  if (results.length === 0) {
    return null;
  }

  return results.find((result: CompanyIntelScrapeResponseResult) => result.url === scrape.url) ?? results[0] ?? null;
};

export const useSnapshotDetails = (
  snapshot: CompanyProfileSnapshot | null,
): UseSnapshotDetailsResult => {
  const scrapes = useMemo(() => snapshot?.rawScrapes ?? [], [snapshot?.rawScrapes]);

  const scrapeViewModels = useMemo<SnapshotScrapeViewModel[]>(
    () =>
      scrapes.map((scrape: CompanyIntelScrapeRecord) => {
        const primaryDocument = pickPrimaryDocument(scrape);
        const content = primaryDocument?.markdown ?? primaryDocument?.rawContent ?? primaryDocument?.text ?? null;
        const imageCount = primaryDocument?.images?.length ?? 0;

        return {
          scrape,
          primaryDocument: primaryDocument ?? null,
          content,
          hasImages: imageCount > 0,
          imageCount,
        };
      }),
    [scrapes],
  );

  const summaries = snapshot?.summaries ?? null;
  const structuredProfile = summaries?.structuredProfile ?? null;
  const overview = summaries?.overview ?? null;
  const metadata = summaries?.metadata ?? null;
  const pagesXml = summaries?.pagesXml ?? null;
  const structuredReasoningHeadline = metadata?.structuredProfile?.headline ?? null;
  const overviewReasoningHeadline = metadata?.overview?.headline ?? null;

  const successfulScrapes = useMemo(
    () => scrapes.filter((scrape: CompanyIntelScrapeRecord) => scrape.success).length,
    [scrapes],
  );
  const totalScrapes = scrapes.length;
  const failedScrapes = totalScrapes - successfulScrapes;

  return {
    snapshot,
    scrapes,
    scrapeViewModels,
    summaries,
    structuredProfile,
    overview,
    metadata,
    pagesXml,
    structuredReasoningHeadline,
    overviewReasoningHeadline,
    totalScrapes,
    successfulScrapes,
    failedScrapes,
  };
};
