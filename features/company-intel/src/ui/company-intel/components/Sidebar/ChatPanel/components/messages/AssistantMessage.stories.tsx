import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import type { CompanyIntelChatCitation } from '@company-intel/shared/chat';

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
  consultedDocuments: [
    {
      fileId: 'snapshot-file-1',
      filename: 'landing-page.md',
      score: 0.8,
      chunks: [{ text: 'Signals refresh within 15 minutes of publication.' }],
    },
    {
      fileId: 'snapshot-file-2',
      filename: 'investor-note.md',
      score: 0.72,
      chunks: [{ text: 'Analysts cite QA loop as differentiator.' }],
    },
  ],
  reasoning: {
    headline: 'Cross-check differentiators',
    segments: {
      0: '**Plan** Compare landing page messaging with investor memo to confirm freshness claims.',
      1: '**Action** Surface live coverage + QA examples and cite the source.',
    },
    isStreaming: false,
    startedAt: Date.now() - 2000,
  },
  tool: { tool: 'file_search', status: 'completed', startedAt: Date.now() - 2500 },
  responseId: 'resp_complete',
  usage: { total_tokens: 180 },
  createdAt: Date.now() - 3000,
  contentStartedAt: Date.now() - 1500,
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
    startedAt: Date.now() - 500,
  },
  tool: { tool: 'file_search', status: 'in_progress', startedAt: Date.now() - 800 },
  responseId: undefined,
  usage: null,
  createdAt: Date.now() - 1200,
  contentStartedAt: null,
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
    startedAt: null,
  },
  tool: null,
  responseId: 'resp_failed',
  usage: null,
  createdAt: Date.now() - 600,
  contentStartedAt: null,
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
