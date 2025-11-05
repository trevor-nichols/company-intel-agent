"use client";

// ------------------------------------------------------------------------------------------------
//                queryClient.tsx - Helpers for wiring Company Intel Query/Context providers
// ------------------------------------------------------------------------------------------------

import React, { useEffect, useState, type ReactNode, type ReactElement } from 'react';
import { QueryClient, QueryClientProvider, type DefaultOptions } from '@tanstack/react-query';

import type { CompanyIntelClientProviderProps } from '../context/CompanyIntelClientContext';
import { CompanyIntelClientProvider } from '../context/CompanyIntelClientContext';

const BASE_QUERY_DEFAULTS: DefaultOptions = {
  queries: {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  },
};

export function createCompanyIntelQueryClient(customDefaults?: DefaultOptions): QueryClient {
  if (!customDefaults) {
    return new QueryClient({ defaultOptions: BASE_QUERY_DEFAULTS });
  }

  const baseQueries = BASE_QUERY_DEFAULTS.queries ?? {};
  const customQueries = customDefaults.queries ?? {};

  return new QueryClient({
    defaultOptions: {
      ...BASE_QUERY_DEFAULTS,
      ...customDefaults,
      queries: {
        ...baseQueries,
        ...customQueries,
      },
    },
  });
}

export interface CompanyIntelProvidersProps
  extends Omit<CompanyIntelClientProviderProps, 'children'> {
  readonly children: ReactNode;
  readonly queryClient?: QueryClient;
  readonly resetOnUnmount?: boolean;
  readonly defaultQueryOptions?: DefaultOptions;
}

export function CompanyIntelProviders({
  children,
  queryClient: providedClient,
  resetOnUnmount = false,
  defaultQueryOptions,
  ...clientProps
}: CompanyIntelProvidersProps): ReactElement {
  const [queryClient] = useState<QueryClient>(() =>
    providedClient ?? createCompanyIntelQueryClient(defaultQueryOptions),
  );

  useEffect(() => {
    if (!resetOnUnmount) {
      return;
    }
    return () => {
      queryClient.clear();
    };
  }, [queryClient, resetOnUnmount]);

  return (
    <QueryClientProvider client={queryClient}>
      <CompanyIntelClientProvider {...clientProps}>{children}</CompanyIntelClientProvider>
    </QueryClientProvider>
  );
}
