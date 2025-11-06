// ------------------------------------------------------------------------------------------------
//                preview.ts - Site intel preview helper
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';

import { previewSiteIntel, type CollectSiteIntelOptions, type SiteIntelResult } from '../../web-search';
import type { RunCompanyIntelCollectionDependencies } from './types';

export async function previewCompanyIntel(
  domain: string,
  options: CollectSiteIntelOptions = {},
  dependencies: Pick<RunCompanyIntelCollectionDependencies, 'tavily' | 'logger'>,
): Promise<SiteIntelResult> {
  const log = dependencies.logger ?? defaultLogger;

  const result = await previewSiteIntel(
    domain,
    {
      ...options,
    },
    {
      tavily: dependencies.tavily,
      logger: log,
    },
  );

  log.info('site-intel:preview:success', {
    domain: result.domain,
    selections: result.selections.length,
  });

  return result;
}
