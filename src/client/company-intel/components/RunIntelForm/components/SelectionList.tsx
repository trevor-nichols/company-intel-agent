// ------------------------------------------------------------------------------------------------
//                SelectionList.tsx - Renders recommended + manual URL selections
// ------------------------------------------------------------------------------------------------

import type { ReactElement, ReactNode } from 'react';
import type { CompanyIntelSelection } from '../../../types';
import { SelectionRow } from './SelectionRow';

interface SelectionListProps {
  readonly recommendedSelections: readonly CompanyIntelSelection[];
  readonly manualSelectedUrls: readonly string[];
  readonly selectedUrls: readonly string[];
  readonly isScraping: boolean;
  readonly onToggle: (url: string, checked: boolean) => void;
  readonly onRemove: (url: string) => void;
  readonly manualEntrySlot?: ReactNode;
}

export function SelectionList({
  recommendedSelections,
  manualSelectedUrls,
  selectedUrls,
  isScraping,
  onToggle,
  onRemove,
  manualEntrySlot,
}: SelectionListProps): ReactElement {
  const hasSelections = recommendedSelections.length > 0 || manualSelectedUrls.length > 0;

  return (
    <div className="space-y-2">
      {hasSelections ? (
        <>
          {recommendedSelections.map(selection => (
            <SelectionRow
              key={selection.url}
              url={selection.url}
              type="recommended"
              signals={selection.matchedSignals}
              checked={selectedUrls.includes(selection.url)}
              disabled={isScraping}
              onToggle={checked => onToggle(selection.url, checked)}
            />
          ))}
          {manualSelectedUrls.map(url => (
            <SelectionRow
              key={url}
              url={url}
              type="manual"
              checked={selectedUrls.includes(url)}
              disabled={isScraping}
              onToggle={checked => onToggle(url, checked)}
              onRemove={() => onRemove(url)}
            />
          ))}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/40 bg-background/40 px-6 py-8 text-center text-sm text-muted-foreground">
          No pages selected yet. Map the site and choose the pages you want to refresh.
        </div>
      )}
      {manualEntrySlot}
    </div>
  );
}
