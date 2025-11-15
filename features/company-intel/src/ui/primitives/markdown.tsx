// ------------------------------------------------------------------------------------------------
//                minimal-markdown.tsx - Lightweight markdown renderer with opinionated styles
// ------------------------------------------------------------------------------------------------

import * as React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@company-intel/ui/lib/cn';

interface MarkdownProps {
  readonly content: string;
  readonly className?: string;
  readonly components?: Components;
}

const defaultComponents: Components = {
  p: ({ children }) => <p className="leading-relaxed text-sm text-muted-foreground [&:not(:first-child)]:mt-3">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground">{children}</em>,
  ul: ({ children }) => <ul className="ml-5 list-disc space-y-1 text-sm leading-relaxed text-muted-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="ml-5 list-decimal space-y-1 text-sm leading-relaxed text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="marker:text-muted-foreground">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className="text-lg font-semibold leading-tight text-foreground">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-semibold leading-tight text-foreground">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold leading-tight text-foreground">{children}</h3>,
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">{children}</code>
  ),
};

export function Markdown({ content, className, components }: MarkdownProps): React.ReactElement {
  return (
    <ReactMarkdown
      className={cn('prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground', className)}
      remarkPlugins={[remarkGfm]}
      components={{
        ...defaultComponents,
        ...components,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
