import { configureCompanyIntelFeature } from '@company-intel/feature/config';
import { createLogger } from '@company-intel/logging';

configureCompanyIntelFeature({
  env: process.env,
  logger: createLogger({ service: 'company-intel-demo' }),
});
