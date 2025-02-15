import type { EffectRunner, ReactiveEffect } from "../types";

// Active effects stack.
export const activeEffects: ReactiveEffect[] = [];

// Effects scheduled for execution.
const pendingEffects: Set<ReactiveEffect> = new Set();

let isFlushing = false;
let batchDepth = 0;

/**
 * Schedule an effect to run in a microtask.
 */
export function scheduleEffect(fn: ReactiveEffect): void {
  if (fn.disposed) return;
  pendingEffects.add(fn);
  if (batchDepth === 0 && !isFlushing) {
    isFlushing = true;
    Promise.resolve().then(flushEffects);
  }
}

/**
 * Flush all scheduled effects.
 */
export function flushEffects(): void {
  try {
    while (pendingEffects.size > 0) {
      // Copy pending effects to process them without issues from modifications.
      const effects = Array.from(pendingEffects);
      pendingEffects.clear();
      for (const effect of effects) {
        if (effect.disposed) continue;
        try {
          effect();
        } catch (error) {
          console.error("Error running effect:", error);
        }
      }
    }
  } finally {
    isFlushing = false;
  }
}

/**
 * Batch multiple updates so that effects run only once after the batch completes.
 */
export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) flushEffects();
  }
}

/**
 * Registers a reactive effect with dependency tracking and cleanup.
 *
 * The effect is immediately run once to establish its dependencies.
 * It returns a disposal function that, when called, will prevent further runs
 * and remove the effect from all signals it depends on.
 */
export function effect(fn: () => void): () => void {
  const runner: EffectRunner = function effectRunner() {
    // Cleanup previous dependencies.
    if (runner.dependencies) {
      for (const dep of runner.dependencies) {
        dep.removeEffect(runner);
      }
      runner.dependencies.clear();
    }
    activeEffects.push(runner);
    try {
      fn();
    } finally {
      activeEffects.pop();
    }
  } as EffectRunner;

  // Initialize runner properties for disposal and dependency tracking.
  runner.disposed = false;
  runner.dependencies = new Set();

  // Run the effect immediately to capture initial dependencies.
  runner();

  // Return a function to dispose of the effect.
  return () => {
    runner.disposed = true;
    if (runner.dependencies) {
      for (const dep of runner.dependencies) {
        dep.removeEffect(runner);
      }
    }
  };
}
