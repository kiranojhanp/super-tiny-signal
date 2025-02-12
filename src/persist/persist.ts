import { GetState, PersistenceOptions, SetState } from "../types";

/**
 * Persistence middleware that wraps an initializer.
 *
 * @template T - The shape of the store state.
 * @param initializer - The original initializer.
 * @param options - Persistence options.
 * @returns A wrapped initializer preserving the store's type.
 */
export function persist<T>(
  initializer: (set: SetState<T>, get: GetState<T>) => T,
  options: PersistenceOptions
) {
  return (set: SetState<T>, get: GetState<T>): T => {
    const { name, storage } = options;

    // Attempt to load persisted state asynchronously.
    storage
      .getItem(name)
      .then((storedValue) => {
        if (storedValue) {
          try {
            set(JSON.parse(storedValue));
          } catch (e) {
            console.error("Failed to parse stored state", e);
          }
        }
      })
      .catch((err) => console.error("Failed to load persisted state", err));

    // Wrap the set function so that every update is also saved.
    const persistentSet: SetState<T> = (partial) => {
      set(partial);
      storage
        .setItem(name, JSON.stringify(get()))
        .catch((err) => console.error("Failed to save persisted state", err));
    };

    return initializer(persistentSet, get);
  };
}
