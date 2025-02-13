import { ReactiveEffect } from "../types";

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
 * Registers a reactive effect.
 */
export function effect(fn: ReactiveEffect): () => void {
  fn.disposed = false;
  activeEffects.push(fn);
  try {
    fn();
  } finally {
    activeEffects.pop();
  }
  // Disposal: marks the effect as disposed.
  // (For immediate cleanup from signals, consider storing dependencies on the effect so they can be removed.)
  return () => {
    fn.disposed = true;
  };
}
