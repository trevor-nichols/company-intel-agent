// ------------------------------------------------------------------------------------------------
//                reasoning.ts - Helpers for reasoning summary/headline handling
// ------------------------------------------------------------------------------------------------

const HEADLINE_MAX_LENGTH = 160;

export function extractReasoningHeadlines(summary: string | null): readonly string[] {
  if (!summary) {
    return [];
  }

  const trimmed = summary.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const matches = Array.from(trimmed.matchAll(/\*\*(?<headline>[\s\S]+?)\*\*/g));
  const seen = new Set<string>();
  const headlines: string[] = [];

  for (const match of matches) {
    const candidate = match.groups?.headline?.trim();
    if (!candidate) {
      continue;
    }

    const normalized = normalizeHeadline(candidate);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    headlines.push(normalized);
  }

  if (headlines.length === 0) {
    const [firstLineRaw] = trimmed.split(/\n+/);
    const fallback = normalizeHeadline(firstLineRaw ?? trimmed);
    if (fallback) {
      headlines.push(fallback);
    }
  }

  return headlines;
}

export function normalizeReasoningSummary(
  summary: string | null,
  headlines: readonly string[],
): string | null {
  if (!summary) {
    return null;
  }

  let trimmed = summary.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (headlines.length > 0) {
    for (const rawHeadline of headlines) {
      const effectiveHeadline = rawHeadline?.trim();
      if (!effectiveHeadline) {
        continue;
      }

      const boldHeadline = `**${effectiveHeadline}**`;
      if (!trimmed.includes(boldHeadline)) {
        continue;
      }

      trimmed = trimmed.replace(boldHeadline, '').trim();
    }
  }

  trimmed = trimmed.replace(/^\n+/g, '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeHeadline(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length > HEADLINE_MAX_LENGTH) {
    return `${trimmed.slice(0, HEADLINE_MAX_LENGTH - 3).trimEnd()}…`;
  }

  return trimmed;
}
