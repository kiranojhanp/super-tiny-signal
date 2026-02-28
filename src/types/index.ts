import { Signal } from "../core/signal.js";

// ──────────────────────────────────────────────────────────────
// Type Definitions & Interfaces
// ──────────────────────────────────────────────────────────────

export type EqualsFn<T> = (a: T, b: T) => boolean;

/**
 * A reactive effect that can be disposed.
 */
export interface ReactiveEffect {
  (): void;
  disposed?: boolean;
  dependencies?: Set<Signal<unknown>>;
}

/**
 * An internal type for our effect runner that includes dependency tracking.
 */
export type EffectRunner = ReactiveEffect & {
  dependencies: Set<Signal<unknown>>;
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
  setState: SetState<T>;
  subscribe: (listener: (state: T) => void) => () => void;
};

export interface CreateStoreConfig<T> {
  /**
   * When true, performs a deep equality check on signal values.
   * Defaults to false for performance reasons.
   */
  deepEquality?: boolean;
  /**
   * Optional error handler for subscriber errors.
   */
  onSubscriberError?: (error: unknown, subscriber: (state: T) => void) => void;
}

export interface ComputedOptions<T> {
  eager?: boolean;
  equals?: EqualsFn<T>;
  dependencies: Set<Signal<unknown>>;
}

/**
 * Subscription callback for state changes.
 */
export type Subscriber<T> = (state: T) => void;

/**
 * Disposal function returned from effects and subscriptions.
 */
export type Dispose = () => void;

export interface StoreConfig<T> {
  onSubscriberError?: (error: unknown, subscriber: (state: T) => void) => void;
}

/**
 * An interface that every persistence adapter must implement.
 * Both methods return Promises so that all adapters behave uniformly,
 * even if the underlying storage is synchronous.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<unknown | null>;
  setItem(key: string, value: unknown): Promise<void>;
  removeItem?(key: string): Promise<void>;
}

export interface PersistenceOptions<T = unknown> {
  /** Unique key under which the state is stored */
  name: string;
  /** Storage adapter (localStorage, IndexedDB, etc.) */
  storage: StorageAdapter;
  /** Optional version number for migration support */
  version?: number;
  /** Callback invoked when hydration completes successfully */
  onHydrated?: (state: T) => void;
  /** Callback invoked when storage operations fail */
  onError?: (error: Error, operation: "load" | "save") => void;
}

/**
 * Configuration for IndexedDBAdapter.
 */
export interface IndexedDBConfig {
  dbName: string;
  storeName: string;
}
