// ------------------------------------------------------------------------------------------------
//                EditableValuePropsSection.tsx - Inline editor for company value propositions
// ------------------------------------------------------------------------------------------------

import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@agenai/ui/button';
import { ScrollArea } from '@agenai/ui/scroll-area';
import { Textarea } from '@agenai/ui/textarea';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@agenai/ui/tooltip';
import { EmptyPlaceholder, SectionTitle, ThinkingPlaceholder } from '../../Common';

interface EditableValuePropsSectionProps {
  readonly valueProps: readonly string[];
  readonly onSave: (nextValue: readonly string[]) => Promise<void> | void;
  readonly isSaving?: boolean;
  readonly headline?: string | null;
  readonly isThinking?: boolean;
  readonly isEditingLocked?: boolean;
}

const MAX_VALUE_PROPS = 12;

export function EditableValuePropsSection({
  valueProps,
  onSave,
  isSaving = false,
  headline,
  isThinking = false,
  isEditingLocked = false,
}: EditableValuePropsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(() => [...valueProps]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft([...valueProps]);
      setError(null);
    }
  }, [valueProps, isEditing]);

  useEffect(() => {
    if (isEditingLocked && isEditing) {
      setIsEditing(false);
      setDraft([...valueProps]);
      setError(null);
    }
  }, [isEditingLocked, isEditing, valueProps]);

  const handleEdit = useCallback(() => {
    if (isEditingLocked || isSaving) {
      return;
    }
    setIsEditing(true);
    setDraft([...valueProps]);
    setError(null);
  }, [valueProps, isEditingLocked, isSaving]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraft([...valueProps]);
    setError(null);
  }, [valueProps]);

  const handleUpdate = useCallback((index: number, value: string) => {
    setDraft(current => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }, []);

  const handleRemove = useCallback((index: number) => {
    setDraft(current => current.filter((_, itemIndex) => itemIndex !== index));
  }, []);

  const handleAdd = useCallback(() => {
    if (draft.length >= MAX_VALUE_PROPS) {
      setError(`You can define up to ${MAX_VALUE_PROPS} value props.`);
      return;
    }
    setError(null);
    setDraft(current => [...current, '']);
  }, [draft.length]);

  const handleSave = useCallback(async () => {
    const cleaned = draft.map(item => item.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      setError('Enter at least one value proposition or cancel the edit.');
      return;
    }

    setError(null);
    try {
      await onSave(cleaned);
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save value propositions.');
    }
  }, [draft, onSave]);

  const hasValueProps = valueProps.length > 0;
  const editTooltip = isEditingLocked
    ? 'Analysis running — editing resumes when the run completes.'
    : 'Edit';

  return (
    <section className="space-y-3">
      <SectionTitle
        title="Value propositions"
        description="Core differentiators surfaced across your public pages."
      />
      <div className="relative group">
        <div className="rounded-lg border border-border/30 bg-muted/10 p-4 shadow-sm shadow-black/5 transition">
          {isEditing ? (
            <div className="space-y-4">
              {draft.length > 0 ? (
                <div className="space-y-3">
                  {draft.map((value, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">
                          Value proposition {index + 1}
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemove(index)}
                          className="rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                          aria-label={`Remove value proposition ${index + 1}`}
                          disabled={isSaving}
                        >
                          <X className="h-3 w-3" aria-hidden />
                        </button>
                      </div>
                      <ScrollArea className="max-h-40 rounded-lg border border-border/20">
                        <Textarea
                          value={value}
                          onChange={event => handleUpdate(index, event.target.value)}
                          rows={3}
                          className="border-0 bg-transparent focus-visible:ring-0"
                          placeholder="Describe a key differentiator."
                          disabled={isSaving}
                        />
                      </ScrollArea>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No value props yet. Add one below.</p>
              )}
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={handleAdd} disabled={isSaving}>
                  <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Add value prop
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
            <ThinkingPlaceholder text={headline ?? undefined} />
          ) : hasValueProps ? (
            <div className="grid gap-3 md:grid-cols-2">
              {valueProps.map((value, index) => (
                <div
                  key={`${value}-${index}`}
                  className="rounded-lg border border-border/30 bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm shadow-black/5"
                >
                  {value}
                </div>
              ))}
            </div>
          ) : (
            <EmptyPlaceholder message="No distinct value props captured yet." />
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
                  disabled={isSaving}
                  aria-disabled={isSaving || isEditingLocked}
                  className={[
                    'absolute right-3 top-3 h-8 w-8 rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm shadow-black/10 transition group-hover:opacity-100 group-hover:text-foreground',
                    isEditingLocked ? 'cursor-not-allowed' : '',
                  ]
                    .join(' ')
                    .trim()}
                >
                  <span className="sr-only">Edit value propositions</span>
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={8} align="center">
                {editTooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
    </section>
  );
}
