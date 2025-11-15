// ------------------------------------------------------------------------------------------------
//                errors.ts - Error types for the run-collection pipeline
// ------------------------------------------------------------------------------------------------

export class CompanyIntelRunCancelledError extends Error {
  constructor(message = 'Company intel run cancelled') {
    super(message);
    this.name = 'CompanyIntelRunCancelledError';
  }
}
