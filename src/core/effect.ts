import { ReactiveEffect } from "../types";

// Active effects stack.
export const activeEffects: ReactiveEffect[] = [];

// Effects scheduled for execution.
const pendingEffects: Set<ReactiveEffect> = new Set();

let isFlushing = false;
let isBatching = false;

/**
 * Schedule an effect to run in a microtask.
 */
export function scheduleEffect(fn: ReactiveEffect): void {
  if (fn.disposed) return;
  pendingEffects.add(fn);
  if (!isBatching && !isFlushing) {
    isFlushing = true;
    Promise.resolve().then(flushEffects);
  }
}

/**
 * Flush all scheduled effects.
 */
export function flushEffects(): void {
  for (const fn of pendingEffects) {
    pendingEffects.delete(fn);
    if (!fn.disposed) {
      fn();
    }
  }
  isFlushing = false;
}

/**
 * Batch multiple updates so that effects run only once after the batch completes.
 */
export function batch(fn: () => void): void {
  isBatching = true;
  try {
    fn();
  } finally {
    isBatching = false;
    flushEffects();
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
  return () => {
    fn.disposed = true;
  };
}
