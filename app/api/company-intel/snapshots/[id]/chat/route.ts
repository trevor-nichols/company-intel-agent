import { NextRequest } from 'next/server';
import type { ResponseCreateParams } from 'openai/resources/responses/responses';

import { errorResponse, jsonResponse } from '@/server/handlers';
import { getCompanyIntelEnvironment } from '@/server/bootstrap';
import { extractResponseText } from '@/server/agents/shared/response';
import { resolveOpenAIClient } from '@/server/agents/shared/openai';

interface ChatMessageInput {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
}

interface ChatResponsePayload {
  readonly message: string | null;
  readonly responseId: string;
  readonly usage?: Record<string, unknown> | null;
  readonly citations?: readonly ChatCitation[];
}

interface ChatCitation {
  readonly fileId: string;
  readonly filename?: string;
  readonly score?: number;
  readonly chunks?: readonly { readonly text: string }[];
}

const MAX_MESSAGES = 20;
const DEFAULT_VECTOR_RESULTS = 6;

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const snapshotId = Number.parseInt(context.params.id, 10);
  if (!Number.isFinite(snapshotId)) {
    return errorResponse('Invalid snapshot id', 400);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return errorResponse('Invalid JSON payload', 400);
  }

  const messages = Array.isArray((body as { messages?: unknown }).messages)
    ? ((body as { messages: ChatMessageInput[] }).messages)
    : null;

  if (!messages || messages.length === 0) {
    return errorResponse('messages array is required', 400);
  }

  if (messages.length > MAX_MESSAGES) {
    return errorResponse(`messages cannot exceed ${MAX_MESSAGES} entries`, 400);
  }

  const normalizedMessages: ChatMessageInput[] = [];
  for (const entry of messages) {
    if (!entry || typeof entry !== 'object') {
      return errorResponse('Each message must be an object', 400);
    }
    const role = entry.role;
    const content = typeof entry.content === 'string' ? entry.content.trim() : '';
    if ((role !== 'user' && role !== 'assistant' && role !== 'system') || content.length === 0) {
      return errorResponse('Each message must include a role and non-empty content', 400);
    }
    normalizedMessages.push({ role, content });
  }

  try {
    const { persistence, openAI, chatModel } = getCompanyIntelEnvironment();
    const openAIClient = resolveOpenAIClient(openAI);
    const snapshot = await persistence.getSnapshotById(snapshotId);
    if (!snapshot) {
      return errorResponse('Snapshot not found', 404);
    }

    if (!snapshot.vectorStoreId || snapshot.vectorStoreStatus !== 'ready') {
      return errorResponse('Snapshot knowledge base is not ready yet', 409);
    }

    const systemPrompt = buildSystemPrompt(snapshot.domain ?? undefined);
    const input = [
      { role: 'system', content: systemPrompt },
      ...normalizedMessages,
    ];

    const response = await openAIClient.responses.create({
      model: chatModel,
      input: input as ResponseCreateParams['input'],
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [snapshot.vectorStoreId],
          max_num_results: DEFAULT_VECTOR_RESULTS,
        },
      ],
      include: ['file_search_call.results'],
      metadata: {
        snapshot_id: String(snapshotId),
      },
    });

    const text = extractResponseText(response);
    const citations = extractCitations(response);

    const payload: ChatResponsePayload = {
      message: text,
      responseId: response.id,
      usage: response.usage ? (response.usage as unknown as Record<string, unknown>) : null,
      citations,
    } satisfies ChatResponsePayload;

    return jsonResponse({ data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to complete chat request';
    return errorResponse(message, 500);
  }
}

function buildSystemPrompt(domain?: string): string {
  const target = domain ? `for ${domain}` : '';
  return `You are a company analyst answering questions ${target}. Use only the retrieved files as sources. If the answer is not in the files, say you do not have that information. Provide concise, factual responses.`;
}

function extractCitations(response: unknown): readonly ChatCitation[] | undefined {
  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return undefined;
  }

  const citations: ChatCitation[] = [];

  for (const item of output) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    const type = typeof record.type === 'string' ? record.type : undefined;

    const isToolUseFileSearch = type === 'tool_use' && (record.tool_name === 'file_search');

    if (type === 'file_search_call' || isToolUseFileSearch) {
      const fileSearchResults = getFileSearchResults(record);
      for (const result of fileSearchResults) {
        const citation = toCitationFromResult(result);
        if (citation) {
          citations.push(citation);
        }
      }
      continue;
    }

    if (type === 'message') {
      const annotationCitations = getAnnotationCitations(record);
      citations.push(...annotationCitations);
    }
  }

  return citations.length > 0 ? citations : undefined;
}

function getFileSearchResults(record: Record<string, unknown>): unknown[] {
  if (record.type === 'tool_use' && record.tool_name === 'file_search') {
    const toolOutput = (record.output as { results?: unknown } | undefined)?.results;
    return Array.isArray(toolOutput) ? toolOutput : [];
  }

  const results = record.results ?? record.search_results;
  return Array.isArray(results) ? results : [];
}

function getAnnotationCitations(record: Record<string, unknown>): ChatCitation[] {
  const contentBlocks = Array.isArray(record.content)
    ? record.content
    : [];

  const annotations: ChatCitation[] = [];

  for (const block of contentBlocks) {
    if (!block || typeof block !== 'object') {
      continue;
    }
    const rawAnnotations = (block as { annotations?: unknown[] }).annotations;
    const entries: unknown[] = Array.isArray(rawAnnotations) ? rawAnnotations : [];

    for (const annotation of entries) {
      const citation = toCitationFromAnnotation(annotation);
      if (citation) {
        annotations.push(citation);
      }
    }
  }

  return annotations;
}

function toCitationFromResult(result: unknown): ChatCitation | null {
  if (!result || typeof result !== 'object') {
    return null;
  }
  const record = result as Record<string, unknown>;
  const fileId = typeof record.file_id === 'string' ? record.file_id : undefined;
  if (!fileId) {
    return null;
  }

  const filename = typeof record.filename === 'string' ? record.filename : undefined;
  const score = typeof record.score === 'number' ? record.score : undefined;
  const chunksSource = Array.isArray(record.content)
    ? record.content
    : Array.isArray((record.output as { content?: unknown[] } | undefined)?.content)
      ? (record.output as { content?: unknown[] }).content
      : undefined;

  const chunks = normalizeCitationChunks(chunksSource);

  return {
    fileId,
    filename,
    score,
    ...(chunks ? { chunks } : {}),
  } satisfies ChatCitation;
}

function normalizeCitationChunks(value: unknown): ChatCitation['chunks'] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const chunks: { readonly text: string }[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const text = (entry as { text?: unknown }).text;
    if (typeof text === 'string' && text.trim().length > 0) {
      chunks.push({ text });
    }
  }

  return chunks.length > 0 ? chunks : undefined;
}

function toCitationFromAnnotation(annotation: unknown): ChatCitation | null {
  if (!annotation || typeof annotation !== 'object') {
    return null;
  }

  const record = annotation as Record<string, unknown>;
  if (record.type !== 'file_citation') {
    return null;
  }

  const fileId = typeof record.file_id === 'string' ? record.file_id : undefined;
  if (!fileId) {
    return null;
  }

  const filename = typeof record.filename === 'string' ? record.filename : undefined;
  const quote = typeof record.quote === 'string'
    ? record.quote
    : typeof record.quoted_text === 'string'
      ? record.quoted_text
      : undefined;

  return {
    fileId,
    filename,
    ...(quote ? { chunks: [{ text: quote }] } : {}),
  } satisfies ChatCitation;
}
