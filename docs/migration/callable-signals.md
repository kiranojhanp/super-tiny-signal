# Callable Signals Migration Guide

This release introduces callable signals as the preferred syntax.

## Why this change

- Less boilerplate in reactive code.
- Better ergonomics for vanilla DOM updates.
- Same tiny runtime and scheduling behavior.

## New preferred syntax

```ts
import { signal, computed, effect } from "super-tiny-signal";

const count = signal(0);
const doubled = computed(() => count() * 2);

effect(() => {
  console.log(count(), doubled());
});

count(1);
count((prev) => prev + 1);
```

## Before and after

```ts
// Before
const count = signal(0);
count.value = count.value + 1;
effect(() => console.log(count.value));

// After
const count = signal(0);
count((prev) => prev + 1);
effect(() => console.log(count()));
```

## Compatibility in this beta

`.value` is still supported to keep upgrades smooth:

```ts
const count = signal(0);
count.value = 2;
console.log(count.value); // 2
```

Use callable form (`count()`, `count(next)`) for all new code.

## Quick migration checklist

1. Replace reactive reads from `x.value` to `x()`.
2. Replace writes from `x.value = next` to `x(next)`.
3. Replace updater writes from `x.value = fn(x.value)` to `x(fn)`.
4. Keep `.value` only where incremental migration is needed.

## DOM-focused DX helpers

The new helpers reduce vanilla DOM wiring:

```ts
import { signal, bindText, on } from "super-tiny-signal";

const count = signal(0);
const output = document.querySelector("#count")!;
const button = document.querySelector("#inc")!;

bindText(output, () => `Count: ${count()}`);
on(button, "click", () => count((prev) => prev + 1));
```

Bindings and listeners are auto-cleaned when scoped nodes are removed.
