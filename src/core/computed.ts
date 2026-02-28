import { activeEffects, scheduleEffect } from "./effect.js";
import { Signal } from "./signal.js";

import type { DependencyNode, EqualsFn, ReactiveEffect } from "../types/index.js";
import { defaultEquals } from "../utils/equality.js";

/***
 * ====================================================
 * Computed (Derived) Signal
 * ====================================================
 */

/**
 * Computed signals derive their value from a computation function.
 * They are lazy (recomputed on access if dependencies changed) and read‑only.
 */
export class Computed<T> extends Signal<T> {
  private computeFn: () => T;
  private dirty: boolean = true;
  private eager: boolean;
  private isComputing: boolean = false; // Used to avoid re-entrant recomputations.
  private sources: Set<DependencyNode> = new Set();

  // Create a stable callback as ReactiveEffect so that dependencies always subscribe to the same function.
  private markDirtyEffect: ReactiveEffect;

  constructor(
    computeFn: () => T,
    options?: { eager?: boolean; equals?: EqualsFn<T> }
  ) {
    const equals = options?.equals ?? defaultEquals;

    // We start with a dummy value; it will be computed on first access.
    super(undefined as unknown as T, equals);
    this.computeFn = computeFn;

    // Create the markDirty effect with proper ReactiveEffect structure
    // NOTE: We mark it with a special flag to indicate it should run synchronously
    this.markDirtyEffect = (() => {
      if (!this.dirty) {
        this.dirty = true;
        if (this.eager && !this.isComputing) {
          this.recompute();
        }
        // Schedule any effects that depend on this computed.
        for (const eff of this._effects) {
          if (eff !== this.markDirtyEffect) {
            // If the downstream effect is also a sync effect (another computed's markDirty),
            // call it synchronously to propagate dirty flags through the chain
            const isSyncEffect = (eff as unknown as {sync?: boolean}).sync;
            if (isSyncEffect) {
              try {
                eff();
              } catch (error) {
                console.error("Error in sync effect propagation:", error);
              }
            } else {
              // Normal effects are scheduled async
              scheduleEffect(eff);
            }
          }
        }
      }
    }) as ReactiveEffect;
    
    this.markDirtyEffect.dependencies = new Set();
    this.markDirtyEffect.disposed = false;
    (this.markDirtyEffect as unknown as {sync?: boolean}).sync = true; // Mark as synchronous-only

    this.eager = options?.eager ?? false;
    if (this.eager) {
      this.recompute();
    }
  }

  /**
   * Recompute the computed value.
   * During computation, markDirtyEffect is pushed onto the activeEffects stack
   * so that any signal read during the computation will subscribe to it.
   * 
   * This properly tracks dependencies and cleans up old ones.
   */
  private recompute(): void {
    if (this.isComputing) return;
    this.isComputing = true;

    // Clean up old dependencies before recomputing
    for (const source of this.sources) {
      source.removeEffect(this.markDirtyEffect);
    }
    this.sources.clear();
    this.markDirtyEffect.dependencies?.clear();

    // Push markDirtyEffect onto the active effects stack
    activeEffects.push(this.markDirtyEffect);

    try {
      const newValue = this.computeFn();
      const hasChanged = this.dirty || !this.equals(this._value, newValue);
      if (hasChanged) {
        this._value = newValue;
        // Notify effects that depend on this computed signal
        const effectsToRun = Array.from(this._effects);
        for (const effect of effectsToRun) {
          if (effect.disposed) {
            this.removeEffect(effect);
          } else if (effect !== this.markDirtyEffect) {
            scheduleEffect(effect);
          }
        }
      }
      this.dirty = false;

      // Track the new sources (signals that were accessed during computation)
      if (this.markDirtyEffect.dependencies) {
        for (const dep of this.markDirtyEffect.dependencies) {
          this.sources.add(dep);
        }
      }
    } finally {
      activeEffects.pop();
      this.isComputing = false;
    }
  }

  /**
   * Accessing the value will trigger a recomputation if needed.
   */
  get value(): T {
    if (this.dirty) {
      this.recompute();
    }
    const currentEffect = activeEffects[activeEffects.length - 1];
    if (currentEffect) {
      this._effects.add(currentEffect);
      if (currentEffect.dependencies) {
        currentEffect.dependencies.add(this as Signal<unknown>);
      }
    }
    return this._value;
  }

  /**
   * Computed signals are read‑only.
   */
  set value(_: T) {
    throw new Error("Cannot set value of a computed signal");
  }
}

export interface ComputedSignal<T> {
  (): T;
  readonly value: T;
  peek(): T;
  addEffect(effect: ReactiveEffect): void;
  removeEffect(effect: ReactiveEffect): void;
  toString(): string;
}

function createComputedSignal<T>(core: Computed<T>): ComputedSignal<T> {
  const callable = function computedAccessor(): T {
    return core.value;
  } as ComputedSignal<T>;

  Object.defineProperty(callable, "value", {
    get() {
      return core.value;
    },
    set() {
      throw new Error("Cannot set value of a computed signal");
    },
    enumerable: true,
    configurable: true,
  });

  callable.peek = () => core.peek();
  callable.addEffect = (effect) => core.addEffect(effect);
  callable.removeEffect = (effect) => core.removeEffect(effect);
  callable.toString = () => core.toString();

  return callable;
}

/**
 * Helper to create a new computed signal.
 */
export function computed<T>(
  computeFn: () => T,
  options?: { eager?: boolean; equals?: EqualsFn<T> }
): ComputedSignal<T> {
  return createComputedSignal(new Computed(computeFn, options));
}
