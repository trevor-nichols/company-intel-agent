// ------------------------------------------------------------------------------------------------
//                favicon.ts - Favicon extraction helpers for Tavily scrape results
// ------------------------------------------------------------------------------------------------

import type { SiteIntelScrapeOutcome } from '../tavily/types';

function getPrimaryDocument(scrape: SiteIntelScrapeOutcome) {
  if (!scrape.success || !scrape.response) {
    return null;
  }

  const directMatch = scrape.response.results.find(result => result.url === scrape.url);
  return directMatch ?? scrape.response.results[0] ?? null;
}

export function extractFaviconUrl(scrapeResult: SiteIntelScrapeOutcome): string | null {
  const document = getPrimaryDocument(scrapeResult);
  if (!document) {
    return null;
  }

  if (document.favicon) {
    return document.favicon;
  }

  const metadata = document.metadata;
  if (metadata && typeof metadata === 'object') {
    const favicon = (metadata as Record<string, unknown>).favicon as string | undefined;
    if (typeof favicon === 'string' && favicon.length > 0) {
      return favicon;
    }

    const ogImage = (metadata as Record<string, unknown>)['og:image'] as string | undefined;
    if (typeof ogImage === 'string' && ogImage.length > 0) {
      return ogImage;
    }
  }

  return null;
}
