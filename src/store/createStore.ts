import { signal } from "../core/signal.js";
import { SetState, Store } from "../types";

/**
 * Creates a strongly-typed store.
 *
 * @template T - The shape of the store state.
 * @param initializer - A function that initializes the state, receiving a setter and a getter.
 * @returns A function that returns the store.
 *
 * @example
 * const useCounterStore = createStore()((set, get) => ({
 *   count: 0,
 *   increment: () => set({ count: get().count + 1 }),
 *   decrement: () => set({ count: get().count - 1 }),
 * }));
 *
 * const { count, increment, decrement } = useCounterStore();
 */
export function createStore<T extends Record<string, any>>() {
  return (
    initializer: (set: SetState<T>, get: () => T) => T
  ): (() => Store<T>) => {
    let store: Store<T>;

    // Returns the plain state by unwrapping signals.
    const getState = (): T =>
      Object.fromEntries(
        Object.entries(store).map(([key, prop]) => [
          key,
          // If the property is a signal, return its value.
          prop && typeof prop === "object" && "value" in prop
            ? prop.value
            : prop,
        ])
      ) as T;

    // Updates the state using either a partial state object or an updater function.
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
          if (prop && typeof prop === "object" && "value" in prop) {
            prop.value = newValue;
          } else {
            store[key] = newValue as any;
          }
        }
      }
    };

    // Initialize state and wrap non-function values in signals.
    const initialState = initializer(set, getState);
    store = Object.fromEntries(
      Object.entries(initialState).map(([key, value]) => [
        key,
        typeof value === "function" ? value : signal(value),
      ])
    ) as Store<T>;

    return () => store;
  };
}
