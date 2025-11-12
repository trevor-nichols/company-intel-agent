import type { Meta, StoryObj } from '@storybook/react-vite';

import { ChatPanel } from './ChatPanel';
import type {
  CompanyIntelChatCitation,
  CompanyIntelChatRequest,
  UseCompanyIntelChatResult,
} from '../../../hooks';

const citations: CompanyIntelChatCitation[] = [
  {
    fileId: 'file-123',
    filename: 'homepage.txt',
    score: 0.91,
    chunks: [
      { text: 'Apple emphasizes privacy and security built into every device.' },
    ],
  },
  {
    fileId: 'file-456',
    filename: 'investors.txt',
    score: 0.83,
    chunks: [
      { text: 'Services revenue grew double digits year-over-year.' },
    ],
  },
];

const baseChatAdapter: Pick<UseCompanyIntelChatResult, 'mutateAsync' | 'isPending' | 'reset'> = {
  mutateAsync: async (_variables: CompanyIntelChatRequest) => {
    void _variables;
    return {
      message: 'Apple positions itself as the premium ecosystem for secure personal computing, leaning on silicon, services, and privacy.',
      responseId: 'resp_story',
      usage: null,
      citations,
    };
  },
  isPending: false,
  reset: () => undefined,
};

const meta: Meta<typeof ChatPanel> = {
  title: 'Company Intel/Sidebar/ChatPanel',
  component: ChatPanel,
  args: {
    snapshotId: 42,
    domain: 'apple.com',
    vectorStoreStatus: 'ready',
    vectorStoreError: null,
    completedAt: new Date('2025-11-05T19:16:00Z'),
    isRunInProgress: false,
    chatAdapter: baseChatAdapter,
  },
};

export default meta;

type Story = StoryObj<typeof ChatPanel>;

export const Ready: Story = {};

export const Publishing: Story = {
  args: {
    vectorStoreStatus: 'publishing',
    chatAdapter: baseChatAdapter,
  },
};

export const Failed: Story = {
  args: {
    vectorStoreStatus: 'failed',
    vectorStoreError: 'Vector store ingestion failed with status timeout.',
    chatAdapter: baseChatAdapter,
  },
};
