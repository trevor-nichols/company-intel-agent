"use client";

// ------------------------------------------------------------------------------------------------
//                useCompanyIntelPreview - Preview mapped URLs before scraping
// ------------------------------------------------------------------------------------------------

import { useMutation } from '@tanstack/react-query';

import type {
  CompanyIntelPreviewResult,
  PreviewCompanyIntelInput,
} from '../types';
import { useCompanyIntelClient } from '../context';
import { toHttpError } from '../utils/errors';

export const useCompanyIntelPreview = () => {
  const { request } = useCompanyIntelClient();

  return useMutation<CompanyIntelPreviewResult, Error, PreviewCompanyIntelInput>({
    mutationFn: async ({ domain, options }) => {
      const response = await request('/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain, options }),
      });

      if (!response.ok) {
        throw await toHttpError(response, 'Unable to preview company intel');
      }

      const result = await response.json();
      return result.data as CompanyIntelPreviewResult;
    },
  });
};
