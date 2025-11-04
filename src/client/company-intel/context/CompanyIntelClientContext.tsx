// ------------------------------------------------------------------------------------------------
//                CompanyIntelClientContext.tsx - Client dependency injection boundary
// ------------------------------------------------------------------------------------------------

import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface CompanyIntelClientContextValue {
  readonly teamId: number | null;
  readonly apiBasePath: string;
  request(path: string, init?: RequestInit): Promise<Response>;
}

const CompanyIntelClientContext = createContext<CompanyIntelClientContextValue | null>(null);

export type CompanyIntelFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface CompanyIntelClientProviderProps {
  readonly teamId: number | null;
  readonly children: ReactNode;
  readonly apiBasePath?: string;
  readonly fetcher?: CompanyIntelFetch;
}

function normaliseBasePath(basePath: string): string {
  if (basePath.length === 0) return '';
  return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
}

export function CompanyIntelClientProvider({
  teamId,
  apiBasePath = '/api/protected/onboarding/company-intel',
  fetcher = fetch,
  children,
}: CompanyIntelClientProviderProps) {
  const normalisedBasePath = useMemo(() => normaliseBasePath(apiBasePath), [apiBasePath]);

  const contextValue = useMemo<CompanyIntelClientContextValue>(() => {
    const request = async (path: string, init?: RequestInit) => {
      const resolvedPath =
        path.length === 0 || path.startsWith('/') ? path : `/${path}`;
      const url = `${normalisedBasePath}${resolvedPath}`;
      return fetcher(url, init);
    };

    return {
      teamId,
      apiBasePath: normalisedBasePath,
      request,
    };
  }, [teamId, normalisedBasePath, fetcher]);

  return (
    <CompanyIntelClientContext.Provider value={contextValue}>
      {children}
    </CompanyIntelClientContext.Provider>
  );
}

export function useCompanyIntelClient(): CompanyIntelClientContextValue {
  const context = useContext(CompanyIntelClientContext);
  if (!context) {
    throw new Error(
      'Missing CompanyIntelClientProvider. Wrap your component tree with the provider before using Company Intel hooks.',
    );
  }
  return context;
}
