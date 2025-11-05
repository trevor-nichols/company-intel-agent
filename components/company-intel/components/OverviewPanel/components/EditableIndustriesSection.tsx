// ------------------------------------------------------------------------------------------------
//                EditableIndustriesSection.tsx - Inline editor for primary industries list
// ------------------------------------------------------------------------------------------------

import React, { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { Pencil, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@agenai/ui/button';
import { Input } from '@agenai/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@agenai/ui/tooltip';
import { EmptyPlaceholder, SectionTitle, ThinkingPlaceholder } from '../../Common';

interface EditableIndustriesSectionProps {
  readonly industries: readonly string[];
  readonly onSave: (nextValue: readonly string[]) => Promise<void> | void;
  readonly isSaving?: boolean;
  readonly headline?: string | null;
  readonly isThinking?: boolean;
}

export function EditableIndustriesSection({
  industries,
  onSave,
  isSaving = false,
  headline,
  isThinking = false,
}: EditableIndustriesSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(() => [...industries]);
  const [pending, setPending] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft([...industries]);
      setPending('');
      setError(null);
    }
  }, [industries, isEditing]);

  const handleEdit = useCallback(() => {
    setDraft([...industries]);
    setPending('');
    setIsEditing(true);
    setError(null);
  }, [industries]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraft([...industries]);
    setPending('');
    setError(null);
  }, [industries]);

  const handleRemove = useCallback((value: string) => {
    setDraft(current => current.filter(item => item !== value));
  }, []);

  const addPending = useCallback(() => {
    const candidate = pending.trim();
    if (!candidate) {
      setError('Enter a valid industry name.');
      return;
    }
    setError(null);
    setDraft(current => {
      if (current.some(item => item.toLowerCase() === candidate.toLowerCase())) {
        return current;
      }
      return [...current, candidate];
    });
    setPending('');
  }, [pending]);

  const handlePendingKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addPending();
      }
    },
    [addPending],
  );

  const handleSave = useCallback(async () => {
    setError(null);
    try {
      await onSave(draft.map(item => item.trim()).filter(Boolean));
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save industries.');
    }
  }, [draft, onSave]);

  const hasIndustries = industries.length > 0;
  const placeholderText = headline?.trim().length ? headline.trim() : null;

  return (
    <section className="space-y-3">
      <SectionTitle
        title="Primary industries"
        description="Sectors most frequently referenced across your content."
      />
      <div className="relative group">
        <div className="rounded-lg border border-border/30 bg-muted/10 p-4 shadow-sm shadow-black/5 transition">
          {isEditing ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {draft.length > 0 ? (
                  draft.map(industry => (
                    <span
                      key={industry}
                      className="group/industry inline-flex items-center gap-1 rounded-full border border-border/50 bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm"
                    >
                      {industry}
                      <button
                        type="button"
                        onClick={() => handleRemove(industry)}
                        className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label={`Remove ${industry}`}
                        disabled={isSaving}
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No industries yet. Add one below.</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={pending}
                  onChange={event => setPending(event.target.value)}
                  onKeyDown={handlePendingKeyDown}
                  placeholder="Add an industry"
                  className="w-full max-w-xs"
                  disabled={isSaving}
                />
                <Button type="button" size="sm" onClick={addPending} disabled={isSaving}>
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Add
                </Button>
              </div>
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
          ) : isThinking ? (
            <ThinkingPlaceholder text={placeholderText} />
          ) : hasIndustries ? (
            <div className="grid gap-2 md:grid-cols-2">
              {industries.map(industry => (
                <div
                  key={industry}
                  className="rounded-lg border border-border/30 bg-background px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground shadow-sm shadow-black/5"
                >
                  {industry}
                </div>
              ))}
            </div>
          ) : (
            <EmptyPlaceholder message="No industries identified yet." />
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
                  <span className="sr-only">Edit primary industries</span>
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
