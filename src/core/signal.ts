import { ReactiveEffect } from "../types";
import { activeEffects, scheduleEffect } from "./effect.js";

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
