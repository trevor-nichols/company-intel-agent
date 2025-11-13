// ------------------------------------------------------------------------------------------------
//                citations.ts - Convert model responses into UI-friendly citations
// ------------------------------------------------------------------------------------------------

import type {
  CompanyIntelChatCitation,
  CompanyIntelChatCitationChunk,
} from '@/shared/company-intel/chat';

export function extractChatCitations(response: unknown): readonly CompanyIntelChatCitation[] | undefined {
  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return undefined;
  }

  const citations: CompanyIntelChatCitation[] = [];

  for (const item of output) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    const type = typeof record.type === 'string' ? record.type : undefined;

    const isToolUseFileSearch = type === 'tool_use' && record.tool_name === 'file_search';

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

function getAnnotationCitations(record: Record<string, unknown>): CompanyIntelChatCitation[] {
  const contentBlocks = Array.isArray(record.content)
    ? record.content
    : [];

  const annotations: CompanyIntelChatCitation[] = [];

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

function toCitationFromResult(result: unknown): CompanyIntelChatCitation | null {
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
  };
}

function normalizeCitationChunks(value: unknown): CompanyIntelChatCitation['chunks'] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const chunks: CompanyIntelChatCitationChunk[] = [];
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

function toCitationFromAnnotation(annotation: unknown): CompanyIntelChatCitation | null {
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
  const index = typeof record.index === 'number'
    ? record.index
    : typeof record.start_index === 'number'
      ? record.start_index
      : undefined;

  return {
    fileId,
    filename,
    ...(quote ? { quote, chunks: [{ text: quote }] } : {}),
    ...(typeof index === 'number' ? { index } : {}),
  };
}
