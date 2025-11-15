"use client";

// ------------------------------------------------------------------------------------------------
//                SidebarSwitcher - Pill tab controller for sidebar panes
// ------------------------------------------------------------------------------------------------

import React, { type ReactElement } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@company-intel/ui/tabs';
import { cn } from '@company-intel/ui/lib/cn';

export interface SidebarPane {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly badge?: ReactElement | null;
  readonly render: () => ReactElement;
}

interface SidebarSwitcherProps {
  readonly panes: readonly SidebarPane[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

export function SidebarSwitcher({ panes, value, onChange, className }: SidebarSwitcherProps): ReactElement {
  return (
    <div className={cn('w-full', className)}>
      <Tabs value={value} onValueChange={onChange} className="w-full">
        <div className="flex w-full justify-center">
          <TabsList className="w-fit justify-center">
            {panes.map(pane => (
              <TabsTrigger key={pane.id} value={pane.id} disabled={pane.disabled}>
                <span>{pane.label}</span>
                {pane.badge ? pane.badge : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {panes.map(pane => (
          <TabsContent key={pane.id} value={pane.id} forceMount>
            {pane.render()}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
