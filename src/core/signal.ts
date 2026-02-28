import { ReactiveEffect, EqualsFn, Getter, Setter, SignalTuple } from "../types";
import { defaultEquals } from "../utils/equality.js";
import { activeEffects, scheduleEffect } from "./effect.js";

/***
 * ====================================================
 * Signals : holds a value and tracks dependent effects.
 * ====================================================
 */
export class Signal<T> {
  protected _value: T;
  protected _effects: Set<ReactiveEffect> = new Set();
  protected equals: EqualsFn<T>;

  constructor(initialValue: T, equals: EqualsFn<T> = defaultEquals) {
    this._value = initialValue;
    this.equals = equals;
  }

  /**
   * Reading the value registers the current active effect (if any).
   */
  get value(): T {
    const currentEffect = activeEffects.at(-1);
    if (currentEffect) {
      this.addEffect(currentEffect);
    }
    return this._value;
  }

  /**
   * Updating the value schedules all dependent effects.
   */
  set value(newValue: T) {
    if (!this.equals(this._value, newValue)) {
      this._value = newValue;
      // Create a copy to safely iterate, cleaning up disposed effects along the way.
      const effectsToRun = Array.from(this._effects);
      for (const effect of effectsToRun) {
        if (effect.disposed) {
          this.removeEffect(effect);
        } else {
          // Check if effect is marked as synchronous-only (for computed signals)
          const isSyncOnly = (effect as unknown as {sync?: boolean}).sync;
          if (isSyncOnly) {
            // Call synchronously only, don't schedule
            try {
              effect();
            } catch (error) {
              console.error("Error in synchronous effect:", error);
            }
          } else {
            // Normal effects are scheduled asynchronously
            scheduleEffect(effect);
          }
        }
      }
    }
  }

  /**
   * Returns the value without registering any reactive dependency.
   */
  peek(): T {
    return this._value;
  }

  /**
   * Implicit conversion for string contexts.
   */
  toString(): string {
    return String(this.value);
  }

  /**
   * Adds an effect to this signal and tracks the dependency.
   */
  public addEffect(effect: ReactiveEffect): void {
    this._effects.add(effect);
    // Ensure the effect has a dependency set.
    if (!effect.dependencies) {
      effect.dependencies = new Set();
    }
    effect.dependencies.add(this as Signal<unknown>);
  }

  /**
   * Removes an effect from this signal and cleans up the dependency.
   */
  public removeEffect(effect: ReactiveEffect): void {
    this._effects.delete(effect);
    effect.dependencies?.delete(this as Signal<unknown>);
  }
}

/**
 * Helper to create a new signal.
 */
export function signal<T>(
  initialValue: T,
  options?: { equals?: EqualsFn<T> }
): SignalTuple<T> {
  const equals = options?.equals ?? defaultEquals;
  const state = new Signal(initialValue, equals);

  const get: Getter<T> = () => state.value;
  const set: Setter<T> = (next) => {
    state.value = typeof next === "function"
      ? (next as (prev: T) => T)(state.value)
      : next;
  };

  return [get, set];
}
