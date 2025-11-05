// ------------------------------------------------------------------------------------------------
//                serialization.ts - Helpers to map API payloads to typed data
// ------------------------------------------------------------------------------------------------

import type {
  CompanyIntelAgentSource,
  CompanyIntelData,
  CompanyIntelSelection,
  CompanyIntelScrapeRecord,
  CompanyIntelScrapeResponse,
  CompanyIntelScrapeResponseFailure,
  CompanyIntelScrapeResponseResult,
  CompanyIntelSnapshotAgentMetadata,
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyIntelSnapshotSummaries,
  CompanyProfile,
  CompanyProfileKeyOffering,
  CompanyProfileSnapshot,
  CompanyProfileSnapshotStatus,
  CompanyProfileStatus,
} from '../types';

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normaliseKeyOfferings(value: unknown): CompanyProfileKeyOffering[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(item => typeof item === 'object' && item !== null)
    .map(item => {
      const record = item as Record<string, unknown>;
      return {
        title: typeof record.title === 'string' ? record.title : '',
        description: typeof record.description === 'string' ? record.description : undefined,
      } satisfies CompanyProfileKeyOffering;
    })
    .filter(offering => offering.title.length > 0);
}

function normaliseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(item => typeof item === 'string') as string[];
}

function normaliseAgentSources(value: unknown): CompanyIntelAgentSource[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const sources: CompanyIntelAgentSource[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const record = item as Record<string, unknown>;
    const page = typeof record.page === 'string' ? record.page : undefined;
    const url = typeof record.url === 'string' ? record.url : undefined;
    if (!page || !url) {
      continue;
    }

    const rationale = typeof record.rationale === 'string' ? record.rationale : undefined;

    sources.push({
      page,
      url,
      ...(rationale ? { rationale } : {}),
    });
  }

  return sources;
}

function normaliseAgentMetadata(value: unknown): CompanyIntelSnapshotAgentMetadata | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const hasAny =
    typeof record.responseId === 'string' ||
    typeof record.model === 'string' ||
    typeof record.rawText === 'string' ||
    typeof record.raw_text === 'string' ||
    typeof record.usage === 'object' ||
    typeof record.headline === 'string' ||
    typeof record.reasoning_headline === 'string';

  if (!hasAny) {
    return undefined;
  }

  const headlineCandidate =
    typeof record.headline === 'string'
      ? record.headline
      : typeof record.reasoning_headline === 'string'
        ? record.reasoning_headline
        : undefined;
  const headline = headlineCandidate?.trim();

  return {
    responseId:
      typeof record.responseId === 'string'
        ? record.responseId
        : typeof record.response_id === 'string'
          ? record.response_id
          : undefined,
    model: typeof record.model === 'string' ? record.model : undefined,
    usage: record.usage && typeof record.usage === 'object' ? (record.usage as Record<string, unknown>) : undefined,
    rawText:
      typeof record.rawText === 'string'
        ? record.rawText
        : typeof record.raw_text === 'string'
          ? record.raw_text
          : undefined,
    headline: headline && headline.length > 0 ? headline : undefined,
  } satisfies CompanyIntelSnapshotAgentMetadata;
}

function normaliseStructuredProfileSummary(value: unknown): CompanyIntelSnapshotStructuredProfileSummary | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  const companyName = typeof record.companyName === 'string' ? record.companyName : undefined;
  const fallback =
    typeof record.company_name === 'string'
      ? record.company_name
      : companyName;

  const taglineRaw = typeof record.tagline === 'string' ? record.tagline : undefined;
  const tagline = taglineRaw ? taglineRaw.trim() : undefined;

  const valueProps = normaliseStringArray(record.valueProps ?? record.value_props);
  const primaryIndustries = normaliseStringArray(record.primaryIndustries ?? record.primary_industries);
  const keyOfferings = normaliseKeyOfferings(record.keyOfferings ?? record.key_offerings);
  const sources = normaliseAgentSources(record.sources);

  if (!companyName && !fallback && valueProps.length === 0 && keyOfferings.length === 0 && primaryIndustries.length === 0) {
    return undefined;
  }

  const normalizedTagline = tagline && tagline.length > 0 ? tagline : null;

  return {
    companyName: (companyName ?? fallback) ?? null,
    tagline: normalizedTagline,
    valueProps,
    keyOfferings,
    primaryIndustries,
    sources,
  } satisfies CompanyIntelSnapshotStructuredProfileSummary;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function normaliseSnapshotSummaries(value: unknown): CompanyIntelSnapshotSummaries | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  const structuredProfile = normaliseStructuredProfileSummary(record.structuredProfile ?? record.structured_profile);
  const overview = typeof record.overview === 'string' ? record.overview : undefined;
  const pagesXml = typeof record.pagesXml === 'string'
    ? record.pagesXml
    : typeof record.pages_xml === 'string'
      ? record.pages_xml
      : undefined;

  const metadataRecord = record.metadata && typeof record.metadata === 'object'
    ? (record.metadata as Record<string, unknown>)
    : undefined;

  const metadata = metadataRecord
    ? {
        structuredProfile: normaliseAgentMetadata(metadataRecord.structuredProfile ?? metadataRecord.structured_profile),
        overview: normaliseAgentMetadata(metadataRecord.overview),
      }
    : undefined;

  if (!structuredProfile && !overview && !metadata && !pagesXml) {
    return null;
  }

  return {
    structuredProfile,
    overview: overview ?? null,
    metadata,
    pagesXml: pagesXml ?? null,
  } satisfies CompanyIntelSnapshotSummaries;
}

function toScrapeResponseResult(raw: unknown): CompanyIntelScrapeResponseResult | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const url = typeof record.url === 'string' ? record.url : '';
  if (url.length === 0) {
    return null;
  }

  const images = Array.isArray(record.images)
    ? (record.images.filter((value): value is string => typeof value === 'string') as string[])
    : undefined;

  const metadata =
    record.metadata && typeof record.metadata === 'object' && !Array.isArray(record.metadata)
      ? (record.metadata as Record<string, unknown>)
      : null;

  return {
    url,
    rawContent: typeof record.rawContent === 'string' ? record.rawContent : undefined,
    markdown: typeof record.markdown === 'string' ? record.markdown : undefined,
    text: typeof record.text === 'string' ? record.text : undefined,
    images,
    favicon: typeof record.favicon === 'string' ? record.favicon : null,
    title: typeof record.title === 'string' ? record.title : undefined,
    description: typeof record.description === 'string' ? record.description : undefined,
    metadata,
  } satisfies CompanyIntelScrapeResponseResult;
}

function toScrapeResponseFailure(raw: unknown): CompanyIntelScrapeResponseFailure | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const url = typeof record.url === 'string' ? record.url : '';
  if (url.length === 0) {
    return null;
  }

  return {
    url,
    error: typeof record.error === 'string' ? record.error : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
    reason: typeof record.reason === 'string' ? record.reason : undefined,
  } satisfies CompanyIntelScrapeResponseFailure;
}

function toScrapeResponse(raw: unknown): CompanyIntelScrapeResponse | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }

  const record = raw as Record<string, unknown>;
  const resultsValue = record.results;
  const failedValue = record.failedResults ?? record.failed_results;

  const results = Array.isArray(resultsValue)
    ? resultsValue
        .map(toScrapeResponseResult)
        .filter((item): item is CompanyIntelScrapeResponseResult => Boolean(item))
    : [];

  const failedResults = Array.isArray(failedValue)
    ? failedValue
        .map(toScrapeResponseFailure)
        .filter((item): item is CompanyIntelScrapeResponseFailure => Boolean(item))
    : [];

  if (results.length === 0 && failedResults.length === 0) {
    return undefined;
  }

  return {
    results,
    failedResults,
    requestId:
      typeof record.requestId === 'string'
        ? record.requestId
        : typeof record.request_id === 'string'
          ? record.request_id
          : null,
    responseTime:
      typeof record.responseTime === 'number'
        ? record.responseTime
        : typeof record.response_time === 'number'
          ? record.response_time
          : null,
  } satisfies CompanyIntelScrapeResponse;
}

function toScrapeRecords(raw: unknown): CompanyIntelScrapeRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const records: CompanyIntelScrapeRecord[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const record = item as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url : '';
    if (url.length === 0) {
      continue;
    }

    const success = record.success === true;
    const durationMsRaw = record.durationMs ?? record.duration_ms;
    const parsedDuration =
      typeof durationMsRaw === 'number'
        ? durationMsRaw
        : Number.isFinite(Number(durationMsRaw))
          ? Number(durationMsRaw)
          : 0;

    const errorRaw = record.error;
    const error =
      errorRaw && typeof errorRaw === 'object'
        ? {
            name:
              typeof (errorRaw as Record<string, unknown>).name === 'string'
                ? ((errorRaw as Record<string, unknown>).name as string)
                : 'Error',
            message:
              typeof (errorRaw as Record<string, unknown>).message === 'string'
                ? ((errorRaw as Record<string, unknown>).message as string)
                : 'Unknown error',
          }
        : undefined;

    const response = success ? toScrapeResponse(record.response ?? record.rawResponse) : undefined;

    records.push({
      url,
      success,
      durationMs: parsedDuration,
      response,
      error,
    });
  }

  return records;
}

export function toCompanyProfile(raw: unknown): CompanyProfile {
  const record = asRecord(raw);
  const createdAt = parseDate(record.createdAt as string | Date | null | undefined) ?? new Date();
  const updatedAt = parseDate(record.updatedAt as string | Date | null | undefined) ?? new Date();
  const lastRefreshedAt = parseDate(record.lastRefreshedAt as string | Date | null | undefined);
  const status = typeof record.status === 'string' ? (record.status as CompanyProfileStatus) : 'pending';

  return {
    id: Number(record.id),
    teamId: Number(record.teamId),
    domain: typeof record.domain === 'string' ? record.domain : null,
    status,
    companyName: typeof record.companyName === 'string' ? record.companyName : null,
    tagline: typeof record.tagline === 'string' ? record.tagline : null,
    overview: typeof record.overview === 'string' ? record.overview : null,
    valueProps: normaliseStringArray(record.valueProps),
    keyOfferings: normaliseKeyOfferings(record.keyOfferings),
    primaryIndustries: normaliseStringArray(record.primaryIndustries),
    faviconUrl: typeof record.faviconUrl === 'string' ? record.faviconUrl : null,
    lastSnapshotId: typeof record.lastSnapshotId === 'number' ? record.lastSnapshotId : null,
    lastRefreshedAt,
    lastError: typeof record.lastError === 'string' ? record.lastError : null,
    createdAt,
    updatedAt,
  };
}

function toCompanyProfileSnapshot(raw: unknown): CompanyProfileSnapshot {
  const record = asRecord(raw);
  const rawScrapesInput = (record.rawScrapes ?? record.raw_scrapes) as unknown;
  const createdAt = parseDate(record.createdAt as string | Date | null | undefined) ?? new Date();
  const completedAt = parseDate(record.completedAt as string | Date | null | undefined);
  const initiatedCandidate = record.initiatedByUserId ?? record.initiated_by_user_id;
  const status = typeof record.status === 'string' ? (record.status as CompanyProfileSnapshotStatus) : 'pending';

  return {
    id: Number(record.id),
    teamId: Number(record.teamId),
    domain: typeof record.domain === 'string' ? record.domain : null,
    status,
    selectedUrls: normaliseStringArray(record.selectedUrls),
    mapPayload: record.mapPayload ?? null,
    summaries: normaliseSnapshotSummaries(record.summaries ?? record.summary),
    rawScrapes: toScrapeRecords(rawScrapesInput),
    initiatedByUserId: typeof initiatedCandidate === 'number' ? initiatedCandidate : null,
    error: typeof record.error === 'string' ? record.error : null,
    createdAt,
    completedAt,
  };
}

export function toCompanyIntelData(payload: unknown): CompanyIntelData {
  const record = asRecord(payload);
  const profileRaw = record.profile ?? null;
  const snapshotsArray = Array.isArray(record.snapshots) ? (record.snapshots as unknown[]) : [];

  return {
    profile: profileRaw ? toCompanyProfile(profileRaw) : null,
    snapshots: snapshotsArray.map(toCompanyProfileSnapshot),
  };
}

function toSelections(raw: unknown): CompanyIntelSelection[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const selections: CompanyIntelSelection[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const record = item as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url : '';
    if (!url) {
      continue;
    }

    const matchedSignalsSource = Array.isArray(record.matchedSignals)
      ? record.matchedSignals
      : Array.isArray(record.matched_signals)
        ? record.matched_signals
        : [];

    const matchedSignals = matchedSignalsSource.filter(
      (value): value is string => typeof value === 'string',
    );

    selections.push({
      url,
      score: typeof record.score === 'number' ? record.score : 1,
      matchedSignals,
    });
  }

  return selections;
}

export function toTriggerResult(payload: unknown) {
  const record = asRecord(payload);
  const status = typeof record.status === 'string' ? (record.status as CompanyProfileSnapshotStatus) : 'pending';
  return {
    snapshotId: Number(record.snapshotId),
    teamId: Number(record.teamId),
    status,
    selections: toSelections(record.selections),
    totalLinksMapped: Number(record.totalLinksMapped ?? 0),
    successfulPages: Number(record.successfulPages ?? 0),
    failedPages: Number(record.failedPages ?? 0),
  };
}
