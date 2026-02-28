import { signal } from "../core/signal.js";
import type { SignalValue, WritableSignal } from "../core/signal.js";

/**
 * useState hook: creates reactive state.
 *
 * Returns a tuple:
 *   - A Signal holding the current state.
 *   - A setter function that accepts a new value or an updater function.
 */
export function useState<T>(
  initialValue: T
): [WritableSignal<T>, (value: SignalValue<T>) => void] {
  const s = signal(initialValue);
  const setValue = (value: SignalValue<T>) => {
    s(value);
  };
  return [s, setValue];
}
