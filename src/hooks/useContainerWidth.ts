import { useState, useEffect, type RefObject } from 'react';

/**
 * Measures a container's width using ResizeObserver.
 * Returns the current content width in pixels (0 if not yet measured).
 */
export function useContainerWidth(ref: RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
