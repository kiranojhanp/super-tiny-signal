import { Signal, signal } from "../core/signal.js";

/**
 * useState hook: creates reactive state.
 *
 * Returns a tuple:
 *   - A Signal holding the current state.
 *   - A setter function that accepts a new value or an updater function.
 */
export function useState<T>(
  initialValue: T
): [Signal<T>, (value: T | ((prev: T) => T)) => void] {
  const s = signal(initialValue);
  const setValue = (value: T | ((prev: T) => T)) => {
    if (typeof value === "function") {
      s.value = (value as (prev: T) => T)(s.value);
    } else {
      s.value = value;
    }
  };
  return [s, setValue];
}
