import { effect } from "../core/effect.js";

/**
 * useEffect hook: runs a side effect that automatically tracks its dependencies.
 * 
 * The effect function is executed immediately and re-runs whenever any of its
 * reactive dependencies change. The function can optionally return a cleanup
 * function that will be called before the next execution or when the effect is disposed.
 * 
 * @param fn - The effect function to run. Can optionally return a cleanup function.
 * @returns A disposal function to stop the effect and run final cleanup.
 * 
 * @example
 * const dispose = useEffect(() => {
 *   console.log('Effect running');
 *   return () => console.log('Cleanup');
 * });
 * 
 * // Later, to stop the effect:
 * dispose();
 */
export function useEffect(fn: () => void | (() => void)): () => void {
  let cleanup: void | (() => void);
  
  const wrappedEffect = () => {
    // Run cleanup from previous execution
    if (cleanup) cleanup();
    
    // Execute the effect and capture any cleanup function
    const result = fn();
    if (typeof result === "function") {
      cleanup = result;
    }
  };
  
  // Get the disposal function from the effect system
  const dispose = effect(wrappedEffect);
  
  // Return a composite disposal function that runs both cleanups
  return () => {
    // Run user's cleanup if present
    if (cleanup) cleanup();
    // Dispose the effect from the reactive system
    dispose();
  };
}
