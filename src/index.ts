// ------------------------------------------------------------------------------------------------
//                index.ts - Company intel feature package barrel - Dependencies: local submodules
// ------------------------------------------------------------------------------------------------

export * from './shared';
export * from './server';

export {
  CompanyIntelClientProvider,
  useCompanyIntelClient,
} from './client/company-intel/context';

export {
  useCompanyIntel,
  useCompanyIntelPreview,
  useCompanyIntelWorkflow,
  useTriggerCompanyIntel,
  useUpdateCompanyIntelProfile,
} from './client/company-intel/hooks';

export type { UseTriggerCompanyIntelOptions } from './client/company-intel/hooks/useTriggerCompanyIntel';

export {
  formatDate,
  formatDateTime,
  formatStatusLabel,
  getStatusVariant,
  deriveInitials,
} from './client/company-intel/utils/formatters';

export * from './client/components';

export type {
  CompanyIntelClientContextValue,
  CompanyIntelClientProviderProps,
} from './client/company-intel/context/CompanyIntelClientContext';

export type {
  CompanyProfile,
  CompanyProfileStatus,
  CompanyProfileSnapshot,
  CompanyProfileKeyOffering,
  CompanyIntelAgentSource,
  CompanyIntelSnapshotAgentMetadata,
  CompanyIntelSnapshotStructuredProfileSummary,
  CompanyIntelSnapshotSummaries,
  CompanyIntelStreamStructuredPayload,
  CompanyIntelData,
  CompanyIntelPreviewMap,
  CompanyIntelPreviewMapLink,
  CompanyIntelPreviewResult,
  CompanyIntelScrapeRecord,
  CompanyIntelScrapeResponse,
  CompanyIntelScrapeResponseResult,
  CompanyIntelScrapeResponseFailure,
  CompanyIntelScrapeError,
  CompanyIntelTriggerOptions,
  PreviewCompanyIntelInput,
  TriggerCompanyIntelInput,
  TriggerCompanyIntelResult,
  CompanyIntelRunStage,
  CompanyIntelStreamEvent,
} from './client/company-intel/types';

export type {
  CompanyIntelSelection as CompanyIntelClientSelection,
} from './client/company-intel/types';
