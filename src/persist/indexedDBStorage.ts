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
