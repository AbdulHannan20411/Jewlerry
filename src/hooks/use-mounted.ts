import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True only after client-side hydration. Used to defer rendering of
 * anything that depends on browser-only state (e.g. next-themes' resolved
 * theme) so the server-rendered and first-client-rendered markup match.
 *
 * Implemented with useSyncExternalStore (server snapshot: false, client
 * snapshot: true) rather than the classic `useState(false) + useEffect`
 * pattern, which triggers a "don't setState synchronously in an effect"
 * lint warning and adds an extra render for no benefit here.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
