// ------------------------------------------------------------------------------------------------
//                RunIntelForm.tsx - Controls for mapping + triggering company intel collections
// ------------------------------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@agenai/ui/alert';
import { Button } from '@agenai/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@agenai/ui/card';
import { Input } from '@agenai/ui/input';
import { Label } from '@agenai/ui/label';
import { ScrollArea } from '@agenai/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@agenai/ui/tooltip';
import type { CompanyIntelPreviewResult, CompanyIntelSelection } from '../../types';
import { SelectionList } from './components/SelectionList';
import { ManualEntryRow } from './components/ManualEntryRow';

interface RunIntelFormProps {
  readonly domain: string;
  readonly trimmedDomain: string;
  readonly onDomainChange: (value: string) => void;
  readonly submit: () => Promise<void>;
  readonly startOver: () => void;
  readonly isBusy: boolean;
  readonly isPreviewing: boolean;
  readonly isScraping: boolean;
  readonly hasPreview: boolean;
  readonly errorMessage: string | null;
  readonly manualError: string | null;
  readonly statusMessages: readonly string[];
  readonly manualUrl: string;
  readonly onManualUrlChange: (value: string) => void;
  readonly addManualUrl: () => void;
  readonly removeManualUrl: (url: string) => void;
  readonly toggleSelection: (url: string, checked: boolean) => void;
  readonly selectedUrls: readonly string[];
  readonly recommendedSelections: readonly CompanyIntelSelection[];
  readonly manualSelectedUrls: readonly string[];
  readonly previewData: CompanyIntelPreviewResult | null;
}

export function RunIntelForm(props: RunIntelFormProps): ReactElement {
  const {
    domain,
    trimmedDomain,
    onDomainChange,
    submit,
    startOver,
    isBusy,
    isPreviewing,
    isScraping,
    hasPreview,
    errorMessage,
    manualError,
    statusMessages,
    manualUrl,
    onManualUrlChange,
    addManualUrl,
    removeManualUrl,
    toggleSelection,
    selectedUrls,
    recommendedSelections,
    manualSelectedUrls,
    previewData,
  } = props;

  const [isManualEntryOpen, setManualEntryOpen] = useState(false);
  const manualEntryCommitted = useRef(false);

  const primaryActionLabel = hasPreview
    ? isScraping
      ? 'Analyzing pages…'
      : 'Analyze selected pages'
    : isPreviewing
      ? 'Mapping site…'
      : 'Map site';

  const showSelectionsCard = isPreviewing || hasPreview || manualSelectedUrls.length > 0;
  const showStatusMessages = statusMessages.length > 0;

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await submit();
    },
    [submit],
  );

  const openManualEntry = useCallback(() => {
    setManualEntryOpen(true);
    manualEntryCommitted.current = false;
  }, []);

  const handleManualCancel = useCallback(() => {
    setManualEntryOpen(false);
    manualEntryCommitted.current = false;
    onManualUrlChange('');
  }, [onManualUrlChange]);

  const handleManualSubmit = useCallback(
    (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();
      manualEntryCommitted.current = true;
      addManualUrl();
    },
    [addManualUrl],
  );

  const handleManualBlur = useCallback(() => {
    if (manualUrl.trim().length === 0 && manualEntryCommitted.current === false) {
      setManualEntryOpen(false);
      onManualUrlChange('');
    }
  }, [manualUrl, onManualUrlChange]);

  useEffect(() => {
    if (!isManualEntryOpen || !manualEntryCommitted.current) {
      return;
    }

    if (manualError) {
      manualEntryCommitted.current = false;
      return;
    }

    if (manualUrl.trim().length === 0) {
      setManualEntryOpen(false);
      manualEntryCommitted.current = false;
    }
  }, [isManualEntryOpen, manualError, manualUrl]);

  useEffect(() => {
    if (!hasPreview) {
      setManualEntryOpen(false);
      manualEntryCommitted.current = false;
      onManualUrlChange('');
    }
  }, [hasPreview, onManualUrlChange]);

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Run Company Intel</CardTitle>
          <CardDescription>
            Map your public site, curate the right pages, and refresh the structured profile for your team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-domain">Company website</Label>
              <Input
                id="company-domain"
                placeholder="https://example.com"
                value={domain}
                onChange={event => onDomainChange(event.target.value)}
                disabled={isBusy}
                autoComplete="url"
              />
              <p className="text-xs text-muted-foreground">
                We map the domain first, then you decide which pages to include before scraping.
              </p>
            </div>

            {errorMessage ? (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" aria-hidden />
                <AlertTitle>Take a quick pause</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isBusy}>
                {primaryActionLabel}
              </Button>
              {hasPreview ? (
                <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={startOver}>
                  Start over
                </Button>
              ) : null}
            </div>
          </form>

          {showStatusMessages ? (
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              {statusMessages.map((message, index) => (
                <div key={`${message}-${index.toString()}`} className="flex items-center gap-2 text-foreground">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  {message}
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {showSelectionsCard ? (
        <Card className="w-full">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle>Pages for this run</CardTitle>
                <CardDescription>
                  Curate the URLs we&apos;ll scrape before triggering the refresh.
                </CardDescription>
              </div>
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isBusy}
                      onClick={isManualEntryOpen ? handleManualCancel : openManualEntry}
                      aria-label={isManualEntryOpen ? 'Close manual page entry' : 'Add another page'}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={8}>
                    <p>{isManualEntryOpen ? 'Close manual URL entry' : 'Add another page'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isPreviewing ? (
              <div className="rounded-lg border border-border/50 bg-muted/10 p-3 text-sm text-muted-foreground">
                Mapping {trimmedDomain || 'your site'}…
              </div>
            ) : hasPreview && previewData ? (
              <div className="space-y-6">
                <div className="rounded-lg border border-border/40 bg-muted/5 p-4">
                  <dl className="grid gap-4 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="space-y-1">
                      <dt className="font-medium text-foreground">Base URL</dt>
                      <dd className="font-mono text-sm text-foreground">{previewData.map.baseUrl}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="font-medium text-foreground">Mapping time</dt>
                      <dd>{previewData.map.responseTime ? `${previewData.map.responseTime.toFixed(2)}s` : '—'}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="font-medium text-foreground">Recommended pages</dt>
                      <dd>{recommendedSelections.length}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="font-medium text-foreground">Selected pages</dt>
                      <dd>{selectedUrls.length}</dd>
                    </div>
                  </dl>
                </div>

                <ScrollArea className="h-72 pr-2">
                  <SelectionList
                    recommendedSelections={recommendedSelections}
                    manualSelectedUrls={manualSelectedUrls}
                    selectedUrls={selectedUrls}
                    isScraping={isScraping}
                    onToggle={toggleSelection}
                    onRemove={removeManualUrl}
                    manualEntrySlot={
                      isManualEntryOpen ? (
                        <ManualEntryRow
                          manualUrl={manualUrl}
                          manualError={manualError}
                          isBusy={isScraping}
                          onChange={onManualUrlChange}
                          onSubmit={handleManualSubmit}
                          onCancel={handleManualCancel}
                          onBlur={handleManualBlur}
                        />
                      ) : null
                    }
                  />
                </ScrollArea>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Map your domain to see the recommended URLs and add any additional pages you&apos;d like to include.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
