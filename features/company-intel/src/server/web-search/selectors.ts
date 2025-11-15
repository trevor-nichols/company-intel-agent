// ------------------------------------------------------------------------------------------------
//                selectors.ts - URL ranking heuristics for company intel - Dependencies: Tavily-derived types
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                URL Ranking Logic
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '../../config/logging';

import type { SiteIntelMapLink } from './types';

import type { SiteIntelSelection } from './types';

interface RankingSignal {
  readonly label: string;
  readonly weight: number;
  readonly match: (path: string, url: URL) => boolean;
}

const RANKING_SIGNALS: readonly RankingSignal[] = [
  {
    label: 'homepage',
    weight: 120,
    match: path => path === '/',
  },
  {
    label: 'about',
    weight: 90,
    match: path => /(about|who-we-are|our-story|company|team)(\/|$)/i.test(path),
  },
  {
    label: 'services',
    weight: 80,
    match: path => /(services|solutions|offerings|capabilities)(\/|$)/i.test(path),
  },
  {
    label: 'consulting',
    weight: 70,
    match: path => /(consulting|engagements|implementation|integration)(\/|$)/i.test(path),
  },
  {
    label: 'pricing',
    weight: 65,
    match: path => /(pricing|plans|rates)(\/|$)/i.test(path),
  },
  {
    label: 'contact',
    weight: 60,
    match: path => /(contact|schedule|book|demo|talk)(\/|$)/i.test(path),
  },
  {
    label: 'blog',
    weight: 40,
    match: path => /(blog|insights|resources|articles|news)(\/|$)/i.test(path),
  },
  {
    label: 'case-study',
    weight: 40,
    match: path => /(case-stud|success|portfolio)(\/|$)/i.test(path),
  },
  {
    label: 'careers',
    weight: 25,
    match: path => /(careers|jobs|hiring)(\/|$)/i.test(path),
  },
];

const MAX_SIGNAL_SCORE = RANKING_SIGNALS.reduce((sum, signal) => sum + signal.weight, 0);

const SCORE_FOR_HOST_MATCH = 150;
const SCORE_FOR_SHORT_PATH = 45;
const SCORE_FOR_MEDIUM_PATH = 20;
const SCORE_FOR_PATH_SEGMENTS = 12;

const EXCLUDED_PATH_PATTERNS: readonly RegExp[] = [
  /(login|log-in|signin|sign-in|signup|sign-up|signout|sign-out|account|auth)(\/|$)/i,
  /(admin|wp-admin|dashboard)(\/|$)/i,
  /(privacy|privacy-policy|policies|gdpr|compliance)(\/|$)/i,
  /(terms|terms-of-service|termsandconditions|legal|conditions|eula)(\/|$)/i,
  /(cookie|cookies|tracking-preferences)(\/|$)/i,
];

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./i, '').toLowerCase();
}

function normalizePath(path: string): string {
  if (path === '/') {
    return path;
  }
  const trimmed = path.replace(/\/+$/, '');
  return trimmed.length === 0 ? '/' : trimmed;
}

function ensureUrl(candidate: string, fallbackOrigin: string): URL | null {
  try {
    if (/^https?:\/\//i.test(candidate)) {
      return new URL(candidate);
    }
    return new URL(candidate, fallbackOrigin);
  } catch (error) {
    defaultLogger.debug?.('tavily:selectors:invalid-url', { candidate, error });
    return null;
  }
}

export function rankMapLinks(
  domain: string,
  links: readonly SiteIntelMapLink[],
  maxResults: number,
  includeSubdomains: boolean,
): SiteIntelSelection[] {
  const fallbackOrigin = domain.startsWith('http') ? domain : `https://${domain}`;
  const baseUrl = ensureUrl(fallbackOrigin, 'https://fallback.invalid');

  if (!baseUrl) {
    throw new Error(`Unable to resolve base domain ${domain}`);
  }

  const baseHost = normalizeHost(baseUrl.hostname);
  const seen = new Map<string, SiteIntelSelection>();

  const candidates: SiteIntelSelection[] = [];

  for (const link of links) {
    const resolved = ensureUrl(link.url, baseUrl.origin);
    if (!resolved) {
      continue;
    }

    const candidateHost = normalizeHost(resolved.hostname);
    const hostMatches =
      candidateHost === baseHost || (includeSubdomains && candidateHost.endsWith(`.${baseHost}`));
    if (!hostMatches) {
      continue;
    }
    const path = normalizePath(resolved.pathname);

    if (EXCLUDED_PATH_PATTERNS.some(pattern => pattern.test(path))) {
      continue;
    }
    const key = `${normalizeHost(resolved.hostname)}${path}`;

    if (seen.has(key)) {
      continue;
    }

    let score = 0;
    const matchedSignals: string[] = [];

    if (hostMatches) {
      score += SCORE_FOR_HOST_MATCH;
      matchedSignals.push('same-host');
    }

    for (const signal of RANKING_SIGNALS) {
      if (signal.match(path, resolved)) {
        score += signal.weight;
        matchedSignals.push(signal.label);
      }
    }

    const depth = path === '/' ? 0 : path.split('/').filter(Boolean).length;
    if (depth === 0) {
      score += SCORE_FOR_SHORT_PATH;
      matchedSignals.push('path-depth:0');
    } else if (depth === 1) {
      score += SCORE_FOR_MEDIUM_PATH;
      matchedSignals.push('path-depth:1');
    } else {
      const pathScore = Math.max(SCORE_FOR_PATH_SEGMENTS - depth * 4, 0);
      if (pathScore > 0) {
        score += pathScore;
        matchedSignals.push(`path-depth:${depth}`);
      }
    }

    const linkHasMetadata = Boolean(link.title || link.description);
    if (linkHasMetadata) {
      score += 15;
      matchedSignals.push('metadata');
    }

    const normalizedScore = score / (MAX_SIGNAL_SCORE + SCORE_FOR_HOST_MATCH + SCORE_FOR_SHORT_PATH);
    const selection: SiteIntelSelection = {
      url: resolved.toString(),
      score: Number(normalizedScore.toFixed(4)),
      matchedSignals,
    };

    seen.set(key, selection);
    candidates.push(selection);
  }

  if (!seen.has(`${baseHost}/`)) {
    const homepageSelection: SiteIntelSelection = {
      url: baseUrl.origin,
      score: 1,
      matchedSignals: ['forced-homepage'],
    };
    candidates.push(homepageSelection);
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, maxResults));
}
