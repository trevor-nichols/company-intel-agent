"use client";

// ------------------------------------------------------------------------------------------------
//                useCompanyIntel - Fetch company intel profile + snapshots
// ------------------------------------------------------------------------------------------------

import { useQuery } from '@tanstack/react-query';
import type { CompanyIntelData } from '../types';
import { useCompanyIntelClient } from '../context';
import { toCompanyIntelData } from '../utils/serialization';
import { toHttpError } from '../utils/errors';

interface UseCompanyIntelOptions {
  readonly enabled?: boolean;
  readonly refetchIntervalMs?: number | false;
}

export const useCompanyIntel = (
  options: UseCompanyIntelOptions = {},
) => {
  const { enabled = true, refetchIntervalMs = false } = options;
  const { request } = useCompanyIntelClient();

  return useQuery<CompanyIntelData>({
    queryKey: ['company-intel'],
    enabled,
    refetchInterval: refetchIntervalMs,
    queryFn: async () => {
      const response = await request('');
      if (!response.ok) {
        throw await toHttpError(response, 'Unable to load company intel');
      }

      const result = await response.json();
      return toCompanyIntelData(result.data);
    },
  });
};
