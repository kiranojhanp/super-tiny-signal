import { StorageAdapter } from "../types/index.js";

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
