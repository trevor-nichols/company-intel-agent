// ------------------------------------------------------------------------------------------------
//                EditableIdentity.tsx - Inline editor for company name and tagline
// ------------------------------------------------------------------------------------------------

import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';
import { Button } from '@agenai/ui/button';
import { Input } from '@agenai/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@agenai/ui/tooltip';
import { CardTitle } from '@agenai/ui/card';

interface EditableIdentityProps {
  readonly companyName: string | null;
  readonly tagline: string | null;
  readonly domainLabel: string | null;
  readonly isEditable: boolean;
  readonly isSaving: boolean;
  readonly onSave: (payload: { companyName: string | null; tagline: string | null }) => Promise<void>;
}

export function EditableIdentity({
  companyName,
  tagline,
  domainLabel,
  isEditable,
  isSaving,
  onSave,
}: EditableIdentityProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(companyName ?? '');
  const [taglineDraft, setTaglineDraft] = useState(tagline ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setNameDraft(companyName ?? '');
      setTaglineDraft(tagline ?? '');
      setError(null);
    }
  }, [companyName, tagline, isEditing]);

  const handleEdit = useCallback(() => {
    if (!isEditable) return;
    setIsEditing(true);
    setError(null);
  }, [isEditable]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setNameDraft(companyName ?? '');
    setTaglineDraft(tagline ?? '');
    setError(null);
  }, [companyName, tagline]);

  const handleSave = useCallback(async () => {
    setError(null);
    try {
      await onSave({
        companyName: nameDraft.trim().length > 0 ? nameDraft.trim() : null,
        tagline: taglineDraft.trim().length > 0 ? taglineDraft.trim() : null,
      });
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update company identity.');
    }
  }, [nameDraft, onSave, taglineDraft]);

  const canShowEditor = isEditable;
  const displayName = companyName ?? 'Company intel overview';
  const displayTagline = tagline ?? 'Executive intel for your team.';
  const domainDisplay = domainLabel ? domainLabel.replace(/https?:\/\//i, '').replace(/\/$/, '') : null;

  return (
    <div className="relative group">
      {isEditing ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Company name</label>
            <Input
              value={nameDraft}
              onChange={event => setNameDraft(event.target.value)}
              placeholder="Name displayed across intel"
              disabled={isSaving}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tagline</label>
            <Input
              value={taglineDraft}
              onChange={event => setTaglineDraft(event.target.value)}
              placeholder="Optional: short positioning statement"
              disabled={isSaving}
            />
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
      ) : (
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold text-foreground">{displayName}</CardTitle>
          <p className="text-sm text-muted-foreground">{displayTagline}</p>
          {domainDisplay ? (
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{domainDisplay}</p>
          ) : null}
        </div>
      )}

      {canShowEditor && !isEditing ? (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-background/80 text-muted-foreground opacity-0 shadow-sm shadow-black/10 transition group-hover:opacity-100 group-hover:text-foreground"
              >
                <span className="sr-only">Edit name and tagline</span>
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} align="center">
              Edit
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}
