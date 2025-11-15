import React, { useCallback, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { cn } from '../lib/cn';

interface ChatInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly placeholder?: string;
  readonly inputDisabled?: boolean;
  readonly submitDisabled?: boolean;
  readonly className?: string;
  readonly helperText?: string;
  readonly minHeight?: number;
  readonly maxHeight?: number;
  readonly isStreaming?: boolean;
  readonly onStop?: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask anything',
  inputDisabled = false,
  submitDisabled = false,
  className,
  helperText,
  minHeight = 52,
  maxHeight = 200,
  isStreaming = false,
  onStop,
}: ChatInputProps): React.ReactElement {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasContent = value.trim().length > 0;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [value, minHeight, maxHeight]);

  const isStopMode = isStreaming && typeof onStop === 'function';

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      if (isStopMode) {
        onStop?.();
        return;
      }
      if (!submitDisabled && hasContent) {
        onSubmit();
      }
    },
    [hasContent, isStopMode, onStop, onSubmit, submitDisabled],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter') {
        return;
      }

      const isComposing = event.nativeEvent?.isComposing;
      if (isComposing) {
        return;
      }

      if (!event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-start gap-3 rounded-2xl border border-input bg-background/95 px-3 py-2 shadow-sm transition-all focus-within:border-foreground/60 focus-within:shadow-md">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={inputDisabled}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-2xl bg-transparent px-1 text-sm leading-relaxed outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
              'py-1.5',
            )}
            style={{
              height: `${minHeight}px`,
              maxHeight: `${maxHeight}px`,
              overflowY: 'auto',
            }}
          />
          <button
            type="submit"
            disabled={!isStopMode && (submitDisabled || !hasContent)}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors self-center',
              'disabled:cursor-not-allowed',
              isStopMode
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : hasContent && !submitDisabled
                  ? 'bg-foreground text-background hover:bg-foreground/90'
                  : 'bg-muted text-muted-foreground',
            )}
            aria-label={isStopMode ? 'Stop response' : 'Send message'}
          >
            {isStopMode ? <Square className="h-4 w-4" aria-hidden="true" /> : <ArrowUp className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </form>
      {helperText ? (
        <span className="px-1 text-xs text-muted-foreground">{helperText}</span>
      ) : null}
    </div>
  );
}
