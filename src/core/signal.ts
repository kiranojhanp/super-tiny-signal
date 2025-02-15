import { ReactiveEffect } from "../types";
import { activeEffects, scheduleEffect } from "./effect.js";

type EqualsFn<T> = (a: T, b: T) => boolean;
const defaultEquals: EqualsFn<any> = Object.is;

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
          scheduleEffect(effect);
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
    effect.dependencies.add(this);
  }

  /**
   * Removes an effect from this signal and cleans up the dependency.
   */
  public removeEffect(effect: ReactiveEffect): void {
    this._effects.delete(effect);
    effect.dependencies?.delete(this);
  }
}

/**
 * Helper to create a new signal.
 */
export function signal<T>(
  initialValue: T,
  options?: { equals?: EqualsFn<T> }
): Signal<T> {
  const equals = options?.equals ?? defaultEquals;
  return new Signal(initialValue, equals);
}
