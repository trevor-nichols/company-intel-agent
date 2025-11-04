// ------------------------------------------------------------------------------------------------
//                schema.ts - Zod schema for structured company profile extraction
// ------------------------------------------------------------------------------------------------

import { z } from 'zod';

export const MAX_VALUE_PROPS = 10;
export const MAX_PRIMARY_INDUSTRIES = 6;

export const CompanyIntelStructuredOutputSchema = z
  .object({
    companyName: z.string().min(2, 'companyName must contain at least two characters.'),
    tagline: z.string().trim().max(280).nullable(),
    valueProps: z
      .array(z.string().trim().min(3))
      .max(MAX_VALUE_PROPS)
      .default([]),
    keyOfferings: z
      .array(
        z.object({
          title: z.string().trim().min(3),
          description: z.string().trim().min(5).nullable().default(null),
        }),
      )
      .default([]),
    primaryIndustries: z
      .array(z.string().trim().min(3))
      .max(MAX_PRIMARY_INDUSTRIES)
      .default([]),
    sources: z
      .array(
        z.object({
          page: z.string().trim().min(1),
          url: z.string().trim().min(6),
          rationale: z.string().trim().min(5).nullable().default(null),
        }),
      )
      .default([]),
  })
  .strict();

export type CompanyIntelStructuredOutput = z.infer<typeof CompanyIntelStructuredOutputSchema>;
