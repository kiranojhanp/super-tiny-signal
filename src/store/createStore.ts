import { scheduleEffect } from "../core/effect.js";
import { signal, Signal } from "../core/signal.js";
import { SetState, Store } from "../types";

/**
 * Checks if a value is a signal.
 */
function isSignal(value: any): value is Signal<any> {
  return value instanceof Signal;
}

/**
 * Creates a strongly-typed store with a Zustand-like API.
 *
 * @template T - The shape of the store state.
 * @param initializer - A function that initializes the state, receiving a setter and a getter.
 * @returns The store instance.
 *
 * @example
 * interface IStore {
 *   count: number;
 *   increment: () => void;
 *   decrement: () => void;
 * }
 *
 * const counterStore = createStore<IStore>((set, get) => ({
 *   count: 0,
 *   increment: () => set({ count: get().count + 1 }),
 *   decrement: () => set({ count: get().count - 1 }),
 * }));
 *
 * console.log(counterStore.getState()); // { count: 0 }
 * counterStore.increment();
 * console.log(counterStore.getState()); // { count: 1 }
 */
export function createStore<T extends Record<string, any>>(
  initializer: (set: SetState<T>, get: () => T) => T
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
        console.error("Error in store subscriber:", error);
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
          // Update only if the value has really changed.
          if (!Object.is(prop.value, newValue)) {
            prop.value = newValue;
          }
        } else {
          // For non-signal properties, directly assign.
          store[key] = newValue as any;
        }
      } else {
        console.warn(`Store property "${key}" does not exist.`);
      }
    }
    scheduleNotify();
  };

  // Initialize state using the initializer.
  // Non-function properties are wrapped in signals.
  const initialState = initializer(set, getState);
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
