// ------------------------------------------------------------------------------------------------
//                pages.ts - Page payload transformers for company intel agents - Dependencies: none
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
//                Types
// ------------------------------------------------------------------------------------------------

export interface CompanyIntelPageContent {
  readonly url: string;
  readonly content: string;
  readonly title?: string | null;
  readonly identifiedName?: string | null;
}

// ------------------------------------------------------------------------------------------------
//                Helpers
// ------------------------------------------------------------------------------------------------

function normaliseTagName(candidate: string): string {
  const cleaned = candidate
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return cleaned.length > 0 ? cleaned : 'page';
}

function derivePageTagName(url: string, explicitName?: string | null): string {
  if (explicitName && explicitName.trim().length > 0) {
    return normaliseTagName(explicitName);
  }

  try {
    const parsed = new URL(url);
    const pathSegments = parsed.pathname
      .split('/')
      .map(segment => segment.trim())
      .filter(Boolean);

    if (pathSegments.length === 0) {
      return 'home_page';
    }

    return normaliseTagName(pathSegments.join('_'));
  } catch {
    return 'page';
  }
}

// ------------------------------------------------------------------------------------------------
//                Public API
// ------------------------------------------------------------------------------------------------

export function formatPagesAsXml(pages: readonly CompanyIntelPageContent[]): string {
  return pages
    .filter(page => page.content.trim().length > 0)
    .map(page => {
      const tag = derivePageTagName(page.url, page.identifiedName ?? page.title ?? null);
      const trimmedContent = page.content.trim();
      return `<page name="${tag}" url="${page.url}">
${trimmedContent}
</page>`;
    })
    .join('\n\n');
}

export const pageTransformers = {
  formatPagesAsXml,
};

export type { CompanyIntelPageContent as StructuredPageContent };
