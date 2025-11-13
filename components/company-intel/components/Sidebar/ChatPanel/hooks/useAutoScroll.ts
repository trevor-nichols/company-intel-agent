import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_STICKY_THRESHOLD_PX = 48;

export interface UseAutoScrollOptions {
  readonly stickyThresholdPx?: number;
}

export interface UseAutoScrollResult {
  readonly setViewport: (node: HTMLDivElement | null) => void;
  readonly scrollToBottom: (behavior?: ScrollBehavior) => void;
  readonly scrollIfPinned: (behavior?: ScrollBehavior) => void;
  readonly reset: () => void;
  readonly isPinnedRef: React.MutableRefObject<boolean>;
}

export function useAutoScroll(options: UseAutoScrollOptions = {}): UseAutoScrollResult {
  const { stickyThresholdPx = DEFAULT_STICKY_THRESHOLD_PX } = options;

  const [viewportNode, setViewportNode] = useState<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const isPinnedRef = useRef(true);

  const setViewport = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    setViewportNode(node);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
  }, []);

  const scrollIfPinned = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (!isPinnedRef.current) {
        return;
      }
      scrollToBottom(behavior);
    },
    [scrollToBottom],
  );

  const reset = useCallback(() => {
    isPinnedRef.current = true;
    scrollToBottom('auto');
  }, [scrollToBottom]);

  useEffect(() => {
    const viewport = viewportNode;
    if (!viewport) {
      return undefined;
    }

    const updatePinState = () => {
      const distanceToBottom = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
      isPinnedRef.current = distanceToBottom <= stickyThresholdPx;
    };

    updatePinState();
    const listenerOptions: AddEventListenerOptions = { passive: true };
    viewport.addEventListener('scroll', updatePinState, listenerOptions);
    return () => {
      viewport.removeEventListener('scroll', updatePinState, listenerOptions);
    };
  }, [stickyThresholdPx, viewportNode]);

  return { setViewport, scrollToBottom, scrollIfPinned, reset, isPinnedRef };
}
