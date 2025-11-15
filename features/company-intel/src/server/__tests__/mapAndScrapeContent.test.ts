import { describe, expect, it } from 'vitest';

import {
  resolvePageContent,
  stripHtml,
} from '../services/run-collection/stages/mapAndScrape';
import type { SiteIntelScrapeExtractResult } from '../web-search';

function createDocument(
  overrides: Partial<SiteIntelScrapeExtractResult> = {},
): SiteIntelScrapeExtractResult {
  return {
    url: overrides.url ?? 'https://example.com/page',
    ...overrides,
  };
}

describe('stripHtml', () => {
  it('removes non-content tags and normalises block structure', () => {
    const html = `
      <html>
        <head>
          <style>.hidden { display: none; }</style>
        </head>
        <body>
          <h1>Welcome</h1>
          <p>Paragraph &amp; copy</p>
          <ul><li>First</li><li>Second</li></ul>
          <script>alert('x')</script>
        </body>
      </html>
    `;

    expect(stripHtml(html)).toBe('Welcome\n\nParagraph & copy\n\n- First\n\n- Second');
  });

  it('decodes basic entities and collapses whitespace', () => {
    const html = '<p>Fish&nbsp;&amp;&nbsp;Chips</p>';

    expect(stripHtml(html)).toBe('Fish & Chips');
  });
});

describe('resolvePageContent', () => {
  it('prefers markdown payload when available', () => {
    const document = createDocument({
      markdown: '  # Heading\n\nBody  ',
      text: 'Plain text fallback',
      rawContent: '<p>Ignored html</p>',
    });

    const result = resolvePageContent(document);

    expect(result.contentType).toBe('markdown');
    expect(result.markdownPayload).toBe('  # Heading\n\nBody  ');
    expect(result.htmlPayload).toBeNull();
    expect(result.promptContent).toBe('# Heading\n\nBody');
    expect(result.wordCountSource).toBe('  # Heading\n\nBody  ');
  });

  it('falls back to text content when markdown is empty', () => {
    const document = createDocument({
      markdown: '   ',
      text: '  Text content  ',
    });

    const result = resolvePageContent(document);

    expect(result.contentType).toBe('markdown');
    expect(result.markdownPayload).toBe('  Text content  ');
    expect(result.htmlPayload).toBeNull();
    expect(result.promptContent).toBe('Text content');
    expect(result.wordCountSource).toBe('  Text content  ');
  });

  it('uses sanitised html when only raw content is present', () => {
    const document = createDocument({
      rawContent: '<div>Alpha<br>Beta</div>',
    });

    const result = resolvePageContent(document);

    expect(result.contentType).toBe('html');
    expect(result.markdownPayload).toBeNull();
    expect(result.htmlPayload).toBe('<div>Alpha<br>Beta</div>');
    expect(result.promptContent).toBe('Alpha\nBeta');
    expect(result.wordCountSource).toBe('Alpha\nBeta');
  });

  it('uses meta description when sanitised html collapses to nothing', () => {
    const document = createDocument({
      rawContent: '<div><script>void 0</script></div>',
      description: ' Meta description ',
    });

    const result = resolvePageContent(document);

    expect(result.contentType).toBe('html');
    expect(result.promptContent).toBe('Meta description');
    expect(result.wordCountSource).toBe('');
    expect(result.htmlPayload).toBe('<div><script>void 0</script></div>');
  });

  it('falls back to raw html when no readable text exists', () => {
    const document = createDocument({
      rawContent: '<div></div>',
      metadata: {},
    });

    const result = resolvePageContent(document);

    expect(result.contentType).toBe('html');
    expect(result.promptContent).toBe('<div></div>');
    expect(result.wordCountSource).toBe('');
    expect(result.htmlPayload).toBe('<div></div>');
  });
});
