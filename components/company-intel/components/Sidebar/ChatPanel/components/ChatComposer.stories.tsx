import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { ChatComposer } from './ChatComposer';

const meta: Meta<typeof ChatComposer> = {
  title: 'Company Intel/Sidebar/Chat/ChatComposer',
  component: ChatComposer,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof ChatComposer>;

function ComposerFixture(props: Partial<React.ComponentProps<typeof ChatComposer>>) {
  const [value, setValue] = useState('');
  return (
    <div className="w-full max-w-xl">
      <ChatComposer
        value={value}
        onChange={setValue}
        onSubmit={() => undefined}
        placeholder="Ask how this company positions itself…"
        inputDisabled={false}
        submitDisabled={false}
        helperText="Press Ctrl+Enter to send."
        isStreaming={false}
        {...props}
      />
    </div>
  );
}

export const Ready: Story = {
  render: () => (
    <ComposerFixture helperText="Press Ctrl+Enter to send. Shift+Enter adds a newline." />
  ),
};

export const Disabled: Story = {
  render: () => (
    <ComposerFixture
      inputDisabled
      submitDisabled
      helperText="Chat unlocks when the knowledge base finishes publishing."
      placeholder="Preparing the knowledge base…"
    />
  ),
};

export const Streaming: Story = {
  render: () => (
    <ComposerFixture
      helperText="Streaming live reasoning and answer…"
      isStreaming
      inputDisabled
      submitDisabled
      onStop={() => undefined}
    />
  ),
};
