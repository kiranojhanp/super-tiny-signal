# SuperTinySignal

Tiny, framework-agnostic reactivity for TypeScript apps.

If you want signal-style state without pulling in a full UI framework, this is for you.

[![npm version](https://img.shields.io/npm/v/super-tiny-signal.svg)](https://www.npmjs.com/package/super-tiny-signal) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Installation

```bash
npm install super-tiny-signal
```

---

## Quick start

```ts
import { signal, computed, effect } from "super-tiny-signal";

const count = signal(1);
const doubled = computed(() => count.value * 2);

const stop = effect(() => {
  console.log(`count=${count.value} doubled=${doubled.value}`);
});

count.value = 2;
stop();
```

---

## Why SuperTinySignal

- Predictable updates: computed values invalidate immediately on writes.
- Small API: learn the core in minutes and use only what you need.
- TypeScript-first: strong inference for signals, stores, and helpers.
- Framework-agnostic: works with plain HTML, custom renderers, or any framework.
- Practical extras: store helpers, persistence middleware, and storage adapters.

---

## Core API

### Reactivity primitives

```ts
import { signal, computed, effect, batch } from "super-tiny-signal";

const a = signal(1);
const b = signal(2);
const sum = computed(() => a.value + b.value);

const dispose = effect(() => {
  console.log("sum", sum.value);
});

batch(() => {
  a.value = 10;
  b.value = 20;
});

dispose();
```

### Hook-style helpers (Framework Agnostic)

```ts
import { useState, useMemo, useEffect } from "super-tiny-signal";

const [count, setCount] = useState(0);
const doubled = useMemo(() => count.value * 2);

const stop = useEffect(() => {
  console.log("doubled", doubled.value);
});

setCount((prev) => prev + 1);
stop();
```

### Store + persistence

```ts
import { createStore, persist, createJSONStorage } from "super-tiny-signal";

const storage = createJSONStorage(() => localStorage);

const store = createStore(
  persist(
    () => ({
      count: 0,
      theme: "light",
    }),
    { name: "counter", storage, version: 1 },
  ),
);

store.setState({ theme: "dark" });
console.log(store.theme.value);
```

---

## Documentation

- [Architecture overview](docs/README.md)
- [Reactivity internals](docs/reactivity.md)
- [Store and persistence](docs/store-and-persistence.md)

---

## Full exports

```ts
import {
  signal,
  computed,
  effect,
  batch,
  createStore,
  persist,
  createJSONStorage,
  createIndexedDBStorage,
  useState,
  useMemo,
  useEffect,
  deepEqual,
} from "super-tiny-signal";
```

---

## Development

```bash
npm run build
bun test
```

---

## License

[MIT](LICENSE)
