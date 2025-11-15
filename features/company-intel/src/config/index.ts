export * from './env';
export * from './logging';

import type { EnvSource } from './env';
import { configureCompanyIntelEnv } from './env';
import type { Logger } from './logging';
import { configureCompanyIntelLogger } from './logging';

export interface ConfigureCompanyIntelFeatureOptions {
  readonly env?: EnvSource;
  readonly logger?: Logger;
}

export function configureCompanyIntelFeature(options: ConfigureCompanyIntelFeatureOptions): void {
  if (options.env) {
    configureCompanyIntelEnv(options.env);
  }
  if (options.logger) {
    configureCompanyIntelLogger(options.logger);
  }
}
