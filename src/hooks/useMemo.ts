import { computed } from "../core/computed.js";

/**
 * useMemo hook: returns a memoized value that updates when its reactive dependencies change.
 * 
 * This hook uses computed signals internally, which means the value is computed synchronously
 * on first access and automatically updates when any reactive dependencies change.
 * 
 * @param fn - The computation function that derives the memoized value
 * @returns The computed value
 */
export function useMemo<T>(fn: () => T): T {
  const comp = computed(fn);
  return comp.value;
}
