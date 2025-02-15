import { activeEffects, scheduleEffect } from "./effect";
import { Signal } from "./signal";

import type { EqualsFn } from "../types";
import { defaultEquals } from "../utils/equality";

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

  // Create a stable callback so that dependencies always subscribe to the same function.
  private markDirty = () => {
    if (!this.dirty) {
      this.dirty = true;
      if (this.eager && !this.isComputing) {
        this.recompute();
      }
      // Schedule any effects that depend on this computed.
      for (const eff of this._effects) {
        scheduleEffect(eff);
      }
    }
  };

  constructor(
    computeFn: () => T,
    options?: { eager?: boolean; equals?: EqualsFn<T> }
  ) {
    const equals = options?.equals ?? defaultEquals;

    // We start with a dummy value; it will be computed on first access.
    super(undefined as unknown as T, equals);
    this.computeFn = computeFn;

    this.eager = options?.eager ?? false;
    if (this.eager) {
      this.recompute();
    }
  }

  /**
   * Recompute the computed value.
   * During computation, this.markDirty is pushed onto the activeEffects stack
   * so that any signal read during the computation will subscribe to it.
   */
  private recompute(): void {
    if (this.isComputing) return;
    this.isComputing = true;
    activeEffects.push(this.markDirty);

    try {
      const newValue = this.computeFn();
      if (this.dirty || !this.equals(this._value, newValue)) {
        this._value = newValue;
      }
      this.dirty = false;
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

/**
 * Helper to create a new computed signal.
 */
export function computed<T>(
  computeFn: () => T,
  options?: { eager?: boolean; equals?: EqualsFn<T> }
): Computed<T> {
  return new Computed(computeFn, options);
}
