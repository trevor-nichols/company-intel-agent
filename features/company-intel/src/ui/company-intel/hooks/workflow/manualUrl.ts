"use client";

// ------------------------------------------------------------------------------------------------
//                manualUrl.ts - helpers for validating manual URL selections
// ------------------------------------------------------------------------------------------------

export class ManualUrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManualUrlValidationError';
  }
}

const ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;
const DOMAIN_LIKE_PATTERN = /^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i;

export function normalizeManualUrl(candidate: string, previewBaseUrl: string): string {
  const trimmedCandidate = candidate.trim();
  if (!trimmedCandidate) {
    throw new ManualUrlValidationError('Enter a URL to add.');
  }

  let resolved: URL;
  let base: URL;
  try {
    base = new URL(previewBaseUrl);
    const candidateForResolution = normalizeCandidateInput(trimmedCandidate);
    resolved = new URL(candidateForResolution, base);
  } catch {
    throw new ManualUrlValidationError('Enter a valid URL from your site.');
  }

  const baseHost = base.hostname.replace(/^www\./i, '').toLowerCase();
  const candidateHost = resolved.hostname.replace(/^www\./i, '').toLowerCase();
  const hostMatches = candidateHost === baseHost || candidateHost.endsWith(`.${baseHost}`);
  if (!hostMatches) {
    throw new ManualUrlValidationError('Custom URLs must belong to the same domain or subdomain.');
  }

  return resolved.toString().replace(/[#?].*$/, '');
}

function normalizeCandidateInput(candidate: string): string {
  if (ABSOLUTE_URL_PATTERN.test(candidate)) {
    return candidate;
  }

  if (candidate.startsWith('//')) {
    return `https:${candidate}`;
  }

  if (candidate.startsWith('/')) {
    return candidate;
  }

  if (DOMAIN_LIKE_PATTERN.test(candidate)) {
    return `https://${candidate}`;
  }

  throw new ManualUrlValidationError('Enter a valid URL from your site.');
}
