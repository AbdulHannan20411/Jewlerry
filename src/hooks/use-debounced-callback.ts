import * as React from "react";

/** Stable debounced wrapper — used by search inputs that drive a URL param. */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number,
): (...args: A) => void {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = React.useRef(fn);
  React.useEffect(() => {
    fnRef.current = fn;
  });

  return React.useCallback(
    (...args: A) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => fnRef.current(...args), delayMs);
    },
    [delayMs],
  );
}
