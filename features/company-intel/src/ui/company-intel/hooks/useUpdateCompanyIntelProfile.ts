"use client";

// ------------------------------------------------------------------------------------------------
//                useUpdateCompanyIntelProfile - Mutation helper for profile field updates
// ------------------------------------------------------------------------------------------------

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  CompanyIntelData,
  CompanyProfile,
  CompanyProfileKeyOffering,
} from '../types';
import { useCompanyIntelClient } from '../context';
import { toCompanyProfile } from '../utils/serialization';
import { toHttpError } from '../utils/errors';

interface UpdateCompanyIntelProfileInput {
  readonly overview?: string | null;
  readonly primaryIndustries?: readonly string[];
  readonly valueProps?: readonly string[];
  readonly keyOfferings?: readonly CompanyProfileKeyOffering[];
  readonly companyName?: string | null;
  readonly tagline?: string | null;
}

interface MutationContext {
  readonly previousData?: CompanyIntelData;
}

function sanitisePayload(input: UpdateCompanyIntelProfileInput) {
  const payload: Record<string, unknown> = {};

  if ('overview' in input) {
    const value = input.overview;
    payload.overview = typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  if ('companyName' in input) {
    const value = input.companyName;
    if (value === null) {
      payload.companyName = null;
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      payload.companyName = trimmed.length > 0 ? trimmed : null;
    }
  }

  if ('tagline' in input) {
    const value = input.tagline;
    if (value === null) {
      payload.tagline = null;
    } else if (typeof value === 'string') {
      const trimmed = value.trim();
      payload.tagline = trimmed.length > 0 ? trimmed : null;
    }
  }

  if ('primaryIndustries' in input) {
    const values = Array.from(new Set((input.primaryIndustries ?? []).map(item => item.trim()).filter(Boolean)));
    payload.primaryIndustries = values;
  }

  if ('valueProps' in input) {
    const values = (input.valueProps ?? []).map(item => item.trim()).filter(Boolean);
    payload.valueProps = values;
  }

  if ('keyOfferings' in input) {
    const values = (input.keyOfferings ?? [])
      .map(offering => ({
        title: offering.title.trim(),
        description: offering.description?.trim(),
      }))
      .filter(offering => offering.title.length > 0)
      .map(offering => ({
        title: offering.title,
        ...(offering.description && offering.description.length > 0 ? { description: offering.description } : {}),
      }));
    payload.keyOfferings = values;
  }

  return payload;
}

export function useUpdateCompanyIntelProfile() {
  const queryClient = useQueryClient();
  const { request } = useCompanyIntelClient();

  return useMutation<CompanyProfile, Error, UpdateCompanyIntelProfileInput, MutationContext>({
    mutationFn: async input => {
      const payload = sanitisePayload(input);
      if (Object.keys(payload).length === 0) {
        throw new Error('No changes detected.');
      }

      const response = await request('', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw await toHttpError(response, 'Failed to update profile');
      }

      const result = await response.json();
      const profilePayload = result?.data?.profile ?? result?.profile ?? result?.data ?? result;
      return toCompanyProfile(profilePayload);
    },
    onMutate: async input => {
      const queryKey = ['company-intel'];
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<CompanyIntelData>(queryKey);

      if (previousData?.profile) {
        const now = new Date();
        const payload = sanitisePayload(input);
        const nextProfile: CompanyProfile = {
          ...previousData.profile,
          ...(payload.overview !== undefined ? { overview: payload.overview as string | null } : {}),
          ...(payload.companyName !== undefined ? { companyName: payload.companyName as string | null } : {}),
          ...(payload.tagline !== undefined ? { tagline: payload.tagline as string | null } : {}),
          ...(payload.primaryIndustries !== undefined
            ? { primaryIndustries: payload.primaryIndustries as string[] }
            : {}),
          ...(payload.valueProps !== undefined ? { valueProps: payload.valueProps as string[] } : {}),
          ...(payload.keyOfferings !== undefined
            ? { keyOfferings: payload.keyOfferings as CompanyProfileKeyOffering[] }
            : {}),
          updatedAt: now,
        };

        queryClient.setQueryData<CompanyIntelData>(queryKey, {
          ...previousData,
          profile: nextProfile,
        });
      }

      return { previousData };
    },
    onError: (_error, _input, context) => {
      if (!context?.previousData) {
        return;
      }

      queryClient.setQueryData(['company-intel'], context.previousData);
    },
    onSuccess: (profile) => {
      const queryKey = ['company-intel'];
      queryClient.setQueryData<CompanyIntelData | undefined>(queryKey, current =>
        current
          ? {
              ...current,
              profile,
            }
          : current,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['company-intel'] });
    },
  });
}
