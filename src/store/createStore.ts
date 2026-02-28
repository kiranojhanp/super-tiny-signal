import { scheduleEffect } from "../core/effect.js";
import { signal, Signal } from "../core/signal.js";
import { deepEqual } from "../utils/equality.js";

import type { CreateStoreConfig, SetState, Store } from "../types/index.js";

/**
 * Checks if a value is a signal.
 */
function isSignal(value: any): value is Signal<any> {
  return value instanceof Signal;
}

/**
 * Creates a strongly-typed store.
 *
 * @template T - The shape of the store state.
 * @param initializer - A function that initializes the state, receiving a setter and a getter.
 * @param config - Optional configuration for deep equality and error handling.
 * @returns The store instance.
 *
 * @example
 * interface IStore {
 *   count: number;
 *   increment: () => void;
 *   decrement: () => void;
 * }
 *
 * const counterStore = createStore<IStore>(
 *   (set, get) => ({
 *     count: 0,
 *     increment: () => set({ count: get().count + 1 }),
 *     decrement: () => set({ count: get().count - 1 }),
 *   }),
 *   { deepEquality: true } // Optional configuration
 * );
 *
 * console.log(counterStore.getState()); // { count: 0 }
 * counterStore.increment();
 * console.log(counterStore.getState()); // { count: 1 }
 */
export function createStore<T extends Record<string, any>>(
  initializer: (set: SetState<T>, get: () => T) => T,
  config: CreateStoreConfig<T> = {}
): Store<T> {
  let store: Store<T>;

  // Subscribers that get notified when state changes.
  const subscribers = new Set<(state: T) => void>();

  /**
   * Returns a plain state object by unwrapping signals.
   */
  const getState = (): T =>
    Object.fromEntries(
      Object.entries(store).map(([key, prop]) => [
        key,
        isSignal(prop) ? prop.value : prop,
      ])
    ) as T;

  // Batched notification handling.
  let pendingNotification = false;
  function notifySubscribers() {
    const currentState = getState();
    subscribers.forEach((listener) => {
      try {
        listener(currentState);
      } catch (error) {
        if (config.onSubscriberError) {
          config.onSubscriberError(error, listener);
        } else {
          console.error("Error in store subscriber:", error);
        }
      }
    });
  }

  function scheduleNotify() {
    if (!pendingNotification) {
      pendingNotification = true;
      scheduleEffect(() => {
        pendingNotification = false;
        notifySubscribers();
      });
    }
  }

  /**
   * Updates the state.
   *
   * Accepts either a partial state object or an updater function.
   * Only updates signal-wrapped properties. Functions and methods cannot be updated.
   */
  const set: SetState<T> = (partialUpdate) => {
    const currentState = getState();
    const update =
      typeof partialUpdate === "function"
        ? partialUpdate(currentState)
        : partialUpdate;
    for (const key in update) {
      if (Object.prototype.hasOwnProperty.call(store, key)) {
        const newValue = update[key];
        const prop = store[key];
        if (isSignal(prop)) {
          // Choose the equality check based on config.
          const equalityCheck = config.deepEquality ? deepEqual : Object.is;

          // Update only if the value has really changed.
          if (!equalityCheck(prop.value, newValue)) {
            prop.value = newValue;
          }
        } else if (typeof prop === "function") {
          // Attempting to update a function/method - this is not allowed
          throw new Error(
            `Cannot update function property "${key}". Store methods are immutable.`
          );
        } else {
          // This shouldn't happen with proper initialization, but handle it gracefully
          throw new Error(
            `Cannot update property "${key}": not a signal. This indicates a store initialization error.`
          );
        }
      } else {
        console.warn(`Store property "${key}" does not exist.`);
      }
    }
    scheduleNotify();
  };

  // Reserved property names that cannot be used in store state
  const RESERVED_PROPERTIES = new Set(['getState', 'setState', 'subscribe']);

  // Initialize state using the initializer.
  // Non-function properties are wrapped in signals.
  const initialState = initializer(set, getState);
  
  // Validate property names
  for (const key of Object.keys(initialState)) {
    if (RESERVED_PROPERTIES.has(key)) {
      throw new Error(
        `Cannot use reserved property name "${key}" in store state. ` +
        `Reserved names are: ${Array.from(RESERVED_PROPERTIES).join(', ')}`
      );
    }
  }
  
  store = Object.fromEntries(
    Object.entries(initialState).map(([key, value]) => [
      key,
      typeof value === "function" ? value : signal(value),
    ])
  ) as Store<T>;

  // Augment the store with utility methods.
  Object.assign(store, {
    getState,
    setState: set,
    subscribe: (listener: (state: T) => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  });

  // Freeze the store to prevent accidental mutations.
  Object.freeze(store);

  return store;
}
