"use client";

// ------------------------------------------------------------------------------------------------
//                useWorkflowProfileEditor - wraps profile mutation helpers
// ------------------------------------------------------------------------------------------------

import { useCallback, useState } from 'react';

import type { CompanyProfileKeyOffering } from '../../types';
import { useUpdateCompanyIntelProfile } from '../useUpdateCompanyIntelProfile';

export interface WorkflowProfileEditor {
  readonly saveOverview: (value: string | null) => Promise<void>;
  readonly savePrimaryIndustries: (values: readonly string[]) => Promise<void>;
  readonly saveValueProps: (values: readonly string[]) => Promise<void>;
  readonly saveKeyOfferings: (values: readonly CompanyProfileKeyOffering[]) => Promise<void>;
  readonly saveIdentity: (input: { companyName: string | null; tagline: string | null }) => Promise<void>;
  readonly isSavingOverview: boolean;
  readonly isSavingPrimaryIndustries: boolean;
  readonly isSavingValueProps: boolean;
  readonly isSavingKeyOfferings: boolean;
  readonly isSavingIdentity: boolean;
}

export function useWorkflowProfileEditor(): WorkflowProfileEditor {
  const updateProfileMutation = useUpdateCompanyIntelProfile();
  const [isSavingOverview, setIsSavingOverview] = useState(false);
  const [isSavingPrimaryIndustries, setIsSavingPrimaryIndustries] = useState(false);
  const [isSavingValueProps, setIsSavingValueProps] = useState(false);
  const [isSavingKeyOfferings, setIsSavingKeyOfferings] = useState(false);
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);

  const saveOverview = useCallback(
    async (value: string | null) => {
      setIsSavingOverview(true);
      try {
        await updateProfileMutation.mutateAsync({ overview: value });
      } finally {
        setIsSavingOverview(false);
      }
    },
    [updateProfileMutation],
  );

  const savePrimaryIndustries = useCallback(
    async (values: readonly string[]) => {
      setIsSavingPrimaryIndustries(true);
      try {
        await updateProfileMutation.mutateAsync({ primaryIndustries: values });
      } finally {
        setIsSavingPrimaryIndustries(false);
      }
    },
    [updateProfileMutation],
  );

  const saveValueProps = useCallback(
    async (values: readonly string[]) => {
      setIsSavingValueProps(true);
      try {
        await updateProfileMutation.mutateAsync({ valueProps: values });
      } finally {
        setIsSavingValueProps(false);
      }
    },
    [updateProfileMutation],
  );

  const saveKeyOfferings = useCallback(
    async (values: readonly CompanyProfileKeyOffering[]) => {
      setIsSavingKeyOfferings(true);
      try {
        await updateProfileMutation.mutateAsync({ keyOfferings: values });
      } finally {
        setIsSavingKeyOfferings(false);
      }
    },
    [updateProfileMutation],
  );

  const saveIdentity = useCallback(
    async ({ companyName, tagline }: { companyName: string | null; tagline: string | null }) => {
      setIsSavingIdentity(true);
      try {
        await updateProfileMutation.mutateAsync({ companyName, tagline });
      } finally {
        setIsSavingIdentity(false);
      }
    },
    [updateProfileMutation],
  );

  return {
    saveOverview,
    savePrimaryIndustries,
    saveValueProps,
    saveKeyOfferings,
    saveIdentity,
    isSavingOverview,
    isSavingPrimaryIndustries,
    isSavingValueProps,
    isSavingKeyOfferings,
    isSavingIdentity,
  };
}
