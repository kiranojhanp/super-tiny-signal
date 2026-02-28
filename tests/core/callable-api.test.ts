import { describe, expect, test } from "bun:test";

import { signal } from "../../src/core/signal.js";
import { computed } from "../../src/core/computed.js";
import { batch, effect, flushEffects } from "../../src/core/effect.js";

describe("tuple signal api", () => {
  test("reads and writes with getter/setter", () => {
    const [count, setCount] = signal(0);

    expect(count()).toBe(0);
    setCount(2);
    expect(count()).toBe(2);
    setCount((prev) => prev + 3);
    expect(count()).toBe(5);
  });

  test("tracks getter reads in effects", async () => {
    const [count, setCount] = signal(1);
    let seen = 0;

    effect(() => {
      seen = count();
    });

    expect(seen).toBe(1);
    setCount(9);
    await flushEffects();
    expect(seen).toBe(9);
  });

  test("supports computed reads", async () => {
    const [count, setCount] = signal(2);
    const doubled = computed(() => count() * 2);

    expect(doubled.value).toBe(4);
    setCount(10);
    await flushEffects();
    expect(doubled.value).toBe(20);
    expect(doubled.value).toBe(20);
  });

  test("dedupes effect runs in batch", async () => {
    const [count, setCount] = signal(0);
    let runs = 0;

    effect(() => {
      count();
      runs++;
    });

    batch(() => {
      setCount(1);
      setCount(2);
      setCount((prev) => prev + 1);
    });

    await flushEffects();
    expect(runs).toBe(2);
    expect(count()).toBe(3);
  });
});
