import React, { type ReactNode } from 'react';
import type { CompanyIntelClientProviderProps } from '@/components/company-intel/context/CompanyIntelClientContext';
import { CompanyIntelProviders } from '@/components/company-intel/hooks';

export interface MockCompanyIntelProviderProps extends Omit<CompanyIntelClientProviderProps, 'children'> {
  readonly children: ReactNode;
}

const mockRequest: CompanyIntelClientProviderProps['request'] = async (path, init) =>
  new Response(JSON.stringify({ data: null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

export function MockCompanyIntelProvider({ children, ...props }: MockCompanyIntelProviderProps) {
  return (
    <CompanyIntelProviders baseUrl="/api/company-intel" request={mockRequest} {...props}>
      {children}
    </CompanyIntelProviders>
  );
}
