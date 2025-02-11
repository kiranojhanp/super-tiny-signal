import { effect } from "../core/effect.js";

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
