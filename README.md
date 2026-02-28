# Super Tiny Signal

[![npm version](https://badge.fury.io/js/super-tiny-signal.svg)](https://www.npmjs.com/package/super-tiny-signal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Super Tiny Signal is a small reactive state library for JavaScript and TypeScript.

It gives you the basics you usually need:

- signals for state
- computed values for derived state
- effects for side effects
- a lightweight store helper for larger state objects
- optional persistence middleware

No framework lock-in, no giant API surface.

## install

```bash
npm install super-tiny-signal
```

```bash
bun add super-tiny-signal
```

```bash
yarn add super-tiny-signal
```

## quick start

```ts
import { signal, computed, effect, batch } from "super-tiny-signal";

const count = signal(0);
const doubled = computed(() => count.value * 2);

const dispose = effect(() => {
  console.log(`count: ${count.value}, doubled: ${doubled.value}`);
});

batch(() => {
  count.value = 1;
  count.value = 2;
});

dispose();
```

`effect` runs once immediately, then reruns when tracked signals change.
`batch` groups updates so dependent effects flush once at the end.

## stores

If you want actions and subscriptions in one place, use `createStore`.

```ts
import { createStore } from "super-tiny-signal";

type CounterStore = {
  count: number;
  increment: () => void;
  decrement: () => void;
};

const counter = createStore<CounterStore>((set, get) => ({
  count: 0,
  increment: () => set({ count: get().count + 1 }),
  decrement: () => set({ count: get().count - 1 }),
}));

const unsubscribe = counter.subscribe((state) => {
  console.log("count changed:", state.count);
});

counter.increment();
console.log(counter.getState().count);

unsubscribe();
```

## persistence

Use `persist` to save and restore store state.

```ts
import { createStore, persist, createJSONStorage } from "super-tiny-signal";

type CounterStore = {
  count: number;
  increment: () => void;
};

const counter = createStore<CounterStore>(
  persist(
    (set, get) => ({
      count: 0,
      increment: () => set({ count: get().count + 1 }),
    }),
    {
      name: "counter-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

For IndexedDB, use `createIndexedDBStorage(dbName, storeName)`.

## API at a glance

- `signal<T>(initialValue, options?)` creates a writable `Signal<T>`
- `computed<T>(computeFn, options?)` creates a read-only `Computed<T>`
- `effect(fn)` registers a reactive effect and returns a dispose function
- `batch(fn)` batches signal updates before flushing effects
- `createStore<T>(initializer, config?)` builds a typed store with `getState()` and `subscribe()`
- `persist(initializer, options)` wraps a store initializer with persistence
- `createJSONStorage(storageFactory)` creates a JSON storage adapter
- `createIndexedDBStorage(dbName, storeName)` creates an IndexedDB storage adapter
- `useState(initialValue)` returns `[Signal<T>, setValue]`
- `useMemo(fn)` computes and memoizes a reactive value
- `useEffect(fn)` runs an effect with optional cleanup

## TypeScript notes

The library ships type declarations, and all core APIs are generic.
If you pass explicit store types, you get typed state, actions, and subscribers.

## contributing

Issues and pull requests are welcome.

## license

MIT. See `LICENSE`.
