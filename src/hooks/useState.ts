import { signal } from "../core/signal.js";

/**
 * useState hook: creates reactive state.
 *
 * Returns a tuple:
 *   - A Signal holding the current state.
 *   - A setter function that accepts a new value or an updater function.
 */
export function useState<T>(
  initialValue: T
): [() => T, (value: T | ((prev: T) => T)) => void] {
  return signal(initialValue);
}
