// ──────────────────────────────────────────────────────────────
// Type Definitions & Interfaces
// ──────────────────────────────────────────────────────────────

import { Signal } from "../core/signal";

export interface ReactiveEffect {
  (): void;
  disposed?: boolean;
}

/** The three kinds of dynamic bindings supported. */
export type BindingType = "text" | "attr" | "event";

/**
 * A function type to update the state.
 */
export type SetState<T> = (
  partial: Partial<T> | ((prevState: T) => Partial<T>)
) => void;

export type GetState<T> = () => T;

/**
 * The store type. Non-function values are wrapped in Signals.
 */
export type Store<T> = {
  [K in keyof T]: T[K] extends Function ? T[K] : Signal<T[K]>;
};

/**
 * An interface that every persistence adapter must implement.
 * Both methods return Promises so that all adapters behave uniformly,
 * even if the underlying storage is synchronous.
 */
export type StorageAdapter = {
  getItem(key: string): Promise<any | null>;
  setItem(key: string, value: any): Promise<void>;
};

/**
 * Persistence options required by the persist middleware.
 */
export interface PersistenceOptions {
  name: string; // Unique key under which the state is stored
  storage: StorageAdapter;
}

/**
 * Configuration for IndexedDBAdapter.
 */
export interface IndexedDBConfig {
  dbName: string;
  storeName: string;
}
