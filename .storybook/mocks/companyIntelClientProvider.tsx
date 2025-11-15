import React, { type ReactNode } from 'react';
import type { CompanyIntelClientProviderProps } from '@company-intel/ui/company-intel/context/CompanyIntelClientContext';
import { CompanyIntelProviders } from '@company-intel/ui/company-intel/hooks';

export interface MockCompanyIntelProviderProps extends Omit<CompanyIntelClientProviderProps, 'children'> {
  readonly children: ReactNode;
}

const mockRequest: CompanyIntelClientProviderProps['request'] = async () =>
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
