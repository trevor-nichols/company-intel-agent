// ------------------------------------------------------------------------------------------------
//                EditableOfferingsSection.tsx - Inline editor for key offerings list
// ------------------------------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@agenai/ui/button';
import { Input } from '@agenai/ui/input';
import { ScrollArea } from '@agenai/ui/scroll-area';
import { Textarea } from '@agenai/ui/textarea';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@agenai/ui/tooltip';
import type { CompanyProfileKeyOffering } from '../../../types';
import { EmptyPlaceholder, SectionTitle, ThinkingPlaceholder } from '../../Common';

interface EditableOfferingsSectionProps {
  readonly offerings: readonly CompanyProfileKeyOffering[];
  readonly onSave: (nextValue: readonly CompanyProfileKeyOffering[]) => Promise<void> | void;
  readonly isSaving?: boolean;
  readonly headline?: string | null;
  readonly isThinking?: boolean;
  readonly isEditingLocked?: boolean;
}

interface EditableOfferingDraft {
  id: string;
  title: string;
  description: string;
}

const MAX_OFFERINGS = 12;

function createDraftId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `draft-${Math.random().toString(36).slice(2)}`;
}

export function EditableOfferingsSection({
  offerings,
  onSave,
  isSaving = false,
  headline,
  isThinking = false,
  isEditingLocked = false,
}: EditableOfferingsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<EditableOfferingDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(offerings.map(offering => ({
        id: createDraftId(),
        title: offering.title,
        description: offering.description ?? '',
      })));
      setError(null);
    }
  }, [offerings, isEditing]);

  const hasOfferings = offerings.length > 0;
  const editTooltip = isEditingLocked
    ? 'Analysis running — editing resumes when the run completes.'
    : 'Edit';

  useEffect(() => {
    if (isEditingLocked && isEditing) {
      setIsEditing(false);
      setDraft(offerings.map(offering => ({
        id: createDraftId(),
        title: offering.title,
        description: offering.description ?? '',
      })));
      setError(null);
    }
  }, [isEditingLocked, isEditing, offerings]);

  const handleEdit = useCallback(() => {
    if (isEditingLocked || isSaving) {
      return;
    }
    setDraft(offerings.map(offering => ({
      id: createDraftId(),
      title: offering.title,
      description: offering.description ?? '',
    })));
    setIsEditing(true);
    setError(null);
  }, [offerings, isEditingLocked, isSaving]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraft(offerings.map(offering => ({
      id: createDraftId(),
      title: offering.title,
      description: offering.description ?? '',
    })));
    setError(null);
  }, [offerings]);

  const handleUpdate = useCallback((id: string, changes: Partial<EditableOfferingDraft>) => {
    setDraft(current => current.map(item => (item.id === id ? { ...item, ...changes } : item)));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setDraft(current => current.filter(item => item.id !== id));
  }, []);

  const handleAdd = useCallback(() => {
    setError(null);
    if (draft.length >= MAX_OFFERINGS) {
      setError(`You can define up to ${MAX_OFFERINGS} offerings.`);
      return;
    }
    setDraft(current => [
      ...current,
      {
        id: createDraftId(),
        title: '',
        description: '',
      },
    ]);
  }, [draft.length]);

  const sanitisedDraft = useMemo(
    () =>
      draft
        .map(item => ({
          title: item.title.trim(),
          description: item.description.trim(),
        }))
        .filter(item => item.title.length > 0),
    [draft],
  );

  const handleSave = useCallback(async () => {
    if (sanitisedDraft.length === 0) {
      setError('Enter at least one key offering or cancel the edit.');
      return;
    }

    setError(null);
    try {
      await onSave(
        sanitisedDraft.map(item => ({
          title: item.title,
          ...(item.description.length > 0 ? { description: item.description } : {}),
        })),
      );
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save key offerings.');
    }
  }, [onSave, sanitisedDraft]);

  return (
    <section className="space-y-3">
      <SectionTitle
        title="Key offerings"
        description="Products and services highlighted on your site."
      />
      <div className="relative group">
        <div className="rounded-lg border border-border/30 bg-muted/10 p-4 shadow-sm shadow-black/5 transition">
          {isEditing ? (
            <div className="space-y-4">
              {draft.length > 0 ? (
                <div className="space-y-4">
                  {draft.map(item => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border/40 bg-background/80 p-4 shadow-sm shadow-black/5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">Offering</h4>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemove(item.id)}
                          disabled={isSaving}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label="Remove offering"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                      <div className="mt-3 space-y-2">
                        <Input
                          value={item.title}
                          onChange={event => handleUpdate(item.id, { title: event.target.value })}
                          placeholder="Offering title"
                          disabled={isSaving}
                        />
                        <ScrollArea className="max-h-40 rounded-lg border border-border/20">
                          <Textarea
                            value={item.description}
                            onChange={event => handleUpdate(item.id, { description: event.target.value })}
                            rows={4}
                            className="border-0 bg-transparent focus-visible:ring-0"
                            placeholder="Optional: describe what makes this offering unique."
                            disabled={isSaving}
                          />
                        </ScrollArea>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No offerings yet. Add one below.</p>
              )}
              <Button type="button" size="sm" variant="outline" onClick={handleAdd} disabled={isSaving}>
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                Add offering
              </Button>
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
          ) : hasOfferings ? (
            <div className="grid gap-3 md:grid-cols-2">
              {offerings.map((offering, index) => (
                <div
                  key={`${offering.title}-${index}`}
                  className="space-y-1 rounded-lg border border-border/30 bg-background px-3 py-3 shadow-sm shadow-black/5"
                >
                  <p className="text-sm font-medium text-foreground">{offering.title}</p>
                  {offering.description ? (
                    <p className="text-xs text-muted-foreground">{offering.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyPlaceholder message="Run a new collection to capture product highlights." />
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
                  <span className="sr-only">Edit key offerings</span>
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
