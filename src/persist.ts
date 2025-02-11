import {
  GetState,
  PersistenceOptions,
  SetState,
  StorageAdapter,
} from "./types";

/**
 * The persist middleware wraps an initializer to add persistence.
 *
 * It attempts to load any persisted state and wraps the set function so that
 * every state update is saved to the storage.
 */
export function persist<T extends Record<string, any>>(
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

/**
 * createJSONStorage wraps an underlying storage (which can be synchronous
 * like localStorage or asynchronous like an IndexedDB adapter) and returns a StorageAdapter.
 *
 * The provided storageFactory should return an object that implements getItem and setItem.
 * createJSONStorage will always JSON‑parse the result of getItem and JSON‑stringify
 * values in setItem.
 */
export function createJSONStorage(
  storageFactory: () => Storage
): StorageAdapter {
  return {
    getItem(key: string) {
      const item = storageFactory().getItem(key);
      return Promise.resolve(item ? JSON.parse(item) : null);
    },
    setItem(key: string, value: any) {
      storageFactory().setItem(key, JSON.stringify(value));
      return Promise.resolve();
    },
  };
}

/**
 * Creates an IndexedDB-based storage object.
 *
 * This function returns an object with getItem and setItem methods,
 * which work asynchronously. (They return Promises.)
 *
 * @param dbName The name of the IndexedDB database.
 * @param storeName The name of the object store.
 */
export function createIndexedDBStorage(dbName: string, storeName: string) {
  return {
    async getItem(key: string): Promise<string | null> {
      const db = await openDB(dbName, storeName);
      return await new Promise<string | null>((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.get(key);
        request.onsuccess = () => {
          // Return the stored value as a string (or null if not found)
          resolve(request.result ? request.result.toString() : null);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    },
    async setItem(key: string, value: string): Promise<void> {
      const db = await openDB(dbName, storeName);
      return await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(storeName, "readwrite");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.put(value, key);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    },
  };
}

/**
 * Helper to open (or create) an IndexedDB database with the specified dbName and storeName.
 */
function openDB(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}
