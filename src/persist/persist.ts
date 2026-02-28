import { GetState, PersistenceOptions, SetState } from "../types";

/**
 * Persistence middleware that wraps an initializer to automatically save and load state.
 *
 * This middleware handles:
 * - Asynchronous state hydration from storage
 * - Race condition prevention (queues updates during hydration)
 * - Version support for migrations
 * - Error handling with optional callbacks
 * - Hydration completion notification
 *
 * @template T - The shape of the store state.
 * @param initializer - The original initializer function.
 * @param options - Persistence configuration options.
 * @returns A wrapped initializer that maintains the store's type.
 *
 * @example
 * const store = createStore(
 *   persist(
 *     (set, get) => ({ count: 0, increment: () => set({ count: get().count + 1 }) }),
 *     {
 *       name: 'my-store',
 *       storage: createJSONStorage(() => localStorage),
 *       version: 1,
 *       onHydrated: (state) => console.log('Loaded:', state),
 *       onError: (error, operation) => console.error(`${operation} failed:`, error)
 *     }
 *   )
 * );
 */
export function persist<T>(
  initializer: (set: SetState<T>, get: GetState<T>) => T,
  options: PersistenceOptions<T>
) {
  return (set: SetState<T>, get: GetState<T>): T => {
    const {
      name,
      storage,
      version = 1,
      onHydrated,
      onError,
    } = options;

    // Track hydration state to prevent race conditions
    let isHydrated = false;
    let pendingUpdates: Array<Partial<T> | ((state: T) => Partial<T>)> = [];

    /**
     * Helper to save state to storage with error handling
     */
    function saveToStorage(state: T): void {
      const data = { version, state };
      storage
        .setItem(name, JSON.stringify(data))
        .catch((err) => {
          if (onError) {
            onError(err instanceof Error ? err : new Error(String(err)), "save");
          } else {
            console.error(`[persist:${name}] Failed to save state:`, err);
          }
        });
    }

    // Attempt to load persisted state asynchronously
    storage
      .getItem(name)
      .then((storedValue) => {
        if (storedValue) {
          try {
            const parsed = JSON.parse(storedValue);

            // Handle both old format (direct state) and new format (with version)
            const loadedVersion = parsed.version ?? 0;
            const loadedState = parsed.state ?? parsed;

            // Version mismatch check
            if (loadedVersion !== version) {
              console.warn(
                `[persist:${name}] Version mismatch: stored=${loadedVersion}, current=${version}. Using default state.`
              );
              // Don't load old version data - use default state
            } else {
              // Apply the loaded state
              set(loadedState);
            }
          } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            if (onError) {
              onError(error, "load");
            } else {
              console.error(`[persist:${name}] Failed to parse stored state:`, error);
            }
          }
        }

        // Mark as hydrated and notify
        isHydrated = true;
        const currentState = get();
        onHydrated?.(currentState);

        // Apply any updates that occurred during hydration
        if (pendingUpdates.length > 0) {
          for (const update of pendingUpdates) {
            set(update);
          }
          pendingUpdates = [];

          // Save the state after applying pending updates
          saveToStorage(get());
        }
      })
      .catch((err) => {
        // Even on error, mark as hydrated to allow the app to continue
        isHydrated = true;
        const error = err instanceof Error ? err : new Error(String(err));
        if (onError) {
          onError(error, "load");
        } else {
          console.error(`[persist:${name}] Failed to load state:`, error);
        }

        // Apply pending updates even on load error
        if (pendingUpdates.length > 0) {
          for (const update of pendingUpdates) {
            set(update);
          }
          pendingUpdates = [];
          saveToStorage(get());
        }
      });

    /**
     * Wrapped set function that persists every state update.
     * Queues updates during hydration to prevent race conditions.
     */
    const persistentSet: SetState<T> = (partial) => {
      if (!isHydrated) {
        // Queue the update if we're still loading
        pendingUpdates.push(partial);
      } else {
        // Apply immediately if hydrated
        set(partial);
        saveToStorage(get());
      }
    };

    // Initialize the store with the persistent set function
    return initializer(persistentSet, get);
  };
}
