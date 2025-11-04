// ------------------------------------------------------------------------------------------------
//                response.ts - Helpers for working with OpenAI Responses API payloads
// ------------------------------------------------------------------------------------------------

export function extractResponseText(response: unknown): string | null {
  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return null;
  }

  const fragments: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const content = (item as { content?: unknown }).content;
    if (typeof content === 'string') {
      fragments.push(content);
      continue;
    }

    if (Array.isArray(content)) {
      for (const subItem of content) {
        if (!subItem || typeof subItem !== 'object') {
          continue;
        }
        const text = (subItem as { text?: unknown }).text;
        if (typeof text === 'string' && text.trim().length > 0) {
          fragments.push(text);
        }
      }
    }
  }

  if (fragments.length === 0) {
    return null;
  }

  return fragments.join('\n');
}

export function extractUsageMetadata(response: unknown): Record<string, unknown> | undefined {
  const usageCandidate = (response as { usage?: unknown }).usage;
  return usageCandidate && typeof usageCandidate === 'object'
    ? (usageCandidate as Record<string, unknown>)
    : undefined;
}

export function extractReasoningSummary(response: unknown): string | null {
  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const type = (item as { type?: unknown }).type;
    if (type !== 'reasoning') {
      continue;
    }

    const summaryParts = (item as { summary?: unknown }).summary;
    if (!Array.isArray(summaryParts) || summaryParts.length === 0) {
      continue;
    }

    for (const part of summaryParts) {
      if (!part || typeof part !== 'object') {
        continue;
      }
      const text = (part as { text?: unknown }).text;
      if (typeof text === 'string' && text.trim().length > 0) {
        return text;
      }
    }
  }

  return null;
}
