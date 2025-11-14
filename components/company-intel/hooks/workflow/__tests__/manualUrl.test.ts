"use client";

import { describe, expect, it } from 'vitest';

import { ManualUrlValidationError, normalizeManualUrl } from '../manualUrl';

describe('normalizeManualUrl', () => {
  it('resolves relative paths against the preview base URL', () => {
    const normalized = normalizeManualUrl('/about', 'https://example.com');
    expect(normalized).toBe('https://example.com/about');
  });

  it('allows subdomains that belong to the same root domain', () => {
    const normalized = normalizeManualUrl('blog.example.com/post', 'https://example.com');
    expect(normalized).toBe('https://blog.example.com/post');
  });

  it('strips query strings and fragments', () => {
    const normalized = normalizeManualUrl('https://example.com/pricing?plan=pro#details', 'https://example.com');
    expect(normalized).toBe('https://example.com/pricing');
  });

  it('rejects URLs outside the mapped domain', () => {
    expect(() => normalizeManualUrl('https://malicious.com', 'https://example.com')).toThrow(
      new ManualUrlValidationError('Custom URLs must belong to the same domain or subdomain.'),
    );
  });

  it('rejects malformed URLs', () => {
    expect(() => normalizeManualUrl('::::', 'https://example.com')).toThrow(
      new ManualUrlValidationError('Enter a valid URL from your site.'),
    );
  });
});
