import type { StorageAdapter } from "../types";

/**
 * Creates an IndexedDB-based storage adapter.
 *
 * This function returns a StorageAdapter that works asynchronously with IndexedDB.
 * Unlike localStorage, IndexedDB can store structured data directly, so values
 * are stored as-is (typically strings from JSON.stringify in persist middleware).
 *
 * @param dbName The name of the IndexedDB database.
 * @param storeName The name of the object store within the database.
 * @param version The database version (defaults to 1). Increment when schema changes.
 * @returns A StorageAdapter for use with the persist middleware.
 */
export function createIndexedDBStorage(
  dbName: string,
  storeName: string,
  version = 1
): StorageAdapter {
  return {
    async getItem(key: string): Promise<any | null> {
      const db = await openDB(dbName, storeName, version);
      return await new Promise<any | null>((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.get(key);
        request.onsuccess = () => {
          // Return the raw value (not toString) - persist middleware expects JSON strings
          resolve(request.result ?? null);
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    },
    async setItem(key: string, value: any): Promise<void> {
      const db = await openDB(dbName, storeName, version);
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
 * Helper to open (or create) an IndexedDB database with the specified dbName, storeName, and version.
 */
function openDB(
  dbName: string,
  storeName: string,
  version: number
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Create object store if it doesn't exist
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
