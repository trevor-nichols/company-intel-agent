// ------------------------------------------------------------------------------------------------
//                snapshotPdf.ts - Generate printable PDF for company intel snapshots - Dependencies: @react-pdf/renderer
// ------------------------------------------------------------------------------------------------

import { renderToBuffer } from '@react-pdf/renderer';
import { logger as defaultLogger } from '../../config/logging';

import type {
  CompanyIntelPersistence,
  CompanyIntelProfileRecord,
  CompanyIntelSnapshotRecord,
} from './persistence';
import type { CompanyIntelSnapshotStructuredProfileSummary } from '../../shared/types';
import { normaliseSnapshotSummaries } from '../../shared/serialization';
import { CompanyIntelReportDocument } from '../reports/CompanyIntelReportDocument';

export interface GenerateSnapshotPdfParams {
  readonly snapshotId: number;
}

export interface GenerateSnapshotPdfDependencies {
  readonly persistence: CompanyIntelPersistence;
  readonly logger?: typeof defaultLogger;
}

export interface CompanyIntelSnapshotPdfResult {
  readonly filename: string;
  readonly contentType: 'application/pdf';
  readonly buffer: Buffer;
  readonly snapshotId: number;
  readonly generatedAtIso: string;
}

export class CompanyIntelSnapshotNotFoundError extends Error {
  constructor(message = 'Snapshot not found') {
    super(message);
    this.name = 'CompanyIntelSnapshotNotFoundError';
  }
}

export class CompanyIntelSnapshotNotReadyError extends Error {
  constructor(message = 'Snapshot is not ready for export') {
    super(message);
    this.name = 'CompanyIntelSnapshotNotReadyError';
  }
}

interface SnapshotSummaryData {
  readonly structuredProfile: CompanyIntelSnapshotStructuredProfileSummary | null;
  readonly overview: string | null;
}

function ensureSummary(snapshot: CompanyIntelSnapshotRecord): SnapshotSummaryData {
  const summaries = normaliseSnapshotSummaries(snapshot.summaries) ?? null;
  return {
    structuredProfile: summaries?.structuredProfile ?? null,
    overview: summaries?.overview ?? null,
  } satisfies SnapshotSummaryData;
}

function resolveCompanyName(
  structuredProfile: CompanyIntelSnapshotStructuredProfileSummary | null,
  profile: CompanyIntelProfileRecord | null,
  fallbackDomain: string,
): string {
  const name = structuredProfile?.companyName ?? profile?.companyName; 
  if (name && name.trim().length > 0) {
    return name.trim();
  }
  if (profile?.domain) {
    return profile.domain;
  }
  return fallbackDomain;
}

function resolveTagline(
  structuredProfile: CompanyIntelSnapshotStructuredProfileSummary | null,
  profile: CompanyIntelProfileRecord | null,
): string | null {
  const taglines: Array<string | null | undefined> = [
    structuredProfile?.tagline ?? null,
    profile?.tagline ?? null,
  ];

  for (const candidate of taglines) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function formatGeneratedTimestamp(date: Date): { readonly label: string; readonly iso: string } {
  const iso = date.toISOString();
  const formatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
  const label = `${formatter.format(date)} UTC`;
  return { label, iso };
}

function createFilename(domain: string, snapshotId: number, generatedDate: Date): string {
  const safeDomain = domain
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  const timestamp = generatedDate
    .toISOString()
    .replace(/[-:]/g, '')
    .replace('T', '-')
    .slice(0, 15);

  const domainSegment = safeDomain.length > 0 ? safeDomain : `snapshot-${snapshotId}`;
  return `company-intel-${domainSegment}-${timestamp}.pdf`;
}

export async function generateSnapshotPdf(
  params: GenerateSnapshotPdfParams,
  dependencies: GenerateSnapshotPdfDependencies,
): Promise<CompanyIntelSnapshotPdfResult> {
  const { persistence, logger = defaultLogger } = dependencies;

  const snapshot = await persistence.getSnapshotById(params.snapshotId);
  if (!snapshot) {
    logger.warn('company-intel:pdf:snapshot-missing', {
      snapshotId: params.snapshotId.toString(),
    });
    throw new CompanyIntelSnapshotNotFoundError();
  }

  if (snapshot.status !== 'complete') {
    logger.warn('company-intel:pdf:snapshot-not-ready', {
      snapshotId: params.snapshotId.toString(),
      status: snapshot.status,
    });
    throw new CompanyIntelSnapshotNotReadyError();
  }

  const profile = await persistence.getProfile();
  const domain = snapshot.domain ?? profile?.domain ?? `snapshot-${params.snapshotId}`;

  const generatedAt = snapshot.completedAt ?? snapshot.createdAt ?? new Date();
  const { structuredProfile, overview } = ensureSummary(snapshot);
  const { label: generatedAtLabel, iso: generatedAtIso } = formatGeneratedTimestamp(generatedAt);

  const companyName = resolveCompanyName(structuredProfile, profile, domain);
  const tagline = resolveTagline(structuredProfile, profile);

  const valueProps = structuredProfile?.valueProps ?? profile?.valueProps ?? [];
  const primaryIndustries = structuredProfile?.primaryIndustries ?? profile?.primaryIndustries ?? [];
  const keyOfferings = structuredProfile?.keyOfferings ?? profile?.keyOfferings ?? [];

  const stats = [
    {
      label: 'Value props',
      value: valueProps.length > 0 ? valueProps.length.toString() : '—',
    },
    {
      label: 'Industries',
      value: primaryIndustries.length > 0 ? primaryIndustries.length.toString() : '—',
    },
    {
      label: 'Key offerings',
      value: keyOfferings.length > 0 ? keyOfferings.length.toString() : '—',
    },
  ] as const;

  const report = (
    <CompanyIntelReportDocument
      companyName={companyName}
      domain={domain}
      generatedAtLabel={generatedAtLabel}
      tagline={tagline}
      overview={overview}
      stats={stats}
      valueProps={valueProps}
      keyOfferings={keyOfferings}
      primaryIndustries={primaryIndustries}
    />
  );

  const buffer = await renderToBuffer(report);

  const filename = createFilename(domain, params.snapshotId, generatedAt);

  logger.info('company-intel:pdf:generated', {
    snapshotId: params.snapshotId.toString(),
    filename,
  });

  return {
    filename,
    contentType: 'application/pdf',
    buffer,
    snapshotId: params.snapshotId,
    generatedAtIso,
  } satisfies CompanyIntelSnapshotPdfResult;
}
