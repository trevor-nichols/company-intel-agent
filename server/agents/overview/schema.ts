// ------------------------------------------------------------------------------------------------
//                schema.ts - Zod schema for company overview agent structured output
// ------------------------------------------------------------------------------------------------

import { z } from 'zod';

export const CompanyOverviewSchema = z
  .object({
    overview: z.string().trim().min(60, 'overview must contain at least 60 characters.'),
  })
  .strict();

export type CompanyOverviewStructuredOutput = z.infer<typeof CompanyOverviewSchema>;
