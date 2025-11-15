import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import type { Components } from 'react-markdown';

import { ChatPanel } from './ChatPanel';
import { ReasoningAccordion } from './components/ReasoningAccordion';
import { ToolActivityIndicator } from './components/ToolActivityIndicator';
import type {
  CompanyIntelChatCitation,
  CompanyIntelChatRequest,
  UseCompanyIntelChatResult,
} from '../../../hooks';
import type { CompanyIntelChatToolStatus, CompanyIntelConsultedDocument } from '../../../../../shared/chat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../primitives/card';
import { ScrollArea } from '../../../../primitives/scroll-area';
import { TooltipProvider } from '../../../../primitives/tooltip';
import { Markdown } from '../../../../primitives/markdown';
import { Badge } from '../../../../primitives/badge';
import { CitationMarker } from './components/CitationMarker';
import { type CitationMarkerMap, prepareCitationRendering } from './utils/citations';
import { ConsultedDocumentChips } from './components/ConsultedDocumentChips';

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

const consultedDocuments: CompanyIntelConsultedDocument[] = [
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

const baseChatAdapter: Pick<UseCompanyIntelChatResult, 'mutateAsync' | 'isPending' | 'reset' | 'cancel'> = {
  mutateAsync: async (_variables: CompanyIntelChatRequest) => {
    void _variables;
    return {
      message: 'Apple positions itself as the premium ecosystem for secure personal computing, leaning on silicon, services, and privacy.',
      responseId: 'resp_story',
      usage: null,
      citations,
      consultedDocuments,
    };
  },
  isPending: false,
  reset: () => undefined,
  cancel: () => undefined,
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

export const TranscriptFixture: Story = {
  render: () => <ChatPanelTranscriptFixture />,
  parameters: {
    layout: 'centered',
  },
};

// ------------------------------------------------------------------------------------------------
//                Storybook fixture (no impact on production code)
// ------------------------------------------------------------------------------------------------

type FixtureMessage =
  | {
      readonly id: string;
      readonly role: 'user';
      readonly content: string;
    }
  | {
      readonly id: string;
      readonly role: 'assistant';
      readonly content: string;
      readonly citations: readonly CompanyIntelChatCitation[];
      readonly consultedDocuments?: readonly CompanyIntelConsultedDocument[];
      readonly reasoningHeadline: string;
      readonly reasoningSegments: readonly string[];
      readonly tool?: {
        readonly tool: string;
        readonly status: CompanyIntelChatToolStatus;
      };
    };

const transcriptFixture: readonly FixtureMessage[] = [
  {
    id: 'user-1',
    role: 'user',
    content: 'Where does Acme differentiate and what sources back that up?',
  },
  {
    id: 'assistant-1',
    role: 'assistant',
    content:
      'Acme leans on live signal coverage (≈15 min latency) plus human QA. That’s faster than legacy CI vendors and keeps GTM teams in sync as news breaks.[¹](/__chat-citation/c1)',
    citations: [
      {
        fileId: 'snapshot-file-1',
        filename: 'investor-update.md',
        quote: 'Signals refresh within 15 minutes of publication.',
      },
    ],
    consultedDocuments: [
      {
        fileId: 'snapshot-file-1',
        filename: 'investor-update.md',
        score: 0.78,
        chunks: [{ text: 'Signals refresh within 15 minutes of publication.' }],
      },
    ],
    reasoningHeadline: 'Cross-check differentiators',
    reasoningSegments: [
      '**Plan** Compare scraped landing page with investor memo to confirm positioning.',
      '**Reason** Human QA + fast ingest come up twice → highlight both and cite underlying docs.',
    ],
    tool: {
      tool: 'file_search',
      status: 'completed',
    },
  },
];

function ChatPanelTranscriptFixture(): React.ReactElement {
  return (
    <Card className="w-full max-w-3xl shadow-lg">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Snapshot chat (Fixture)</CardTitle>
          <Badge variant="secondary">Ready</Badge>
        </div>
        <CardDescription>Latest run for acmeintel.ai · Nov 10, 2025</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-72 rounded-md border bg-card">
          <div className="flex h-full flex-col gap-3 p-4">
            {transcriptFixture.map(message =>
              message.role === 'user' ? (
                <FixtureUserBubble key={message.id} message={message} />
              ) : (
                <FixtureAssistantBubble key={message.id} message={message} />
              ),
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function FixtureUserBubble({ message }: { readonly message: Extract<FixtureMessage, { role: 'user' }> }): React.ReactElement {
  return (
    <div className="flex flex-col items-end gap-2 text-right text-sm">
      <div className="max-w-full rounded-lg border bg-primary px-3 py-2 text-primary-foreground shadow-sm md:max-w-[85%]">
        {message.content}
      </div>
    </div>
  );
}

function FixtureAssistantBubble({ message }: { readonly message: Extract<FixtureMessage, { role: 'assistant' }> }): React.ReactElement {
  const { content, markerMap } = useMemo(
    () => prepareCitationRendering(message.content, message.citations),
    [message.content, message.citations],
  );
  const markdownComponents = useMemo(() => buildCitationComponents(markerMap), [markerMap]);

  return (
    <div className="flex flex-col items-start gap-3 text-left text-sm">
      <ReasoningAccordion
        headline={message.reasoningHeadline}
        summarySegments={message.reasoningSegments}
        isStreaming={false}
      />
      {message.tool ? (
        <ToolActivityIndicator tool={message.tool.tool} status={message.tool.status} />
      ) : null}
      <TooltipProvider delayDuration={120} skipDelayDuration={0}>
        <div className="max-w-full rounded-lg border bg-muted/60 px-3 py-2 text-foreground shadow-sm md:max-w-[85%]">
          <Markdown content={content} className="text-sm" components={markdownComponents} />
        </div>
      </TooltipProvider>
      {message.consultedDocuments && message.consultedDocuments.length > 0 ? (
        <ConsultedDocumentChips documents={message.consultedDocuments} />
      ) : null}
    </div>
  );
}

function buildCitationComponents(markerMap: CitationMarkerMap): Components | undefined {
  const hasMarkers = Object.keys(markerMap).length > 0;
  if (!hasMarkers) {
    return undefined;
  }

  const defaultAnchor = ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline-offset-4 hover:underline"
      {...rest}
    >
      {children}
    </a>
  );

  return {
    a: props => {
      const { href } = props;
      if (href && markerMap[href]) {
        return <CitationMarker marker={markerMap[href]} />;
      }
      return defaultAnchor(props);
    },
  };
}
