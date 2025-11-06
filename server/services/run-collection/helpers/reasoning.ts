// ------------------------------------------------------------------------------------------------
//                reasoning.ts - Helpers for reasoning summary/headline handling
// ------------------------------------------------------------------------------------------------

export function extractReasoningHeadline(summary: string | null): string | null {
  if (!summary) {
    return null;
  }

  const trimmed = summary.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const [firstLineRaw] = trimmed.split(/\n+/);
  const firstLine = firstLineRaw ?? trimmed;
  const boldMatch = firstLine.match(/^\*\*(?<headline>.+?)\*\*$/);
  if (boldMatch?.groups?.headline) {
    return boldMatch.groups.headline.trim();
  }

  return firstLine.replace(/^\*\*/g, '').replace(/\*\*$/g, '').trim();
}

export function normalizeReasoningSummary(summary: string | null, headline: string | null): string | null {
  if (!summary) {
    return null;
  }

  let trimmed = summary.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const effectiveHeadline = headline?.trim();
  if (effectiveHeadline) {
    const boldHeadline = `**${effectiveHeadline}**`;
    if (trimmed.startsWith(boldHeadline)) {
      trimmed = trimmed.slice(boldHeadline.length).trimStart();
    }
  }

  trimmed = trimmed.replace(/^\n+/g, '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function deriveReasoningHeadline(
  summary: string | null,
  candidate: string | null,
  current: string | null,
): string | null {
  if (!candidate) {
    return current ?? null;
  }

  const normalizedCandidate = candidate.trim();
  if (normalizedCandidate.length === 0) {
    return current ?? null;
  }

  if (!hasExplicitReasoningHeadline(summary)) {
    return current ?? null;
  }

  if (normalizedCandidate.length > 160) {
    return `${normalizedCandidate.slice(0, 157).trimEnd()}…`;
  }

  return normalizedCandidate;
}

function hasExplicitReasoningHeadline(summary: string | null): boolean {
  if (!summary) {
    return false;
  }

  const trimmed = summary.trimStart();
  if (!trimmed.startsWith('**')) {
    return false;
  }

  const closingIndex = trimmed.indexOf('**', 2);
  if (closingIndex <= 2) {
    return false;
  }

  const headlineLength = closingIndex - 2;
  return headlineLength > 0 && headlineLength <= 120;
}
