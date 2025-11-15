// ------------------------------------------------------------------------------------------------
//                schemas.ts - Zod schemas for validating Company Intel API payloads
// ------------------------------------------------------------------------------------------------

import { z } from 'zod';

const CompanyIntelOptionsSchema = z
  .object({
    maxPages: z.number().int().min(1).max(25).optional(),
    includeSubdomains: z.boolean().optional(),
    ignoreQueryParameters: z.boolean().optional(),
  })
  .strict();

export const PreviewCompanyIntelSchema = z
  .object({
    domain: z.string().min(1).max(512),
    options: CompanyIntelOptionsSchema.optional(),
  })
  .strict();

export const TriggerCompanyIntelSchema = PreviewCompanyIntelSchema.extend({
  selectedUrls: z.array(z.string().min(1).max(2048)).max(50).optional(),
});

export const UpdateCompanyIntelProfileSchema = z
  .object({
    companyName: z.union([z.string().max(200), z.null()]).optional(),
    tagline: z.union([z.string().max(280), z.null()]).optional(),
    overview: z.union([z.string().max(6000), z.null()]).optional(),
    primaryIndustries: z.array(z.string().max(160)).max(12).optional(),
    valueProps: z.array(z.string().max(240)).max(12).optional(),
    keyOfferings: z
      .array(
        z
          .object({
            title: z.string().max(160),
            description: z.string().max(600).optional(),
          })
          .strict(),
      )
      .max(12)
      .optional(),
  })
  .strict();
