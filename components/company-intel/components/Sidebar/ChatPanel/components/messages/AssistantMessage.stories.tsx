import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import type { CompanyIntelChatCitation } from '@/shared/company-intel/chat';

import type { AssistantTranscriptMessage } from '../../types';
import { AssistantMessage } from './AssistantMessage';

const baseCitations: CompanyIntelChatCitation[] = [
  {
    fileId: 'snapshot-file-1',
    filename: 'landing-page.md',
    quote: 'Signals refresh within 15 minutes of publication.',
  },
];

const completeMessage: AssistantTranscriptMessage = {
  id: 'assistant-complete',
  role: 'assistant',
  content: 'Acme differentiates with sub-15m signal freshness plus human QA on critical briefs.',
  status: 'complete',
  citations: baseCitations,
  reasoning: {
    headline: 'Cross-check differentiators',
    segments: {
      0: '**Plan** Compare landing page messaging with investor memo to confirm freshness claims.',
      1: '**Action** Surface live coverage + QA examples and cite the source.',
    },
    isStreaming: false,
  },
  tool: { tool: 'file_search', status: 'completed' },
  responseId: 'resp_complete',
  usage: { total_tokens: 180 },
};

const streamingMessage: AssistantTranscriptMessage = {
  id: 'assistant-streaming',
  role: 'assistant',
  content: '',
  status: 'streaming',
  citations: undefined,
  reasoning: {
    headline: null,
    segments: {
      0: 'Collecting differentiation claims from marketing site…',
    },
    isStreaming: true,
  },
  tool: { tool: 'file_search', status: 'in_progress' },
  responseId: undefined,
  usage: null,
};

const failedMessage: AssistantTranscriptMessage = {
  id: 'assistant-failed',
  role: 'assistant',
  content: '',
  status: 'failed',
  citations: undefined,
  reasoning: {
    headline: null,
    segments: {},
    isStreaming: false,
  },
  tool: null,
  responseId: 'resp_failed',
  usage: null,
};

const meta: Meta<typeof AssistantMessage> = {
  title: 'Company Intel/Sidebar/Chat/AssistantMessage',
  component: AssistantMessage,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof AssistantMessage>;

const Wrapper = ({ message }: { readonly message: AssistantTranscriptMessage }) => (
  <div className="w-full max-w-3xl rounded-lg border bg-card p-6">
    <AssistantMessage message={message} />
  </div>
);

export const Complete: Story = {
  render: () => <Wrapper message={completeMessage} />,
};

export const Streaming: Story = {
  render: () => <Wrapper message={streamingMessage} />,
};

export const Failed: Story = {
  render: () => <Wrapper message={failedMessage} />,
};
