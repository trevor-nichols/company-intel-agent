// ------------------------------------------------------------------------------------------------
//                vectorStorePublisher.ts - Publish snapshot knowledge into OpenAI vector stores
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';
import { toFile } from 'openai';

import type { OpenAIClientLike } from '../agents/shared/openai';
import { resolveOpenAIClient } from '../agents/shared/openai';
import type { CompanyIntelSnapshotVectorStoreFileCounts } from './persistence';
import type { CompanyIntelPageContent } from './run-collection/types';

export interface PublishVectorStoreParams {
  readonly snapshotId: number;
  readonly domain: string;
  readonly pages: readonly CompanyIntelPageContent[];
  readonly openAIClient: OpenAIClientLike;
  readonly logger?: typeof defaultLogger;
}

export interface PublishVectorStoreResult {
  readonly vectorStoreId: string;
  readonly fileCounts: CompanyIntelSnapshotVectorStoreFileCounts;
  readonly fileId: string;
}

const MAX_VECTOR_STORE_NAME = 60;

function slugifyDomain(domain: string): string {
  return domain
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function buildVectorStoreName(domain: string, snapshotId: number): string {
  const slug = slugifyDomain(domain) || 'company';
  const base = `ci-${slug}-${snapshotId}`;
  return base.length <= MAX_VECTOR_STORE_NAME ? base : base.slice(0, MAX_VECTOR_STORE_NAME);
}

async function createKnowledgeFile(params: {
  readonly domain: string;
  readonly snapshotId: number;
  readonly pages: readonly CompanyIntelPageContent[];
}): Promise<File> {
  const timestamp = new Date().toISOString();
  const sections = params.pages.map((page, index) => {
    const header = `## Page ${index + 1}: ${page.url}`;
    const title = page.title ? `Title: ${page.title}\n` : '';
    return `${header}\n${title}Content:\n${page.content.trim()}\n`;
  });

  const body = sections.join('\n\n---\n\n');
  const doc = `Company Domain: ${params.domain}\nSnapshot ID: ${params.snapshotId}\nIndexed At: ${timestamp}\n\n${body}`;
  return toFile(Buffer.from(doc, 'utf8'), `company-intel-${params.snapshotId}.txt`, {
    type: 'text/plain',
  });
}

export async function publishVectorStoreKnowledge(
  params: PublishVectorStoreParams,
): Promise<PublishVectorStoreResult> {
  if (params.pages.length === 0) {
    throw new Error('Unable to publish knowledge base without content.');
  }

  const log = params.logger ?? defaultLogger;
  const openAI = resolveOpenAIClient(params.openAIClient);
  const vectorStoreName = buildVectorStoreName(params.domain, params.snapshotId);

  log.info('vector-store:publish:start', {
    snapshotId: params.snapshotId,
    domain: params.domain,
    vectorStoreName,
    pageCount: params.pages.length,
  });

  const vectorStore = await openAI.vectorStores.create({
    name: vectorStoreName,
    metadata: {
      snapshot_id: String(params.snapshotId),
      domain: params.domain,
    },
  });

  const file = await createKnowledgeFile({
    domain: params.domain,
    snapshotId: params.snapshotId,
    pages: params.pages,
  });

  const uploaded = await openAI.files.create({
    file,
    purpose: 'assistants',
  });

  const batch = await openAI.vectorStores.fileBatches.create(vectorStore.id, {
    file_ids: [uploaded.id],
  });

  const polled = await openAI.vectorStores.fileBatches.poll(vectorStore.id, batch.id);
  const result: { readonly status: string; readonly fileCounts: CompanyIntelSnapshotVectorStoreFileCounts } = {
    status: polled.status,
    fileCounts: {
      inProgress: polled.file_counts?.in_progress ?? 0,
      completed: polled.file_counts?.completed ?? 0,
      failed: polled.file_counts?.failed ?? 0,
      cancelled: polled.file_counts?.cancelled ?? 0,
      total: polled.file_counts?.total ?? 0,
    },
  };

  if (result.status !== 'completed') {
    throw new Error(`Vector store ingestion failed with status ${result.status}`);
  }

  log.info('vector-store:publish:success', {
    snapshotId: params.snapshotId,
    vectorStoreId: vectorStore.id,
  });

  return {
    vectorStoreId: vectorStore.id,
    fileCounts: result.fileCounts,
    fileId: uploaded.id,
  } satisfies PublishVectorStoreResult;
}
