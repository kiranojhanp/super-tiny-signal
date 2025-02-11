import { effect } from "../core/effect.js";

/**
 * useMemo hook: returns a memoized value that updates when its reactive dependencies change.
 */
export function useMemo<T>(fn: () => T): T {
  let value: T;
  effect(() => {
    value = fn();
  });
  return value!;
}
