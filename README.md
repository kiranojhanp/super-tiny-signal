![prapti](assets/banner.png)

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
import { signal, derived, effect } from "super-tiny-signal";

const [count, setCount] = signal(1);
const doubled = derived(() => count() * 2);

const stop = effect(() => {
  console.log(`count=${count()} doubled=${doubled()}`);
});

setCount(2);
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
import { signal, derived, effect, batch } from "super-tiny-signal";

const [a, setA] = signal(1);
const [b, setB] = signal(2);
const sum = derived(() => a() + b());

const dispose = effect(() => {
  console.log("sum", sum());
});

batch(() => {
  setA(10);
  setB(20);
});

dispose();
```

### Hook-style helpers (Framework Agnostic)

```ts
import { useState, useMemo, useEffect } from "super-tiny-signal";

const [count, setCount] = useState(0);
const doubled = useMemo(() => count() * 2);

const stop = useEffect(() => {
  console.log("doubled", doubled());
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
console.log(store.getState().theme);
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
  derived,
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
