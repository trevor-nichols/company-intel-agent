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

export function normalizeManualUrl(candidate: string, previewBaseUrl: string): string {
  if (!candidate.trim()) {
    throw new ManualUrlValidationError('Enter a URL to add.');
  }

  let resolved: URL;
  let base: URL;
  try {
    base = new URL(previewBaseUrl);
    resolved = new URL(candidate, previewBaseUrl);
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
