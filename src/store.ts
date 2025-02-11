import { signal, Signal } from "./core";

/**
 * A function used to update the store's state.
 *
 * Accepts either:
 * - A partial state update object, or
 * - A function that receives the current state and returns a partial update.
 */
export type SetState<T> = (
  partial: Partial<T> | ((prevState: T) => Partial<T>)
) => void;

/**
 * The Store type maps each property of T as follows:
 *
 * - If the property is a function, it remains unchanged (an action).
 * - Otherwise, it is wrapped in a reactive Signal.
 *
 * We constrain T to objects with string keys.
 */
export type Store<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends Function ? T[K] : Signal<T[K]>;
};

/**
 * Creates a store using reactive signals as the underlying primitive.
 *
 * The initializer function receives two parameters:
 * - **set:** A function to update the state.
 * - **get:** A function to retrieve the current plain state (with signals unwrapped).
 *
 * Non-function properties returned from the initializer are automatically wrapped in signals.
 *
 * @example
 * import { create } from 'my-library';
 *
 * const useStore = create((set, get) => ({
 *   count: 1,
 *   inc: () => set((state) => ({ count: state.count + 1 })),
 * }));
 *
 * const { count, inc } = useStore();
 * // In your HTML binding (using your reactive html helper):
 * // <button onclick=${inc}>Clicked ${count} times</button>
 *
 * @param initializer - A function that returns the initial state.
 * @returns A hook-like function that returns the store.
 */
export function createStore<T extends Record<string, any>>(
  initializer: (set: SetState<T>, get: () => T) => T
): () => Store<T> {
  let store: Store<T>;

  /**
   * Retrieves the plain state from the store.
   *
   * This function iterates over each property of the store. If a property is a Signal
   * (i.e. has a "value" property), it extracts its current value; otherwise, it returns the property as-is.
   *
   * @returns The current state as a plain object.
   */
  const getState = (): T => {
    const state = {} as T;
    for (const key in store) {
      const property = store[key];
      // If the property is a Signal, unwrap its value.
      if (property && typeof property === "object" && "value" in property) {
        state[key] = property.value;
      } else {
        state[key] = property as any;
      }
    }
    return state;
  };

  /**
   * The set function provided to the initializer.
   *
   * When called, it computes a partial update (either directly or via an updater function)
   * and then updates each corresponding property in the store.
   *
   * @param partialUpdate - The partial state update.
   */
  const set: SetState<T> = (
    partialUpdate: Partial<T> | ((prevState: T) => Partial<T>)
  ) => {
    const currentState = getState();
    const update =
      typeof partialUpdate === "function"
        ? partialUpdate(currentState)
        : partialUpdate;

    for (const key in update) {
      if (Object.prototype.hasOwnProperty.call(store, key)) {
        const newValue = update[key];
        const property = store[key];
        // If the property is a Signal, update its value (which triggers reactivity).
        if (property && typeof property === "object" && "value" in property) {
          property.value = newValue;
        } else {
          // Fallback: update directly (rare case).
          store[key] = newValue as any;
        }
      }
    }
  };

  // Obtain the initial state from the initializer.
  const initialState = initializer(set, () => getState());

  // Build the final store: wrap every non-function property in a Signal.
  // Functions (actions) remain unchanged.
  const builtStore = Object.fromEntries(
    Object.entries(initialState).map(([key, value]) => [
      key,
      typeof value === "function" ? value : signal(value),
    ])
  ) as Store<T>;

  store = builtStore;
  return () => store;
}

/**
 * Export an alias "store" so that consumers can import:
 *
 *   import { store } from 'my-library';
 */
export const store = createStore;
