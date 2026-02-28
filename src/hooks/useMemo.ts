import { derived } from "../core/computed.js";
import type { EqualsFn } from "../types/index.js";

/**
 * useMemo hook: returns a computed signal that memoizes the result of a computation.
 * 
 * The computed value is lazy (recomputed on access if dependencies changed) and automatically
 * updates when any reactive dependencies change.
 * 
 * @param fn - The computation function that derives the memoized value
 * @param options - Optional configuration: eager mode and custom equality function
 * @returns A computed signal holding the memoized value
 */
export function useMemo<T>(
  fn: () => T,
  options?: { eager?: boolean; equals?: EqualsFn<T> }
): () => T {
  return derived(fn, options);
}
