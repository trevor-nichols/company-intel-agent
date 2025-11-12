// ------------------------------------------------------------------------------------------------
//                preview.ts - Site intel preview helper
// ------------------------------------------------------------------------------------------------

import { logger as defaultLogger } from '@agenai/logging';

import { previewSiteIntel, type CollectSiteIntelOptions, type SiteIntelResult } from '../../web-search';
import type { RunCompanyIntelCollectionDependencies } from './types';

export async function previewCompanyIntel(
  domain: string,
  options: CollectSiteIntelOptions = {},
  dependencies: Pick<RunCompanyIntelCollectionDependencies, 'tavily' | 'logger' | 'defaultExtractDepth'>,
): Promise<SiteIntelResult> {
  const log = dependencies.logger ?? defaultLogger;

  const resolvedExtractDepth = options.extractDepth ?? dependencies.defaultExtractDepth;
  const effectiveOptions: CollectSiteIntelOptions = {
    ...options,
    ...(resolvedExtractDepth ? { extractDepth: resolvedExtractDepth } : {}),
  };

  const result = await previewSiteIntel(
    domain,
    effectiveOptions,
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
