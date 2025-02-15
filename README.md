# Super Tiny Signal

**Super Tiny Signal** is a minimal and lightweight reactive state management library for modern JavaScript applications. It provides a simple yet effective way to manage application state using signals and stores.

[![npm version](https://badge.fury.io/js/super-tiny-signal.svg)](https://www.npmjs.com/package/super-tiny-signal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Introduction

Super Tiny Signal is a reactive state management library designed for simplicity and performance. It offers core primitives for reactivity – Signals, Computed Signals, Effects, and Stores – to manage state in JavaScript applications with minimal overhead.

**Key Features:**

- **Minimal and Lightweight:** Small size, focused on core reactivity.
- **Signal-Based Reactivity:** Utilizes Signals for fine-grained dependency tracking.
- **Efficient Updates:** Optimized updates, triggering only necessary effects.
- **Persistence Support:** Built-in middleware for state persistence using storage adapters.
- **Simple API:** Easy-to-learn and use API for quick integration.
- **Modern JavaScript:** Built with modern JavaScript standards.
- **TypeScript Support:** Provides strong typing and improved development experience.

## Installation

Install using npm, bun or yarn:

```bash
npm install super-tiny-signal
```

```bash
bun add super-tiny-signal
```

```bash
yarn add super-tiny-signal
```

## Core Concepts

### Signals

Signals hold values and notify dependent effects on value changes.

```javascript
import { signal } from "super-tiny-signal";
const count = signal(0);
console.log(count.value); // Output: 0
count.value = 1;
```

### Computed Signals

Computed signals derive values from computations based on other signals, updating automatically.

```javascript
import { signal, computed } from "super-tiny-signal";
const price = signal(10);
const quantity = signal(2);
const total = computed(() => price.value * quantity.value);
console.log(total.value); // Output: 20
quantity.value = 3; // total updates
```

### Effects

Effects perform side effects in response to signal changes, automatically tracking dependencies.

```javascript
import { signal, effect } from "super-tiny-signal";
const name = signal("World");
effect(() => {
  console.log(`Hello, ${name.value}!`);
});
name.value = "Universe"; // Effect re-runs
```

### Stores

Stores structure complex application state, built on signals with APIs for state management and subscriptions.

```javascript
import { createStore } from "super-tiny-signal";
interface CounterStore {
  count: number;
  increment: () => void;
}
const counterStore =
  createStore <
  CounterStore >
  ((set, get) => ({
    count: 0,
    increment: () => set({ count: get().count + 1 }),
  }));
console.log(counterStore.getState().count); // Output: 0
counterStore.increment();
```

### Persistence

Persistence middleware enables automatic saving and loading of store state using storage adapters.

**Key Persistence Features:**

- Automatic state saving on updates.
- State loading on application initialization.
- Pluggable storage adapters (localStorage, IndexedDB included).
- Simple integration via `persist` middleware.

**Example: localStorage Persistence**

```javascript
import { createStore, persist, createJSONStorage } from "super-tiny-signal";
interface CounterStore {
  count: number;
  increment: () => void;
}
const counterStore =
  createStore <
  CounterStore >
  persist(
    (set, get) => ({
      /* ... initializer ... */
    }),
    { name: "counter-store", storage: createJSONStorage(() => localStorage) }
  );
```

**Example: IndexedDB Persistence**

```javascript
import {
  createStore,
  persist,
  createIndexedDBStorage,
} from "super-tiny-signal";
// ... interface CounterStore ...
const counterStore =
  createStore <
  CounterStore >
  persist(
    (set, get) => ({
      /* ... initializer ... */
    }),
    {
      name: "counter-store-indexeddb",
      storage: createIndexedDBStorage("myDatabase", "counterStore"),
    }
  );
```

## API Reference

### `signal<T>(initialValue: T, options?: { equals?: EqualsFn<T> }): Signal<T>`

Creates a signal.

### `computed<T>(computeFn: () => T, options?: { eager?: boolean; equals?: EqualsFn<T> }): Computed<T>`

Creates a computed signal.

### `effect(fn: () => void): () => void`

Registers a reactive effect. Returns a disposal function.

### `createStore<T extends Record<string, any>>(initializer: (set: SetState<T>, get: () => T) => T, config?: CreateStoreConfig<T>): Store<T>`

Creates a reactive store.

### `persist<T>(initializer: (set: SetState<T>, get: GetState<T>) => T, options: PersistenceOptions): (set: SetState<T>, get: GetState<T>) => T`

Persistence middleware.

### `createJSONStorage(storageFactory: () => Storage): StorageAdapter`

Creates a JSON-based `StorageAdapter`.

### `createIndexedDBStorage(dbName: string, storeName: string): StorageAdapter`

Creates an IndexedDB `StorageAdapter`.

### `Signal<T>` Class

- `.value`: Get/set signal value (tracks dependencies in effects).
- `.peek()`: Get value without dependency tracking.
- `.toString()`: Implicit string conversion.

### `Computed<T> extends Signal<T>` Class

- Extends `Signal<T>`.
- `.value`: (Read-only) Get computed value (triggers re-computation).
- `.peek()`: Get computed value without dependency tracking.

### `StorageAdapter` Interface

```typescript
interface StorageAdapter {
  getItem(key: string): Promise<any | null>;
  setItem(key: string, value: any): Promise<void>;
}
```

### `PersistenceOptions` Interface

```typescript
interface PersistenceOptions {
  name: string;
  storage: StorageAdapter;
}
```

## Contributing

Contributions are welcome. For suggestions, bug reports, or code contributions, please open an issue or pull request.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Further Development

- More documentation and examples.
- Unit and integration tests.
- Performance optimizations.
- Middleware/plugin extensions.
- Additional storage adapters.

---

Thank you for using Super Tiny Signal.
