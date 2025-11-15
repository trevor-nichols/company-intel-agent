// ------------------------------------------------------------------------------------------------
//                scraping.ts - Helpers for working with scrape outcomes
// ------------------------------------------------------------------------------------------------

import type { SiteIntelScrapeOutcome, SiteIntelScrapeExtractResult } from '../../../web-search';

export function getWordCount(markdown?: string | null): number | null {
  if (!markdown) return null;
  const words = markdown
    .replace(/[#$>*_`~-]+/g, ' ')
    .replace(/\[|\]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.length > 0 ? words.length : null;
}

export function getPrimaryDocument(scrape: SiteIntelScrapeOutcome): SiteIntelScrapeExtractResult | null {
  if (!scrape.success || !scrape.response) {
    return null;
  }

  const directMatch = scrape.response.results.find((result: SiteIntelScrapeExtractResult) => result.url === scrape.url);
  return directMatch ?? scrape.response.results[0] ?? null;
}
