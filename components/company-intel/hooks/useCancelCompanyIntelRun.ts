"use client";

// ------------------------------------------------------------------------------------------------
//                useCancelCompanyIntelRun - Mutation hook to cancel active company intel runs
// ------------------------------------------------------------------------------------------------

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCompanyIntelClient } from '../context';
import { toHttpError } from '../utils/errors';

export const useCancelCompanyIntelRun = () => {
  const queryClient = useQueryClient();
  const { request } = useCompanyIntelClient();

  return useMutation<void, Error, number>({
    mutationFn: async (snapshotId: number) => {
      const response = await request(`/runs/${snapshotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw await toHttpError(response, 'Unable to cancel company intel run');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-intel'] });
    },
  });
};
