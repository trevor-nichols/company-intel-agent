import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { SidebarSwitcher } from './SidebarSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '../../../primitives/card';

function SidebarSwitcherExample({ chatEnabled = true }: { readonly chatEnabled?: boolean }) {
  const [value, setValue] = useState(chatEnabled ? 'chat' : 'run');

  return (
    <SidebarSwitcher
      value={value}
      onChange={setValue}
      panes={[
        {
          id: 'run',
          label: 'Run & history',
          render: () => (
            <Card>
              <CardHeader>
                <CardTitle>Run Company Intel</CardTitle>
              </CardHeader>
              <CardContent>Runner form placeholder</CardContent>
            </Card>
          ),
        },
        {
          id: 'chat',
          label: 'Snapshot chat',
          disabled: !chatEnabled,
          render: () => (
            <Card>
              <CardHeader>
                <CardTitle>Chat</CardTitle>
              </CardHeader>
              <CardContent>Chat panel placeholder</CardContent>
            </Card>
          ),
        },
      ]}
    />
  );
}

const meta: Meta<typeof SidebarSwitcherExample> = {
  title: 'Company Intel/Sidebar/SidebarSwitcher',
  component: SidebarSwitcherExample,
};

export default meta;

type Story = StoryObj<typeof SidebarSwitcherExample>;

export const TabsEnabled: Story = {
  args: {
    chatEnabled: true,
  },
};

export const ChatDisabled: Story = {
  args: {
    chatEnabled: false,
  },
};
