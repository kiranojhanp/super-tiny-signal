import { Signal } from "../core/signal";

// ──────────────────────────────────────────────────────────────
// Type Definitions & Interfaces
// ──────────────────────────────────────────────────────────────

export type EqualsFn<T> = (a: T, b: T) => boolean;

export interface ReactiveEffect {
  (): void;
  disposed?: boolean;
  dependencies?: Set<Signal<any>>;
}

/**
 * An internal type for our effect runner that includes dependency tracking.
 */
export type EffectRunner = ReactiveEffect & {
  dependencies: Set<Signal<any>>;
};

/**
 * A function type to update the state.
 */
export type SetState<T> = (
  partial: Partial<T> | ((prevState: T) => Partial<T>)
) => void;

export type GetState<T> = () => T;

/**
 * The store type
 */
export type Store<T> = T & {
  getState: () => T;
  subscribe: (listener: (state: T) => void) => () => void;
};

export interface CreateStoreConfig<T> {
  /**
   * When true, performs a deep equality check on signal values.
   * Defaults to false for performance reasons.
   */
  deepEquality?: boolean;
  /**
   * An optional error handler for subscriber errors.
   */
  onSubscriberError?: (error: any, subscriber: (state: T) => void) => void;
}

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
