import { signal, Signal, effect } from "./core";

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

/**
 * useEffect hook: runs a side effect that automatically tracks its dependencies.
 */
export function useEffect(fn: () => void | (() => void)): void {
  let cleanup: void | (() => void);
  const wrappedEffect = () => {
    if (cleanup) cleanup();
    const result = fn();
    if (typeof result === "function") {
      cleanup = result;
    }
  };
  effect(wrappedEffect);
}

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
