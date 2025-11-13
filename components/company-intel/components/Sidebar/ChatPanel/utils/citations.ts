import type { CompanyIntelChatCitation } from '../../../../hooks';

export interface CitationMarkerDescriptor {
  readonly href: string;
  readonly ordinal: number;
  readonly superscript: string;
  readonly citation: CompanyIntelChatCitation;
}

export type CitationMarkerMap = Record<string, CitationMarkerDescriptor>;

export function prepareCitationRendering(content: string, citations?: readonly CompanyIntelChatCitation[]): {
  readonly content: string;
  readonly markerMap: CitationMarkerMap;
} {
  if (!content || !citations || citations.length === 0) {
    return { content, markerMap: {} };
  }

  const resolved = citations
    .map(citation => ({
      citation,
      resolvedIndex: resolveInsertionIndex(content, citation),
    }))
    .filter((entry): entry is { citation: CompanyIntelChatCitation; resolvedIndex: number } =>
      typeof entry.resolvedIndex === 'number',
    )
    .sort((a, b) => a.resolvedIndex - b.resolvedIndex)
    .map((entry, index) => ({
      ...entry,
      ordinal: index + 1,
    }));

  if (resolved.length === 0) {
    return { content, markerMap: {} };
  }

  let nextContent = content;
  const markerMap: CitationMarkerMap = {};
  const descending = [...resolved].sort((a, b) => b.resolvedIndex - a.resolvedIndex);

  for (const entry of descending) {
    const ordinal = entry.ordinal;
    const key = `c${ordinal}`;
    const href = `/__chat-citation/${key}`;
    const superscript = toSuperscript(ordinal);
    const insertionIndex = clamp(entry.resolvedIndex, 0, nextContent.length);
    nextContent = `${nextContent.slice(0, insertionIndex)}[${superscript}](${href})${nextContent.slice(insertionIndex)}`;
    markerMap[href] = {
      href,
      ordinal,
      superscript,
      citation: entry.citation,
    } satisfies CitationMarkerDescriptor;
  }

  return { content: nextContent, markerMap };
}

export function resolveInsertionIndex(content: string, citation: CompanyIntelChatCitation): number | undefined {
  const quote = citation.quote ?? citation.chunks?.[0]?.text ?? '';
  if (typeof citation.index === 'number') {
    const offset = clamp(citation.index, 0, content.length);
    const width = quote.length > 0 ? quote.length : 0;
    return clamp(offset + width, 0, content.length);
  }

  if (quote.length > 0) {
    const location = content.indexOf(quote);
    if (location >= 0) {
      return clamp(location + quote.length, 0, content.length);
    }
  }

  return content.length;
}

export function toSuperscript(value: number): string {
  const SUPERSCRIPT_DIGITS: Record<string, string> = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
  };

  return value
    .toString()
    .split('')
    .map(char => SUPERSCRIPT_DIGITS[char] ?? char)
    .join('');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
