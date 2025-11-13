import React, { useCallback, useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ChatInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly helperText?: string;
  readonly minHeight?: number;
  readonly maxHeight?: number;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ask anything',
  disabled = false,
  className,
  helperText,
  minHeight = 52,
  maxHeight = 200,
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

  const handleSubmit = useCallback(
    (event?: FormEvent) => {
      event?.preventDefault();
      if (!disabled && hasContent) {
        onSubmit();
      }
    },
    [disabled, hasContent, onSubmit],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center rounded-full border border-input bg-background shadow-sm transition-shadow hover:shadow-md focus-within:shadow-md">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-full bg-transparent px-5 py-3.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
              'pr-14',
            )}
            style={{
              height: `${minHeight}px`,
              maxHeight: `${maxHeight}px`,
              overflow: 'hidden',
            }}
          />
          <button
            type="submit"
            disabled={disabled || !hasContent}
            className={cn(
              'absolute right-2 flex h-9 w-9 items-center justify-center rounded-full transition-all',
              'disabled:cursor-not-allowed',
              hasContent && !disabled
                ? 'bg-foreground text-background hover:bg-foreground/90'
                : 'bg-muted text-muted-foreground',
            )}
            aria-label="Send message"
          >
            <ArrowUp className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </form>
      {helperText ? (
        <span className="px-1 text-xs text-muted-foreground">{helperText}</span>
      ) : null}
    </div>
  );
}
