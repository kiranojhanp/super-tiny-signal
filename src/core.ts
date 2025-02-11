export interface ReactiveEffect {
  (): void;
  disposed?: boolean;
}

// Active effects stack.
const activeEffects: ReactiveEffect[] = [];

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
 * Signal holds a value and tracks dependent effects.
 */
export class Signal<T> {
  #value: T;
  #effects: Set<ReactiveEffect> = new Set();

  constructor(initialValue: T) {
    this.#value = initialValue;
  }

  /**
   * Reading the value registers the current active effect (if any).
   */
  get value(): T {
    const currentEffect = activeEffects[activeEffects.length - 1];
    if (currentEffect) {
      this.#effects.add(currentEffect);
    }
    return this.#value;
  }

  /**
   * Updating the value schedules all dependent effects.
   */
  set value(newValue: T) {
    if (this.#value !== newValue) {
      this.#value = newValue;
      for (const fn of this.#effects) {
        if (fn.disposed) {
          this.#effects.delete(fn);
        } else {
          scheduleEffect(fn);
        }
      }
    }
  }

  /**
   * Returns the value without registering any reactive dependency.
   */
  peek(): T {
    return this.#value;
  }

  /**
   * Implicit conversion for string contexts.
   */
  toString(): string {
    return String(this.value);
  }
}

/**
 * Helper to create a new signal.
 */
export function signal<T>(initialValue: T): Signal<T> {
  return new Signal(initialValue);
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
