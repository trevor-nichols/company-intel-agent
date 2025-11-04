// ------------------------------------------------------------------------------------------------
//                EditableOverviewSection.tsx - Inline editor for company overview narrative
// ------------------------------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { Button } from '@agenai/ui/button';
import { ScrollArea } from '@agenai/ui/scroll-area';
import { Textarea } from '@agenai/ui/textarea';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@agenai/ui/tooltip';
import { MinimalMarkdown } from '@agenai/ui';
import { EmptyPlaceholder, SectionTitle, ThinkingPlaceholder } from '../../Common';

interface EditableOverviewSectionProps {
  readonly overview: string | null;
  readonly streamingDraft?: string | null;
  readonly onSave: (nextValue: string | null) => Promise<void> | void;
  readonly isSaving?: boolean;
  readonly headline?: string | null;
  readonly isStreaming?: boolean;
  readonly isThinking?: boolean;
}

export function EditableOverviewSection({
  overview,
  streamingDraft,
  onSave,
  isSaving = false,
  headline,
  isStreaming = false,
  isThinking = false,
}: EditableOverviewSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(overview ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(overview ?? '');
      setError(null);
    }
  }, [overview, isEditing]);

  const trimmedDraft = useMemo(() => draft.trim(), [draft]);

  const handleEdit = useCallback(() => {
    setDraft(overview ?? '');
    setIsEditing(true);
    setError(null);
  }, [overview]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraft(overview ?? '');
    setError(null);
  }, [overview]);

  const handleSave = useCallback(async () => {
    setError(null);
    try {
      await onSave(trimmedDraft.length > 0 ? trimmedDraft : null);
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save overview.');
    }
  }, [onSave, trimmedDraft]);

  const streamingNarrative = useMemo(() => {
    if (!streamingDraft || streamingDraft.trim().length === 0) {
      return null;
    }
    return streamingDraft.trim();
  }, [streamingDraft]);

  const displayNarrative = streamingNarrative ?? overview;
  const hasNarrative = Boolean(displayNarrative && displayNarrative.trim().length > 0);
  const placeholderText = headline?.trim().length ? headline.trim() : null;

  return (
    <section className="space-y-3">
      <SectionTitle title="Executive overview" description="AI-generated narrative from the latest run." />
      <div className="relative group">
        <div className="rounded-lg border border-border/30 bg-background/80 p-4 shadow-sm shadow-black/5 transition">
          {isEditing ? (
            <div className="space-y-3">
              <ScrollArea className="max-h-[26rem] rounded-lg border border-border/20">
                <Textarea
                  value={draft}
                  onChange={event => setDraft(event.target.value)}
                  rows={10}
                  className="border-0 bg-transparent focus-visible:ring-0"
                  placeholder="Summarise the company in a few paragraphs."
                  disabled={isSaving}
                />
              </ScrollArea>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : isThinking || (isStreaming && !hasNarrative) ? (
            <ThinkingPlaceholder text={placeholderText} />
          ) : hasNarrative ? (
            <div className="space-y-3">
              <MinimalMarkdown content={displayNarrative ?? ''} />
            </div>
          ) : (
            <EmptyPlaceholder message="Run a collection from the right to capture an executive overview." />
          )}
        </div>
        {!isEditing ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleEdit}
                  className="absolute right-3 top-3 h-8 w-8 rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm shadow-black/10 transition group-hover:opacity-100 group-hover:text-foreground"
                >
                  <span className="sr-only">Edit overview</span>
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8} align="center">
                Edit
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
    </section>
  );
}
