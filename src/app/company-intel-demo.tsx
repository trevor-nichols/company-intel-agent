'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CompanyIntelClientProvider, CompanyIntelPanel } from '@/client/company-intel';

export function CompanyIntelDemoApp(): JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CompanyIntelClientProvider teamId={1}>
        <div className="min-h-screen bg-background">
          <main className="mx-auto w-full max-w-screen-2xl py-12">
            <CompanyIntelPanel />
          </main>
        </div>
      </CompanyIntelClientProvider>
    </QueryClientProvider>
  );
}
