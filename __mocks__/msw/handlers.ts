// ------------------------------------------------------------------------------------------------
//                storybook/msw/handlers.ts - MSW handler registry for Storybook scenarios
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Global Handler Definitions
// ------------------------------------------------------------------------------------------------

import type { HttpHandler } from 'msw';

import { companyIntelHandlers, companyIntelEmptyHandlers, createCompanyIntelHandlers } from './companyIntelHandlers';

/**
 * Default handlers applied to every story unless overridden.
 * Start with an empty set; feature stories will compose domain-specific handlers.
 */
export const defaultHandlers: HttpHandler[] = [...companyIntelHandlers];

/**
 * Utility to merge per-story handlers with the defaults to avoid repetition.
 */
export const withHandlers = (...scopedHandlers: HttpHandler[]) => [...scopedHandlers, ...defaultHandlers];
export { companyIntelEmptyHandlers, createCompanyIntelHandlers };
