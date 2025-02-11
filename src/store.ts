import { signal } from "./core";
import { SetState, Store } from "./types";

/**
 * The `create` function returns a function that accepts an initializer
 * (optionally wrapped by middleware) and produces a getter function for the store.
 *
 * Usage:
 *
 * import { create } from 'my-package'
 * import { persist, createJSONStorage } from 'my-package/middleware'
 *
 * export const useBearStore = create()(
 *   persist(
 *     (set, get) => ({
 *       bears: 0,
 *       addABear: () => set({ bears: get().bears + 1 }),
 *     }),
 *     {
 *       name: 'food-storage', // Unique key for the persisted state
 *       storage: createJSONStorage(() => sessionStorage), // By default localStorage is used
 *     },
 *   ),
 * )
 *
 * Then elsewhere:
 *
 * const { bears, addABear } = useBearStore();
 * console.log(bears.value);
 * addABear();
 */
export function create<T extends Record<string, any>>() {
  return (
    initializer: (set: SetState<T>, get: () => T) => T
  ): (() => Store<T>) => {
    let store: Store<T>;

    // Returns the plain state by unwrapping signals.
    const getState = (): T => {
      const state = {} as T;
      for (const key in store) {
        const property = store[key];
        // If the property is a Signal, use its value.
        if (property && typeof property === "object" && "value" in property) {
          state[key] = property.value;
        } else {
          state[key] = property as any;
        }
      }
      return state;
    };

    // The set function updates the store.
    const set: SetState<T> = (partialUpdate) => {
      const currentState = getState();
      const update =
        typeof partialUpdate === "function"
          ? partialUpdate(currentState)
          : partialUpdate;
      for (const key in update) {
        if (Object.prototype.hasOwnProperty.call(store, key)) {
          const newValue = update[key];
          const property = store[key];
          if (property && typeof property === "object" && "value" in property) {
            property.value = newValue;
          } else {
            store[key] = newValue as any;
          }
        }
      }
    };

    // Initialize the state.
    const initialState = initializer(set, () => getState());
    // Wrap non-function values in signals.
    store = Object.fromEntries(
      Object.entries(initialState).map(([key, value]) => [
        key,
        typeof value === "function" ? value : signal(value),
      ])
    ) as Store<T>;

    // Return a getter function for the store.
    return () => store;
  };
}
